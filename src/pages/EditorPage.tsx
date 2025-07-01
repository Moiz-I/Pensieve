import { useCallback, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { RemirrorJSON } from "remirror";
import { ReactFrameworkOutput } from "@remirror/react";
import { EntityReferenceExtension } from "remirror/extensions";
import { useLiveQuery } from "dexie-react-hooks";
import Editor from "../components/Editor";
import { SessionManager } from "../utils/sessionManager";
import type { HighlightWithText } from "../services/models/types";
import type { Relationship } from "../utils/relationshipTypes";

type EditorPageProps = {
	mode: "input" | "analysis";
};

export const EditorPage = ({ mode }: EditorPageProps) => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [isAnalysing, setIsAnalysing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const editorRef = useRef<ReactFrameworkOutput<EntityReferenceExtension>>(null);
	// Track highlight removal operations
	const [pendingHighlightRemoval, setPendingHighlightRemoval] = useState(false);
	// Track multiple document change events with the same ID to detect race conditions
	const currentChangeIds = useRef(new Set<string>());

	const session = useLiveQuery(async () => {
		if (!id) return null;
		try {
			const result = await SessionManager.getSession(parseInt(id));
			if (!result) {
				// If session doesn't exist, redirect to sessions page
				navigate('/sessions');
				return null;
			}
			return result;
		} catch (error) {
			console.error('Error fetching session:', error);
			navigate('/sessions');
			return null;
		}
	}, [id, navigate]);

	const content = useLiveQuery(async () => {
		if (!id || !session) return null;
		try {
			const result = await SessionManager.getEffectiveContent(parseInt(id));
			return result;
		} catch (error) {
			console.error('Error fetching content:', error);
			return null;
		}
	}, [id, session]);

	const handleEditorChange = useCallback(
		async (json: RemirrorJSON, options?: { skipExtraction?: boolean }) => {
			if (!id) return;

			// Create a unique ID for this change event to track it
			const changeId = Math.random().toString(36).substring(2, 8);

			// Check if we're already processing a change with this ID (prevent duplicates)
			if (currentChangeIds.current.has(changeId)) {
				return;
			}

			// Mark this change as being processed
			currentChangeIds.current.add(changeId);

			// Clear the change ID after processing (or after timeout)
			const clearChangeId = () => {
				currentChangeIds.current.delete(changeId);
			};
			setTimeout(clearChangeId, 500); // Safety cleanup after 500ms

			// Set pending highlight removal based on options
			if (options?.skipExtraction) {
				setPendingHighlightRemoval(true);

				// Auto-reset after a short timeout
				setTimeout(() => {
					setPendingHighlightRemoval(false);
				}, 500);
			}

			// Check if we got an empty update that might just be a cursor movement
			const isEmpty =
				!json.content ||
				json.content.length === 0 ||
				!json.content[0].content ||
				json.content[0].content.length === 0;

			if (isEmpty) {
				clearChangeId();
				return;
			}

			try {
				if (mode === "input") {
					await SessionManager.updateInputContent(parseInt(id), json);
				} else if (mode === "analysis" && session?.analysedContent) {
					// Get current highlights and relationships
					const currentHighlights = session.analysedContent.highlights || [];
					const currentRelationships = session.analysedContent.relationships || [];

					// If we're in a highlight removal state, preserve the content as-is
					if (options?.skipExtraction || pendingHighlightRemoval) {
						await SessionManager.updateAnalysedContent(
							parseInt(id),
							json,
							[], // Empty highlight array to preserve content
							currentRelationships
						);
					} else {
						// Extract highlights from the document
						const extractedHighlights =
							await SessionManager.extractHighlightsFromContentMarks(
								json,
								currentHighlights // Pass existing highlights to preserve positions
							);

						// Create a map of existing highlights by ID for quick lookup
						const existingHighlightsMap = new Map(
							currentHighlights.map((h) => [h.id, h])
						);

						// Check if any highlights were modified
						const hasHighlightModifications = extractedHighlights.some(
							(highlight) => {
								const existing = existingHighlightsMap.get(highlight.id);
								return existing && existing.text !== highlight.text;
							}
						);

						if (hasHighlightModifications) {
							// If highlights were modified, update both content and highlights
							await SessionManager.updateAnalysedContent(
								parseInt(id),
								json,
								extractedHighlights,
								currentRelationships
							);
						} else {
							// If no highlight modifications, just update the content
							await SessionManager.updateAnalysedContent(
								parseInt(id),
								json,
								currentHighlights,
								currentRelationships
							);
						}
					}
				}
			} catch (error) {
				console.error("Error handling editor change:", error);
				setError("Error updating content. Please try again.");
			}
		},
		[id, mode, session, pendingHighlightRemoval]
	);

	if (!session || !content) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
				<span className="ml-2">Loading session...</span>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto p-8">
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-zinc-900">
					{mode === "input" ? "Write Your Ideas" : "Analyze Your Text"}
				</h1>
				<p className="text-zinc-600 mt-2">
					{mode === "input"
						? "Write down your initial thoughts and ideas about the topic."
						: "Review and analyze your text. Use the highlight buttons to mark different types of content."}
				</p>
			</div>

			<div className="remirror-theme">
				<Editor
					key={`editor-${content?.highlights?.length || 0}`}
					ref={editorRef}
					initialContent={content.content}
					showHighlightButtons={mode === "analysis"}
					renderSidebar={mode === "analysis"}
					highlights={content.highlights || []}
					relationships={content.relationships || []}
					onChangeJSON={handleEditorChange}
				/>
			</div>

			{error && (
				<div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
					{error}
				</div>
			)}
		</div>
	);
};
