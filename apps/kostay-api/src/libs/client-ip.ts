/**
 * The visitor's address. nginx overwrites X-Real-IP with the address it sees; X-Forwarded-For
 * is not used, because a client can put any value in front of it.
 */
export function clientIp(
	headers: Record<string, string | string[] | undefined>,
	socketIp?: string,
): string {
	const real = headers['x-real-ip'];
	return (Array.isArray(real) ? real[0] : real) || socketIp || 'unknown';
}
