# Claims View Feature Specification

## Overview

This document outlines the specification for implementing a new "Claims View" feature for the Lodestone critical thinking application. This view will isolate claims made in the text and display them in a structured format, along with any supporting evidence linked to each claim. The feature will allow users to focus on evaluating the quality of their claims and ensuring they have adequate supporting evidence.

## Goals

- Provide a focused view of all claims identified in the text
- Display evidence linked to each claim directly below it
- Allow users to easily identify claims that lack supporting evidence
- Enable users to consider each claim individually and assess its supporting evidence
- Maintain synchronization with the text editor and graph view
- Allow direct editing, adding, and deleting of claims and evidence

## User Experience

### New "Claims View" Tab

Add a new tab or toggle button in the analysis phase that allows users to switch between:

1. The current text view with colored highlights
2. The existing graph visualization view
3. The new claims view

### Claims View Structure

In the claims view, users will see:

- Each claim displayed as a card or panel
- Evidence linked to each claim nested beneath it
- Visual indication when a claim has no linked evidence
- Consistent styling with the rest of the application
- Action buttons for editing, adding, and deleting content

### User Interactions

In the claims view, users should be able to:

- Scroll through all claims extracted from the text
- Clearly see which claims lack supporting evidence
- Add new evidence for any claim
- Edit existing claims and evidence
- Delete claims and evidence
- All changes made in claims view should propagate to text and graph views
- Add entirely new claims to the document

## Technical Implementation

### Technology Stack

- Continue using React and TypeScript for the frontend
- Leverage existing Tailwind CSS for styling
- Utilize the existing Dexie database structure without requiring schema changes

### Data Handling

The feature will use existing data structures without requiring database schema changes:

- Use existing `highlights` array containing items with `labelType: "claim"`
- Use existing `relationships` array to find evidence connected to claims
- Filter and organize this data to present it in the claims view
- All edits will update the same data structures used by text and graph views

### Component Architecture

1. **ClaimsView Component (`src/components/ClaimsView.tsx`)**

   ```typescript
   interface ClaimsViewProps {
   	highlights: HighlightWithText[];
   	relationships: Relationship[];
   	onHighlightsChange: (highlights: HighlightWithText[]) => void;
   	onRelationshipsChange: (relationships: Relationship[]) => void;
   	sessionId: number; // To interact with SessionManager
   }
   ```

2. **ClaimCard Component (`src/components/ClaimCard.tsx`)**

   ```typescript
   interface ClaimCardProps {
   	claim: HighlightWithText;
   	evidence: HighlightWithText[];
   	onEdit: (id: string, text: string, type: "claim" | "evidence") => void;
   	onDelete: (id: string, type: "claim" | "evidence") => void;
   	onAddEvidence: (claimId: string, text: string) => void;
   }
   ```

3. **EditorPage Modifications**
   - Extend view mode toggle to include "claims" option alongside "text" and "graph"
   - Conditionally render ClaimsView component when in claims view mode
   - Pass session ID to ClaimsView to enable document manipulation

### Implementation Details

1. **Data Processing**

   ```typescript
   // In ClaimsView component
   const processClaims = useCallback(() => {
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
   ```

2. **Render Logic**

   ```typescript
   // In ClaimsView component render
   return (
   	<div className="claims-view-container">
   		<div className="flex justify-between items-center mb-4">
   			<h2 className="text-xl font-serif">Claims Analysis</h2>
   			<button
   				onClick={handleAddNewClaim}
   				className="px-3 py-1 bg-zinc-700 text-white rounded hover:bg-zinc-800 text-sm"
   			>
   				Add New Claim
   			</button>
   		</div>

   		{claimsData.length === 0 ? (
   			<div className="text-center py-8 text-gray-500">
   				No claims found in the current text.
   			</div>
   		) : (
   			<div className="claims-list space-y-4">
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
   ```

3. **CRUD Operations**

   ```typescript
   // In ClaimsView component

   // Add new evidence to a claim
   const handleAddEvidence = useCallback(
   	async (claimId: string, evidenceText: string) => {
   		if (!evidenceText.trim()) return;

   		try {
   			// Create new evidence highlight
   			const newEvidence: HighlightWithText = {
   				id: `evidence-${Date.now()}`,
   				labelType: "evidence",
   				text: evidenceText,
   			};

   			// Create relationship between evidence and claim
   			const newRelationship: Relationship = {
   				sourceHighlightId: newEvidence.id,
   				targetHighlightId: claimId,
   			};

   			// Find the claim in current highlights
   			const claimIndex = highlights.findIndex((h) => h.id === claimId);
   			if (claimIndex === -1) return;

   			// Determine where to insert the evidence in the content
   			// We'll need to get the current document content and modify it
   			const sessionContent = await SessionManager.getEffectiveContent(
   				sessionId
   			);
   			const updatedContent = insertEvidenceAfterClaim(
   				sessionContent.content,
   				highlights[claimIndex],
   				newEvidence
   			);

   			// Update content, highlights, and relationships
   			await SessionManager.updateAnalysedContent(
   				sessionId,
   				updatedContent,
   				[...highlights, newEvidence],
   				[...relationships, newRelationship]
   			);
   		} catch (error) {
   			console.error("Error adding evidence:", error);
   			// Handle error in UI
   		}
   	},
   	[highlights, relationships, sessionId]
   );

   // Edit existing claim or evidence
   const handleEdit = useCallback(
   	async (id: string, newText: string, type: "claim" | "evidence") => {
   		if (!newText.trim()) return;

   		try {
   			// Find the highlight to edit
   			const highlightIndex = highlights.findIndex((h) => h.id === id);
   			if (highlightIndex === -1) return;

   			const updatedHighlight = {
   				...highlights[highlightIndex],
   				text: newText,
   			};

   			// Create updated highlights array
   			const updatedHighlights = [...highlights];
   			updatedHighlights[highlightIndex] = updatedHighlight;

   			// Get current content and replace the text
   			const sessionContent = await SessionManager.getEffectiveContent(
   				sessionId
   			);
   			const updatedContent = replaceHighlightText(
   				sessionContent.content,
   				highlights[highlightIndex],
   				newText
   			);

   			// Update content with modified highlight
   			await SessionManager.updateAnalysedContent(
   				sessionId,
   				updatedContent,
   				updatedHighlights,
   				relationships
   			);
   		} catch (error) {
   			console.error(`Error editing ${type}:`, error);
   			// Handle error in UI
   		}
   	},
   	[highlights, relationships, sessionId]
   );

   // Delete a claim or evidence
   const handleDelete = useCallback(
   	async (id: string, type: "claim" | "evidence") => {
   		try {
   			// Create updated highlights array without the deleted item
   			const updatedHighlights = highlights.filter((h) => h.id !== id);

   			// Create updated relationships array
   			let updatedRelationships = relationships;

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

   			// Get current content and remove the highlight
   			const sessionContent = await SessionManager.getEffectiveContent(
   				sessionId
   			);
   			const deletedHighlight = highlights.find((h) => h.id === id);
   			if (!deletedHighlight) return;

   			const updatedContent = removeHighlightFromContent(
   				sessionContent.content,
   				deletedHighlight
   			);

   			// Update content without the deleted highlight
   			await SessionManager.updateAnalysedContent(
   				sessionId,
   				updatedContent,
   				updatedHighlights,
   				updatedRelationships
   			);
   		} catch (error) {
   			console.error(`Error deleting ${type}:`, error);
   			// Handle error in UI
   		}
   	},
   	[highlights, relationships, sessionId]
   );

   // Add new claim to the document
   const handleAddNewClaim = useCallback(async () => {
   	// Show modal for user to enter the claim text
   	setIsAddingClaim(true);
   }, []);

   // Submit the new claim text
   const handleSubmitNewClaim = useCallback(
   	async (claimText: string) => {
   		if (!claimText.trim()) return;

   		try {
   			// Create new claim highlight
   			const newClaim: HighlightWithText = {
   				id: `claim-${Date.now()}`,
   				labelType: "claim",
   				text: claimText,
   			};

   			// Get current content
   			const sessionContent = await SessionManager.getEffectiveContent(
   				sessionId
   			);

   			// Add the claim at the end of the document
   			const updatedContent = appendClaimToContent(
   				sessionContent.content,
   				newClaim
   			);

   			// Update content with new claim
   			await SessionManager.updateAnalysedContent(
   				sessionId,
   				updatedContent,
   				[...highlights, newClaim],
   				relationships
   			);

   			// Close modal
   			setIsAddingClaim(false);
   		} catch (error) {
   			console.error("Error adding claim:", error);
   			// Handle error in UI
   		}
   	},
   	[highlights, relationships, sessionId]
   );
   ```

## UI Design

### Claims View Layout

- Clean, card-based layout with adequate spacing between claims
- Each claim card should have:
  - The claim text in a prominent position
  - Color coding matching the highlight color in the text view (yellow for claims)
  - Nested evidence items below with appropriate indentation
  - Visual indication (icon or message) when no evidence is present
  - Edit and delete buttons for the claim
  - Add evidence button at the bottom of each card
  - Edit and delete buttons for each evidence item

### Styling Guidelines

- Use existing Tailwind classes for consistency
- Maintain the application's color scheme (using LABEL_CONFIGS)
- Ensure adequate contrast and readability
- Implement responsive design for different screen sizes

### Sample Mock-up

```
┌─────────────────────────────────────────────────┐
│ Claims Analysis                  [+ Add Claim]   │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ Claim: Global warming is a serious threat  ✏️ 🗑│
│ │                                             │ │
│ │ Evidence:                                   │ │
│ │ ├─ Arctic ice has decreased by 13% per... ✏️ 🗑│
│ │ └─ Temperature records show consistent... ✏️ 🗑│
│ │                                             │ │
│ │ [+ Add Evidence]                            │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Claim: We need immediate policy changes    ✏️ 🗑│
│ │                                             │ │
│ │ Evidence:                                   │ │
│ │ └─ Current policies will result in 3°C... ✏️ 🗑│
│ │                                             │ │
│ │ [+ Add Evidence]                            │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Claim: Economic impacts will be subst...   ✏️ 🗑│
│ │                                             │ │
│ │ Evidence:                                   │ │
│ │ └─ No evidence found                        │ │
│ │                                             │ │
│ │ [+ Add Evidence]                            │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Content Manipulation Functions

The following helper functions will be needed to manipulate the document content:

```typescript
/**
 * Insert evidence text after a claim in the document
 */
function insertEvidenceAfterClaim(
	content: RemirrorJSON,
	claim: HighlightWithText,
	evidence: HighlightWithText
): RemirrorJSON {
	// Clone the content to avoid mutations
	const updatedContent = JSON.parse(JSON.stringify(content));

	// Find the claim in the document and insert evidence after it
	// This requires traversing the document structure and adding
	// a new text node with appropriate marks for the evidence

	return updatedContent;
}

/**
 * Replace the text of a highlight in the document
 */
function replaceHighlightText(
	content: RemirrorJSON,
	highlight: HighlightWithText,
	newText: string
): RemirrorJSON {
	// Clone the content to avoid mutations
	const updatedContent = JSON.parse(JSON.stringify(content));

	// Find the highlight in the document and replace its text
	// while preserving all marks and attributes

	return updatedContent;
}

/**
 * Remove a highlight from the document
 */
function removeHighlightFromContent(
	content: RemirrorJSON,
	highlight: HighlightWithText
): RemirrorJSON {
	// Clone the content to avoid mutations
	const updatedContent = JSON.parse(JSON.stringify(content));

	// Find and remove the highlight from the document
	// This may involve merging surrounding text nodes

	return updatedContent;
}

/**
 * Append a new claim to the end of the document
 */
function appendClaimToContent(
	content: RemirrorJSON,
	claim: HighlightWithText
): RemirrorJSON {
	// Clone the content to avoid mutations
	const updatedContent = JSON.parse(JSON.stringify(content));

	// Add the new claim as a paragraph at the end of the document
	// with appropriate marks for highlighting

	return updatedContent;
}
```

## Implementation Plan

### Phase 1: Basic View Implementation

1. Update `EditorPage.tsx` to add the claims view toggle option
2. Create the basic `ClaimsView` component structure
3. Implement data filtering and relationship mapping logic
4. Create the `ClaimCard` component for displaying individual claims
5. Add basic styling and layout

### Phase 2: CRUD Functionality

1. Implement the add evidence functionality
2. Create edit capability for claims and evidence
3. Implement delete operations for claims and evidence
4. Add new claim creation functionality
5. Create modal components for editing operations

### Phase 3: Refinements

1. Enhance the UI with animations and transitions
2. Improve error handling and edge cases
3. Add empty state designs
4. Test with various data sets
5. Ensure consistent behavior with text and graph views

## Dependencies

- Existing Remirror editor
- Existing Dexie database
- Existing SessionManager utilities
- Existing React and Tailwind setup
- No new external dependencies required

## Potential Challenges

1. **Content Manipulation Complexity**
   - Working with Remirror document structure might be complex
   - Ensuring proper marks and entity references are maintained
2. **Performance with Large Documents**
   - May need optimization for documents with many claims and edits
3. **Complex Relationship Handling**
   - Some evidence might relate to multiple claims
   - Need to handle relationship integrity when deleting items
4. **UI Consistency**
   - Must maintain consistent experience across all three views

## Future Enhancements

1. Implement a "coverage score" showing what percentage of claims have evidence
2. Add AI-powered suggestions for improving evidence
3. Enable export of the claims and evidence in structured formats
4. Add sorting and filtering options for claims
