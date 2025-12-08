import yoctoSpinner from "yocto-spinner";

/**
 * Detects if we're in a CI/test environment where spinners shouldn't be used
 */
function isNonInteractive(): boolean {
	return (
		!process.stdout.isTTY ||
		process.env.CI === "true" ||
		process.env.NODE_ENV === "test"
	);
}

/**
 * Creates a spinner that gracefully degrades to simple logging in non-interactive environments
 */
export function createSpinner(options: { text: string }) {
	const nonInteractive = isNonInteractive();

	if (nonInteractive) {
		// In non-interactive environments, just log the text directly
		console.log(options.text);

		return {
			start: () => {},
			stop: () => {},
			success: (text?: string) => {
				if (text) console.log(text);
			},
			error: (text?: string) => {
				if (text) console.error(text);
			},
			warning: (text?: string) => {
				if (text) console.log(text);
			},
			info: (text?: string) => {
				if (text) console.log(text);
			},
		};
	}

	// In interactive environments, use the real spinner
	return yoctoSpinner(options);
}
