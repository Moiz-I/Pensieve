import type {
	ModelService,
	ModelConfig,
	ModelResponse,
	ModelName,
} from "./types";

type RawHighlight = {
	id: string;
	labelType: string;
	text: string;
	[key: string]: unknown;
};

export class AnthropicService implements ModelService {
	name: ModelName;
	private defaultModel: string;

	constructor(name: ModelName) {
		this.name = name;
		this.defaultModel = "claude-3-sonnet-20240229";
	}

	async analyse(
		_text: string,
		prompt: string,
		config: ModelConfig
	): Promise<ModelResponse> {
		console.log(`Anthropic Service (${this.name}): Starting request...`);
		console.log(
			`Anthropic Service (${this.name}): Using model ${this.defaultModel}`
		);

		const requestBody = {
			model: config.model || this.defaultModel,
			max_tokens: 3000,
			messages: [
				{
					role: "user",
					content: prompt,
				},
			],
			temperature: 0.3,
			system: "You are an expert at analysing arguments and identifying their components. Your task is to identify key components in the text by selecting EXACT text snippets from the input. Always respond with valid JSON containing 'highlights' and 'relationships' arrays.",
		};

		console.log(
			`Anthropic Service (${this.name}): Request body:`,
			JSON.stringify(requestBody, null, 2)
		);

		// Use a recursive function for retry logic
		const executeRequest = async (attempt = 0, maxAttempts = 2): Promise<ModelResponse> => {
			console.log(`Anthropic Service (${this.name}): ${attempt > 0 ? `Retry attempt ${attempt}/${maxAttempts}` : 'Initial request'}`);
			
			try {
				// Set up request timeout
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
				
				// Make the API request through the secure proxy
				const response = await fetch("/api/anthropic/v1/messages", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"anthropic-version": "2023-06-01",
						"Accept": "application/json"
					},
					body: JSON.stringify(requestBody),
					signal: controller.signal,
					credentials: "omit"
				});
				
				// Clear the timeout since we got a response
				clearTimeout(timeoutId);
				
				console.log(`Anthropic Service (${this.name}): Response status:`, response.status);
				
				// Check for API errors
				if (!response.ok) {
					const errorText = await response.text();
					console.error(`Anthropic Service (${this.name}): API error:`, errorText);
					
					try {
						const error = JSON.parse(errorText);
						throw new Error(`Anthropic API error: ${error.error?.message || "Unknown error"}`);
					} catch (parseError) {
						throw new Error(`Anthropic API error: Status ${response.status} - ${errorText}`);
					}
				}
				
				// Parse the response body
				const data = await response.json();
				console.log(`Anthropic Service (${this.name}): Raw response:`, JSON.stringify(data, null, 2));
				
				// Get the content from the response
				const rawContent = data.content[0].text;
				console.log(`Anthropic Service (${this.name}): Raw content from model:`, rawContent);
				
				// Parse the JSON content
				let result;
				try {
					result = typeof rawContent === "string" ? JSON.parse(rawContent) : rawContent;
				} catch (parseError) {
					console.error(`Anthropic Service (${this.name}): Failed to parse content as JSON:`, parseError);
					throw new Error(`Response was not valid JSON. Raw content: ${rawContent.slice(0, 200)}...`);
				}
				
				// Validate the response format
				if (!result || typeof result !== "object") {
					console.error(`Anthropic Service (${this.name}): Invalid response format:`, result);
					throw new Error(`Response was not a JSON object. Raw content: ${JSON.stringify(rawContent).slice(0, 200)}...`);
				}
				
				// Check for highlights array
				if (!result.highlights || !Array.isArray(result.highlights)) {
					console.error(`Anthropic Service (${this.name}): Missing or invalid highlights:`, result);
					throw new Error(`Response missing required 'highlights' array. Raw content: ${JSON.stringify(rawContent).slice(0, 200)}...`);
				}
				
				// Validate the highlights
				const validHighlights = result.highlights.map((highlight: RawHighlight) => {
					if (!highlight.id || !highlight.labelType || !highlight.text) {
						console.error(`Anthropic Service (${this.name}): Invalid highlight format:`, highlight);
						throw new Error(`Highlight missing required properties (id, labelType, text). Raw content: ${JSON.stringify(highlight).slice(0, 200)}...`);
					}
					
					return {
						id: highlight.id,
						labelType: highlight.labelType,
						text: highlight.text,
						attrs: {
							labelType: highlight.labelType,
							type: highlight.labelType,
						},
					};
				});
				
				// Ensure relationships array exists
				if (!result.relationships) {
					console.warn(`Anthropic Service (${this.name}): Missing relationships array in response, using empty array`);
					result.relationships = [];
				}
				
				// Validate relationships format
				if (!Array.isArray(result.relationships)) {
					console.error(`Anthropic Service (${this.name}): Invalid relationships format:`, result.relationships);
					throw new Error(`Response has invalid 'relationships' format. Expected array but got: ${typeof result.relationships}`);
				}
				
				console.log(`Anthropic Service (${this.name}): Successfully parsed response`);
				
				// Return the validated result
				return {
					highlights: validHighlights,
					relationships: result.relationships,
				};
				
			} catch (error) {
				// Check if this is a network error and we should retry
				if (
					(error instanceof TypeError && error.message.includes('fetch')) &&
					attempt < maxAttempts
				) {
					console.error(`Anthropic Service (${this.name}): Network error:`, error);
					const nextAttempt = attempt + 1;
					const delay = nextAttempt * 1000; // Progressive backoff: 1s, 2s
					
					console.log(`Anthropic Service (${this.name}): Retrying in ${delay}ms...`);
					await new Promise(resolve => setTimeout(resolve, delay));
					
					// Recursive call with incremented attempt count
					return executeRequest(nextAttempt, maxAttempts);
				}
			
				// Either not a network error or we've exhausted retries
				console.error(`Anthropic Service (${this.name}): Error after ${attempt} attempt(s):`, error);
				throw error;
			}
		};
		
		// Start with attempt 0
		return executeRequest();
	}
} 