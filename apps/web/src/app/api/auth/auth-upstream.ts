export const apiOrigin = process.env.API_INTERNAL_ORIGIN ?? 'http://127.0.0.1:3000';

export async function authUpstream(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(new URL(path, apiOrigin), { ...init, cache: 'no-store' });
  } catch {
    return null;
  }
}
