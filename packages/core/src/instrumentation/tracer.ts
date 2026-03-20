/**
 * No-op span wrapper. Calls fn() directly; actual OpenTelemetry tracing is
 * not included in this build. Install @opentelemetry/sdk-trace-node and
 * configure a TracerProvider for real tracing.
 */
export function withSpan<T>(
	_name: string,
	_attributes: Record<string, string | number | boolean>,
	fn: () => T,
): T;
export function withSpan<T>(
	_name: string,
	_attributes: Record<string, string | number | boolean>,
	fn: () => Promise<T>,
): Promise<T>;
export function withSpan<T>(
	_name: string,
	_attributes: Record<string, string | number | boolean>,
	fn: () => T | Promise<T>,
): T | Promise<T> {
	return fn();
}
