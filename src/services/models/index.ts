import { OpenAIService } from "./openai";
import { AnthropicService } from "./anthropic";
import type {
	ModelService,
	ModelConfig,
	ModelResponse,
	ModelName,
} from "./types";

// Create instances of the services
const gpt4oMini = new OpenAIService("gpt4o-mini");
const claude3 = new AnthropicService("claude-3.5");

// Map model names to their services
export const modelServices: Record<ModelName, ModelService> = {
	"gpt4o-mini": gpt4oMini,
	"claude-3.5": claude3,
};

export type { ModelService, ModelConfig, ModelResponse, ModelName };
