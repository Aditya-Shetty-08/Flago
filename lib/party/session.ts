/**
 * Anonymous session management
 * Uses localStorage + IP address to create unique user identifiers
 */

const SESSION_KEY = 'flago_party_session_id';

/**
 * Get or create a session ID
 * Stores in localStorage for persistence across page reloads
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    // Server-side: generate a temporary ID (will be replaced by client)
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  let sessionId = localStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    // Generate a new session ID
    sessionId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
    console.log('[SESSION] Created new session ID:', sessionId);
  } else {
    console.log('[SESSION] Using existing session ID:', sessionId);
  }

  return sessionId;
}

/**
 * Get user identifier (session ID - stable and consistent)
 * This is used as the "user_id" in the database
 * 
 * Note: We use just the session ID (stored in localStorage) for consistency.
 * The session ID is generated once and persists across page reloads.
 */
export async function getUserId(): Promise<string> {
  // Just use the session ID - it's stable and stored in localStorage
  // This ensures the same user gets the same ID across all requests
  const userId = getSessionId();
  console.log('[SESSION] getUserId() returning:', userId);
  return userId;
}

/**
 * Simple hash function for IP addresses
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Reset session (for testing or if user wants new identity)
 */
export function resetSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

