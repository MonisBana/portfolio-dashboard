export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const API_UNREACHABLE_MESSAGE = `Cannot reach the portfolio API server at ${API_BASE}. Start it from the "server" folder with "npm run start:dev".`;

/**
 * Wrapper around fetch that turns network failures into a clear, actionable error.
 * Server errors (non-2xx responses) are still returned as-is for callers to handle.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
    try {
        return await fetch(input, init);
    } catch {
        throw new Error(API_UNREACHABLE_MESSAGE);
    }
}
