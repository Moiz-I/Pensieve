import { useCallback, useMemo, useState } from "react";
import type { HighlightWithText } from "../services/models/types";
import type { Relationship } from "../utils/relationshipTypes";
import { ClaimCard } from "./ClaimCard";
import { SessionManager } from "../utils/sessionManager";

interface ClaimsViewProps {
	highlights: HighlightWithText[];
	relationships: Relationship[];
	onHighlightsChange: (highlights: HighlightWithText[]) => void;
	onRelationshipsChange: (relationships: Relationship[]) => void;
	sessionId: number;
}

export const ClaimsView = ({
	highlights,
	relationships,
	onHighlightsChange,
	onRelationshipsChange,
	sessionId,
}: ClaimsViewProps) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Process highlights to extract claims and their evidence
	const claimsData = useMemo(() => {
		// Filter highlights to get only claims
		const claims = highlights.filter((h) => h.labelType === "claim");

		// Process each claim to find related evidence
		const claimsWithEvidence = claims.map((claim) => {
			// Find relationships where this claim is the target
			const relatedRelationships = relationships.filter(
				(r) => r.targetHighlightId === claim.id
			);

			// Get the evidence highlights based on these relationships
			const evidenceIds = relatedRelationships.map((r) => r.sourceHighlightId);
			const evidence = highlights.filter(
				(h) => h.labelType === "evidence" && evidenceIds.includes(h.id)
			);

			return {
				claim,
				evidence,
			};
		});

		return claimsWithEvidence;
	}, [highlights, relationships]);

	// Handle editing a claim or evidence
	const handleEdit = useCallback(
		async (id: string, newText: string) => {
			if (!newText.trim()) return;

			try {
				// Find the highlight to edit
				const highlightIndex = highlights.findIndex((h) => h.id === id);
				if (highlightIndex === -1) {
					console.error(
						`❌ [ClaimsView] Could not find highlight with ID: ${id}`
					);
					return;
				}

				// Create updated highlight
				const originalHighlight = highlights[highlightIndex];
				const updatedHighlight = {
					...originalHighlight,
					text: newText.trim(),
				};
				// Create updated highlights array
				const updatedHighlights = [...highlights];
				updatedHighlights[highlightIndex] = updatedHighlight;

				onHighlightsChange(updatedHighlights);
			} catch (error) {
				console.error("❌ [ClaimsView] Error editing highlight:", error);
				setError("Failed to save changes. Please try again.");
			}
		},
		[highlights, onHighlightsChange]
	);

	// Handle deleting a claim or evidence
	const handleDelete = useCallback(
		async (id: string, type: "claim" | "evidence") => {
			setIsLoading(true);
			setError(null);

			try {
				// Get current content
				const sessionContent = await SessionManager.getEffectiveContent(
					sessionId
				);

				// Create updated highlights array without the deleted item
				const updatedHighlights = highlights.filter((h) => h.id !== id);

				// Update relationships
				let updatedRelationships = [...relationships];

				if (type === "claim") {
					// If deleting a claim, remove all relationships where it's the target
					updatedRelationships = relationships.filter(
						(r) => r.targetHighlightId !== id
					);
				} else {
					// If deleting evidence, remove relationships where it's the source
					updatedRelationships = relationships.filter(
						(r) => r.sourceHighlightId !== id
					);
				}

				// Update content with modified highlights
				const { createDocumentWithMarks } = await import(
					"../services/annotation/documentUtils"
				);
				const updatedContent = createDocumentWithMarks(
					sessionContent.content,
					updatedHighlights
				);

				// Update in the database
				await SessionManager.updateAnalysedContent(
					sessionId,
					updatedContent,
					updatedHighlights,
					updatedRelationships
				);

				// Notify parent components
				onHighlightsChange(updatedHighlights);
				onRelationshipsChange(updatedRelationships);
			} catch (error) {
				console.error(`Error deleting ${type}:`, error);
				setError(`Failed to delete ${type}. Please try again.`);
			} finally {
				setIsLoading(false);
			}
		},
		[
			highlights,
			relationships,
			sessionId,
			onHighlightsChange,
			onRelationshipsChange,
		]
	);

	// Handle adding evidence to a claim
	const handleAddEvidence = useCallback(
		async (claimId: string, text: string) => {
			if (!text.trim()) return;

			setIsLoading(true);
			setError(null);

			try {
				// Get current content
				const sessionContent = await SessionManager.getEffectiveContent(
					sessionId
				);

				// Create new evidence highlight
				const newEvidence: HighlightWithText = {
					id: `evidence-${Date.now()}`,
					labelType: "evidence",
					text: text.trim(),
					createdInGraphView: true, // Mark as created outside the editor
				};

				// Create relationship between the evidence and claim
				const newRelationship: Relationship = {
					sourceHighlightId: newEvidence.id,
					targetHighlightId: claimId,
				};

				// Update highlights and relationships
				const updatedHighlights = [...highlights, newEvidence];
				const updatedRelationships = [...relationships, newRelationship];

				// Update content with new highlight
				const { createDocumentWithMarks } = await import(
					"../services/annotation/documentUtils"
				);
				const updatedContent = createDocumentWithMarks(
					sessionContent.content,
					updatedHighlights
				);

				// Update in the database
				await SessionManager.updateAnalysedContent(
					sessionId,
					updatedContent,
					updatedHighlights,
					updatedRelationships
				);

				// Notify parent components
				onHighlightsChange(updatedHighlights);
				onRelationshipsChange(updatedRelationships);
			} catch (error) {
				console.error("Error adding evidence:", error);
				setError("Failed to add evidence. Please try again.");
			} finally {
				setIsLoading(false);
			}
		},
		[
			highlights,
			relationships,
			sessionId,
			onHighlightsChange,
			onRelationshipsChange,
		]
	);

	// Handle adding a new claim
	const handleAddClaim = useCallback(
		async (text: string) => {
			if (!text.trim()) return;

			setIsLoading(true);
			setError(null);

			try {
				// Get current content
				const sessionContent = await SessionManager.getEffectiveContent(
					sessionId
				);

				// Create new claim highlight
				const newClaim: HighlightWithText = {
					id: `claim-${Date.now()}`,
					labelType: "claim",
					text: text.trim(),
					createdInGraphView: true, // Mark as created outside the editor
				};

				// Update highlights
				const updatedHighlights = [...highlights, newClaim];

				// Update content with new highlight
				const { createDocumentWithMarks } = await import(
					"../services/annotation/documentUtils"
				);
				const updatedContent = createDocumentWithMarks(
					sessionContent.content,
					updatedHighlights
				);

				// Update in the database
				await SessionManager.updateAnalysedContent(
					sessionId,
					updatedContent,
					updatedHighlights,
					relationships
				);

				// Notify parent component
				onHighlightsChange(updatedHighlights);
			} catch (error) {
				console.error("Error adding claim:", error);
				setError("Failed to add claim. Please try again.");
			} finally {
				setIsLoading(false);
			}
		},
		[highlights, relationships, sessionId, onHighlightsChange]
	);

	return (
		<div>
			{error && (
				<div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb4-">
					<span className="block sm:inline">{error}</span>
					<button
						className="absolute top-0 bottom-0 right-0 px-4 py-3"
						onClick={() => setError(null)}
					>
						<span className="sr-only">Dismiss</span>
						<svg
							className="fill-current h-6 w-6 text-red-500"
							role="button"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
						>
							<title>Close</title>
							<path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
						</svg>
					</button>
				</div>
			)}

			{claimsData.length === 0 ? (
				<div className="text-center py-8 text-gray-500">
					No claims found in the current text.
				</div>
			) : (
				<div className="claims-list space-y-4 mt-6">
					{claimsData.map(({ claim, evidence }) => (
						<ClaimCard
							key={claim.id}
							claim={claim}
							evidence={evidence}
							onEdit={handleEdit}
							onDelete={handleDelete}
							onAddEvidence={handleAddEvidence}
						/>
					))}
				</div>
			)}
		</div>
	);
};
