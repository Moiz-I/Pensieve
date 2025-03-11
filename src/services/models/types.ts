import type { Relationship } from "../../utils/relationshipTypes";
import { XYPosition } from "reactflow";

export type ModelName = "gpt4o-mini" | "gpt-4o" | "claude-3.5";

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
	position?: XYPosition;
	// Optional flag to indicate if this was created in graph view
	createdInGraphView?: boolean;
};

export interface ModelResponse {
	highlights: HighlightWithText[];
	relationships: Relationship[];
}

export interface ModelConfig {
	apiKey?: string;
	baseUrl?: string;
	model?: string;
}

export interface ModelService {
	name: ModelName;
	analyse: (
		text: string,
		prompt: string,
		config: ModelConfig
	) => Promise<ModelResponse>;
}
