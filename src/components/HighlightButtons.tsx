import { useCallback, useState, useEffect } from "react";
import { useCommands, useHelpers, useRemirrorContext } from "@remirror/react";
import type { RemirrorJSON } from "remirror";
import { EntityReferenceExtension } from "remirror/extensions";
import {
	getHighlight,
	setHighlight,
	deleteHighlight,
} from "../utils/highlightMap";
import { LABEL_CONFIGS } from "../utils/constants";

// Define interface for the window object extension
declare global {
	interface Window {
		sessionManagerApi?: {
			markHighlightAsRemoved?: (id: string) => void;
		};
	}
}

type HighlightButtonsProps = {
	onSave: (json: RemirrorJSON, options?: { skipExtraction?: boolean }) => void;
};

export const HighlightButtons = ({ onSave }: HighlightButtonsProps) => {
	const { getEntityReferencesAt } = useHelpers<EntityReferenceExtension>();
	const commands = useCommands<EntityReferenceExtension>();
	const { getState, view } = useRemirrorContext();
	const [error, setError] = useState<string | null>(null);
	const [pendingRemoval, setPendingRemoval] = useState(false);
	const [isEditorReady, setIsEditorReady] = useState(false);

	// Check if editor is initialized
	useEffect(() => {
		try {
			// Try to access editor state to verify it's ready
			const state = getState();
			const schema = view?.state?.schema;
			if (state && schema && schema.marks["entity-reference"]) {
				setIsEditorReady(true);
			}
		} catch (error) {
			console.warn('Editor not fully initialized:', error);
			setIsEditorReady(false);
		}
	}, [view, getState]);

	// Safe wrapper for getEntityReferencesAt
	const safeGetEntityReferencesAt = useCallback(() => {
		try {
			if (!isEditorReady) return [];
			return getEntityReferencesAt();
		} catch (error) {
			console.warn('Error getting entity references:', error);
			return [];
		}
	}, [isEditorReady, getEntityReferencesAt]);

	// Handle highlight toggle (add or remove)
	const handleHighlight = useCallback(
		(labelId: string) => {
			try {
				// Clear any previous errors
				setError(null);

				// Don't process new requests if we're in the middle of a removal
				if (pendingRemoval) {
					return;
				}

				const state = getState();
				const { from, to } = state.selection;
				const hasSelection = from !== to;

				// Get entity references at the current cursor position/selection
				const highlightsAt = safeGetEntityReferencesAt();

				// Find highlights of the specified type
				const highlightsOfType = highlightsAt.filter((h) => {
					const highlightType = getHighlight(h.id);
					return highlightType === labelId;
				});

				// Check if there are any highlights of this type at the current position
				const active = highlightsOfType.length > 0;

				if (active) {
					// Set pending removal flag to prevent race conditions
					setPendingRemoval(true);

					// Keep track of all removed highlight IDs
					const removedHighlightIds = new Set<string>();

					// Get direct access to Remirror view for direct document manipulation
					if (!view) {
						console.error("Remirror view not available");
						setPendingRemoval(false);
						return;
					}

					// Execute removal for all matching highlights
					highlightsOfType.forEach((highlight) => {
						try {
							// Create a direct transaction to remove the entity reference mark
							const { tr } = view.state;

							// Find the mark type for entity-reference
							const schema = view.state.schema;
							// Access the mark type directly from the schema
							const entityRefType = schema.marks["entity-reference"];

							if (!entityRefType) {
								console.error("Entity reference mark type not found in schema");
								return;
							}

							// First, identify any other entity references at this position with different label types
							// that we want to preserve
							const allHighlightsAtPosition = highlightsAt.filter(
								(h) =>
									h.from === highlight.from &&
									h.to === highlight.to &&
									h.id !== highlight.id
							);

							// Apply a transaction that removes this specific entity reference mark
							view.dispatch(
								tr.removeMark(highlight.from, highlight.to, entityRefType)
							);

							// For each other label type at this position, create a new entity reference
							allHighlightsAtPosition.forEach((otherHighlight) => {
								const otherLabelType = getHighlight(otherHighlight.id);
								if (otherLabelType && otherLabelType !== labelId) {
									// Create a new entity reference with the same label type
									const newId = crypto.randomUUID();
									setHighlight(newId, otherLabelType);

									// Create and dispatch a transaction to add the new entity reference
									const addTr = view.state.tr.addMark(
										highlight.from,
										highlight.to,
										schema.marks["entity-reference"].create({
											id: newId,
											labelType: otherLabelType,
											type: otherLabelType,
										})
									);
									view.dispatch(addTr);
								}
							});

							// Delete from the highlight map
							deleteHighlight(highlight.id);
							removedHighlightIds.add(highlight.id);

							// Also notify SessionManager of removed highlights
							if (
								window.sessionManagerApi &&
								window.sessionManagerApi.markHighlightAsRemoved
							) {
								try {
									window.sessionManagerApi.markHighlightAsRemoved(highlight.id);
								} catch {
									// Ignore if implementation fails
								}
							}
						} catch (error) {
							console.error(`Error removing highlight ${highlight.id}:`, error);
						}
					});

					// Use setTimeout to ensure the view has updated
					// before checking the post-removal state
					setTimeout(() => {
						try {
							// Check if highlights were actually removed
							const postRemovalState = getState();

							// Save the updated content with skipExtraction flag
							const json = postRemovalState.doc.toJSON();
							onSave(json, { skipExtraction: true });

							// Reset the pending removal flag
							setPendingRemoval(false);
						} catch (err) {
							console.error("Error in highlight removal:", err);
							setPendingRemoval(false);
						}
					}, 50); // Small delay to ensure transaction completes
				} else if (hasSelection) {
					// ADD HIGHLIGHT: If we have a selection, add a new highlight
					const id = crypto.randomUUID();

					// Store the highlight type in our map
					setHighlight(id, labelId);

					// Add the entity reference to the document
					commands.addEntityReference(id, {
						labelType: labelId,
						type: labelId,
					});

					// Use setTimeout to ensure the command has been processed
					setTimeout(() => {
						const updatedState = getState();
						const json = updatedState.doc.toJSON();
						onSave(json);
					}, 20);
				}
			} catch (error) {
				console.error("Error toggling highlight:", error);
				setError(
					`Error: ${error instanceof Error ? error.message : String(error)}`
				);
				setPendingRemoval(false);
			}
		},
		[getState, safeGetEntityReferencesAt, commands, onSave, pendingRemoval, view]
	);

	return (
		<div className="flex flex-col gap-2 highlight-buttons-sidebar">
			{error && <div className="text-red-600 mb-2 text-sm font-medium">{error}</div>}
			{LABEL_CONFIGS.map((label) => {
				// Get entity references at the current cursor position
				const highlightsAt = safeGetEntityReferencesAt();

				// Check if any of these references match our label type
				const active = highlightsAt.some((h) => {
					return getHighlight(h.id) === label.id;
				});

				return (
					<button
						key={label.id}
						onClick={() => handleHighlight(label.id)}
						className={`
							inline-flex items-center gap-2.5 text-left transition-all group leading-tight w-fit py-1.5 px-2.5 rounded-full
							${active ? "bg-white shadow-sm" : "p-1"}
							hover:bg-white hover:shadow-sm
							${pendingRemoval ? "opacity-50 cursor-wait" : ""}
						`}
						disabled={pendingRemoval}
						title={
							active
								? `Remove ${label.name} highlight`
								: `Add ${label.name} highlight`
						}
					>
						<div
							className={`w-3 h-3 flex-shrink-0 rounded-full transition-all ${
								active ? "scale-110" : "group-hover:scale-110"
							}`}
							style={{ backgroundColor: label.color }}
						/>
						<span
							className={`font-medium 
								${active ? "text-slate-900" : "text-slate-600"} 
								group-hover:text-slate-900 transition-colors
							`}
						>
							{label.name}
						</span>
						{active && !pendingRemoval && (
							<svg
								className="w-3.5 h-3.5 inline-block stroke-slate-400"
								viewBox="0 0 24 24"
								fill="none"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M15 9l-6 6" />
								<path d="M9 9l6 6" />
							</svg>
						)}
						{active && pendingRemoval && (
							<span className="ml-1 text-xs text-slate-500">(removing...)</span>
						)}
					</button>
				);
			})}
		</div>
	);
};
