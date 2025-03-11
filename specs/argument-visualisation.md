# Lodestone Argument Visualization Feature Specification

## Overview

This document outlines the specification for implementing an interactive graph visualization feature for the Lodestone critical thinking application. The feature will allow users to visualize and manipulate the relationships between different elements of their arguments (claims, evidence, counterarguments, etc.) in a dynamic graph view that stays synchronized with the existing text editor view.

## Goals

- Provide a visual representation of the user's argument structure
- Enable intuitive manipulation of argument elements and their relationships
- Maintain bidirectional synchronization between the text editor and graph views
- Support adding new elements directly in the graph view
- Enhance the critical thinking process by clarifying relationships between ideas

## User Experience

### New "Graph View" Tab

Add a new tab or toggle button in the analysis phase that allows users to switch between:

1. The current text view with colored highlights
2. The new graph visualization view

### Graph View Interactions

In the graph view, users can:

- See claims, evidence, counterarguments, etc. as nodes with distinguishing colors matching the text view highlights
- Drag nodes to reposition them on the canvas
- Create new relationship arrows between existing nodes
- Add new nodes (claims, evidence, etc.) directly in the graph view
- Edit node text by clicking on it
- Delete nodes or relationships

### Synchronization Behavior

- Changes made in the text view (adding/editing highlights, creating relationships) are immediately reflected in the graph view
- New nodes added in the graph view appear as new highlights at the end of the text in the text view
- Position changes in the graph view are persisted but don't affect the text view

## Technical Implementation

### Technology Stack

- Use [React Flow](https://reactflow.dev/) for the graph visualization (already installed)
- Continue using Remirror for the text editor
- Maintain the existing Dexie database structure with additions

### Data Model Extensions

Update the existing `HighlightWithText` interface in `src/services/models/types.ts`:

```typescript
export type HighlightWithText = {
	id: string;
	labelType: string;
	text: string;
	startIndex?: number;
	endIndex?: number;
	attrs?: {
		labelType: string;
		type: string;
	};
	// New fields for graph view
	position?: {
		x: number;
		y: number;
	};
	// Optional flag to indicate if this was created in graph view
	createdInGraphView?: boolean;
};
```

The current `Relationship` interface in `src/utils/relationshipTypes.ts` doesn't need modifications for the basic functionality:

```typescript
export interface Relationship {
	sourceHighlightId: string; // The highlight that is connecting from
	targetHighlightId: string; // The highlight that is being connected to
}
```

### Component Architecture

1. **Graph Visualization Component (`src/components/ArgumentGraph.tsx`)**

   ```typescript
   interface ArgumentGraphProps {
   	highlights: HighlightWithText[];
   	relationships: Relationship[];
   	onHighlightsChange: (highlights: HighlightWithText[]) => void;
   	onRelationshipsChange: (relationships: Relationship[]) => void;
   }
   ```

2. **EditorPage Modifications**

   - Add view mode toggle (text/graph) in the analysis view
   - Conditionally render either the Editor or ArgumentGraph component

3. **Custom Node Components**
   - Create custom React Flow node types for each highlight type (claim, evidence, etc.)
   - Style nodes to match the color coding in the text view using LABEL_CONFIGS

### Synchronization Implementation

1. **Text to Graph Sync**

   ```typescript
   useEffect(() => {
   	// Convert highlights to nodes
   	const newNodes = highlights.map((highlight) => ({
   		id: highlight.id,
   		type: getNodeTypeForLabelType(highlight.labelType),
   		data: {
   			label: highlight.text,
   			type: highlight.labelType,
   		},
   		position: highlight.position || getDefaultPosition(highlight),
   	}));

   	setNodes(newNodes);

   	// Convert relationships to edges
   	const newEdges = relationships.map((relation) => ({
   		id: `e-${relation.sourceHighlightId}-${relation.targetHighlightId}`,
   		source: relation.sourceHighlightId,
   		target: relation.targetHighlightId,
   		animated: false,
   	}));

   	setEdges(newEdges);
   }, [highlights, relationships]);
   ```

2. **Graph to Text Sync**

   ```typescript
   const onNodeDragStop = (event, node) => {
   	// Update position in the database
   	const updatedHighlights = highlights.map((h) =>
   		h.id === node.id ? { ...h, position: node.position } : h
   	);

   	onHighlightsChange(updatedHighlights);
   };

   const onNodeAdd = (newNodeData) => {
   	// Create a new highlight
   	const newHighlight: HighlightWithText = {
   		id: generateId(),
   		labelType: newNodeData.type,
   		text: newNodeData.label,
   		startIndex: getEndOfTextPosition(), // Append to end of text
   		endIndex: getEndOfTextPosition() + newNodeData.label.length,
   		position: newNodeData.position,
   		createdInGraphView: true,
   	};

   	// Update highlights array
   	onHighlightsChange([...highlights, newHighlight]);
   };
   ```

### Initial Node Positioning

For new highlights created in the text view without position information:

1. Implement a basic auto-layout algorithm that places new nodes in logical positions
2. Group nodes by type (claims in one area, evidence in another)
3. Allow user rearrangement after initial placement

### Database Updates

Update the database operations to store and retrieve node position information:

```typescript
// In db.ts
this.version(15)
	.stores({
		editorContent: "++id, updatedAt",
		sessions: "++id, createdAt, status, lastModified, highlightCount",
		dynamicQuestions:
			"++id, sessionId, generatedAt, isInitialQuestion, wasShown",
	})
	.upgrade(async (trans) => {
		// Add explicit handling for the position field
		console.log(
			"Upgrading database to version 15 with explicit position field support"
		);

		// Process each session to ensure position data is preserved
		const sessions = await trans.table("sessions").toCollection().toArray();

		for (const session of sessions) {
			if (session.analysedContent?.highlights) {
				// Using the upgrade transaction to update the session directly ensures
				// that nested objects like position get properly serialized
				await trans.table("sessions").update(session.id!, session);
			}
		}
	});
```

When saving session to database:

```typescript
const saveSession = async () => {
	await db.sessions.update(sessionId, {
		analysedContent: {
			...session.analysedContent,
			highlights: highlights, // Now includes position data
			relationships: relationships,
		},
		lastModified: new Date(),
	});
};
```

## Error Handling

1. **Position Conflicts**

   - Implement collision detection for auto-positioned nodes
   - Shift overlapping nodes to ensure visibility

2. **Relationship Validation**

   - Prevent creation of invalid relationship types (based on your semantic rules)
   - Show validation feedback if user attempts invalid connections

3. **Sync Failures**

   - Implement undo functionality for both views
   - Provide visual feedback when synchronization occurs

4. **Orphaned Elements**
   - Detect and handle nodes with no connections
   - Provide visual distinction for isolated nodes

## Performance Considerations

1. **Throttling Updates**

   - Throttle position updates during dragging to prevent excessive database writes
   - Use requestAnimationFrame for smooth animations

2. **Large Graph Optimizations**
   - Implement virtualization for large numbers of nodes
   - Consider pagination or focus+context for complex arguments

## Implementation Plan

### Phase 1: Basic Visualization

- Update the database schema (v14) to store position information
- Create the ArgumentGraph component with basic visualization
- Implement the view toggle in EditorPage
- Convert existing highlights to nodes and relationships to edges
- Implement basic auto-layout algorithm for initial node positioning
- Enable node repositioning and position persistence

### Phase 2: Interactive Editing

- Implement edge creation/deletion in the graph view
- Update the SessionManager to handle graph-specific operations
- Ensure bidirectional synchronization between views
- Add validation for relationships
- Implement node creation in graph view

### Phase 3: Advanced Features

- Add node text editing in the graph view
- Implement node grouping/clustering
- Add filters/views for specific argument aspects
- Add collision detection and handling

## Future Considerations

- Export graph as image/PDF
- Different layout algorithms (hierarchical, circular, etc.)
- Collapse/expand node groups for complex arguments
- AI-assisted suggestions for improving argument structure based on graph topology

## Dependencies

- React Flow v11+ (for graph visualization)
- Remirror (existing text editor)
- Dexie (existing database)
