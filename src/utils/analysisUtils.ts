import type { RemirrorJSON } from "remirror";
import { SessionManager } from "./sessionManager";
import { modelServices } from "../services/models";
import type { ModelName } from "../services/models/types";
import { extractTextFromContent } from "./textUtils";
import { LABEL_CONFIGS } from "./constants";
// import type { PromptTemplate } from "./types";

// Cache for API key validation to avoid repeated validation
const apiKeyValidationCache = {
	key: "",
	isValid: false,
	lastValidated: 0
};

interface AnalysisOptions {
	sessionId: number;
	content: RemirrorJSON;
	modelName?: string;
	isDirty: boolean;
	saveChanges: () => Promise<void>;
}

export const detailedPrompt = {
	id: "detailed",
	name: "Detailed Prompt with Examples",
	template: `You are an expert at analysing arguments and identifying their components. Your task is to identify key components in the text by selecting EXACT text snippets from the input.

Label Types:
${LABEL_CONFIGS.map((l) => `- ${l.name}: ${l.description}`).join("\n")}

IMPORTANT: For each component you identify, you MUST use exact, verbatim text from the input. Do not modify, paraphrase, or extend the text in any way. Each highlight must be a continuous substring of the input text.

Here's an example:
Text: "Global warming is a serious threat. Arctic ice has decreased by 13% per decade. This suggests future sea level rises will be catastrophic. While this is concerning, we don't have exact details on how much sea level will rise. Have scientists considered all possible variables? Many people assume warmer temperatures will only cause negative outcomes. If we don't act soon, coastal cities could be underwater by 2100."

Return your analysis in the following JSON format:
{
    "highlights": [
        {
            "id": "1",
            "labelType": "claim",
            "text": "Global warming is a serious threat"
        },
        {
            "id": "2",
            "labelType": "evidence",
            "text": "Arctic ice has decreased by 13% per decade"
        },
        {
            "id": "3",
            "labelType": "implication",
            "text": "This suggests future sea level rises will be catastrophic"
        },
        {
            "id": "4",
            "labelType": "counterargument",
            "text": "While this is concerning, we don't have exact details on how much sea level will rise"
        },
        {
            "id": "5",
            "labelType": "question",
            "text": "Have scientists considered all possible variables?"
        },
        {
            "id": "6", 
            "labelType": "assumption",
            "text": "Many people assume warmer temperatures will only cause negative outcomes"
        },
        {
            "id": "7",
            "labelType": "cause",
            "text": "If we don't act soon"
        },
        {
            "id": "8",
            "labelType": "implication",
            "text": "coastal cities could be underwater by 2100"
        }
    ],
    "relationships": []
}

Now analyse this text:
{{text}}`
};

/**
 * Performs the analysis of text content using the specified model
 * and saves the results to the database
 */
export async function performAnalysis({
	sessionId,
	content,
	modelName = "claude-3.5",
	isDirty,
	saveChanges,
}: AnalysisOptions): Promise<{ success: boolean; error?: string }> {
	try {
		// Save any pending changes first
		await saveChanges();

		// Get the model service
		const service = modelServices[modelName as keyof typeof modelServices];
		if (!service) {
			console.error("❌ Model service not found:", modelName);
			throw new Error(`Model service '${modelName}' not found`);
		}

		// Extract text content from the editor
		const textContent = extractTextFromContent(content);
		console.log("📝 Extracted text content of length:", textContent.length);

		// Log the analysis request
		try {
			await fetch('https://pensieve-ashy.vercel.app/api/logging', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					text: textContent,
					model: modelName,
					sessionId,
				}),
			});
		} catch (logError) {
			console.error('Failed to log analysis request:', logError);
			// Don't throw here, we want to continue with the analysis even if logging fails
		}

		// Prepare the prompt by replacing the text placeholder
		const prompt = detailedPrompt.template.replace("{{text}}", textContent);

		// Send to model service via secure proxy
		console.log("🤖 Sending to model service...");
		let analysis;
		try {
			analysis = await service.analyse(textContent, prompt, {});
			console.log("✨ Received analysis result:", analysis);
			
			if (!analysis || !analysis.highlights) {
				console.error("❌ Invalid analysis result:", analysis);
				throw new Error("Invalid analysis result received from model service");
			}
		} catch (modelError) {
			console.error("❌ Model service error:", modelError);
			throw modelError;
		}

		// Verify we have valid data before saving
		if (!analysis.highlights) {
			analysis.highlights = [];
		}
		
		if (!analysis.relationships) {
			analysis.relationships = [];
		}

		// Save the analysis results
		console.log("💾 Saving analysis results...");
		try {
			await SessionManager.saveAnalysis(
				sessionId,
				modelName as ModelName,
				"default",
				content,
				analysis.highlights,
				analysis.relationships
			);
			console.log("✅ Analysis saved successfully");
		} catch (saveError) {
			console.error("❌ Failed to save analysis:", saveError);
			throw saveError;
		}

		return { success: true };
	} catch (error) {
		console.error("❌ Failed to create and analyse session:", error);
		if (error instanceof Error) {
			console.error("Error details:", {
				name: error.name,
				message: error.message,
				stack: error.stack
			});
		}
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
