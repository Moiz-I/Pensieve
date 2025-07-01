// Validate that required environment variables are set
const validateEnvVar = (key: string, value: string | undefined): string => {
	if (!value || value.trim() === "") {
		throw new Error(
			`Missing environment variable: ${key}. Please check your .env file and ensure it is set.`
		);
	}
	return value;
};

// Note: API keys are now handled server-side only for security
// Client-side code will use proxy endpoints instead of direct API calls

// Get environment variables with type safety and validation
export const env = {
	// These are no longer needed on client-side since we use proxy endpoints
	// API keys are stored securely in server environment variables without VITE_ prefix
};
