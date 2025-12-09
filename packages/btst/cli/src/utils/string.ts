/**
 * Capitalizes the first letter of a string.
 * Local utility to avoid dependency on @better-auth/core/utils
 */
export function capitalizeFirstLetter(str: string) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
