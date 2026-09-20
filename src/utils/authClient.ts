/**
 * Secure Client Authentication Service
 * Manages cryptographically issued session tokens, server-side verification,
 * and authenticated API headers for all admin edit operations.
 */

export const AUTHORIZED_OWNER_EMAIL = 'saahiressa@gmail.com';

const TOKEN_KEY = 'portfolio_session_token';
const EXPIRES_KEY = 'portfolio_session_expires';
const EMAIL_KEY = 'portfolio_session_email';

export interface AuthSession {
  token: string;
  email: string;
  expiresAt: number;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  remainingAttempts?: number;
  locked?: boolean;
  retryAfterMinutes?: number;
}

type AuthListener = (isAuthenticated: boolean, email?: string) => void;
const listeners = new Set<AuthListener>();

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(isAuth: boolean, email?: string) {
  listeners.forEach((fn) => {
    try {
      fn(isAuth, email);
    } catch (e) {
      console.error('Auth listener error:', e);
    }
  });
}

/**
 * Retrieves the currently stored token if valid and unexpired
 */
export function getStoredToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiresStr = localStorage.getItem(EXPIRES_KEY);
    if (!token) return null;

    if (expiresStr) {
      const expiresAt = parseInt(expiresStr, 10);
      if (!isNaN(expiresAt) && Date.now() > expiresAt) {
        clearLocalSession();
        return null;
      }
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Returns Authorization header with Bearer token if present
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`
  };
}

/**
 * Checks local session expiration
 */
export function isLocalSessionValid(): boolean {
  return Boolean(getStoredToken());
}

/**
 * Syncs a Firebase ID token into local session storage
 */
export function syncFirebaseSession(idToken: string, email: string = AUTHORIZED_OWNER_EMAIL) {
  try {
    const oneHourFromNow = Date.now() + 3600 * 1000;
    saveSession(idToken, email, oneHourFromNow);
  } catch (e) {
    console.error('Failed to sync Firebase session:', e);
  }
}

/**
 * Saves session token and expiry to localStorage
 */
export function saveSession(token: string, email: string, expiresAt: number) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EXPIRES_KEY, expiresAt.toString());
    localStorage.setItem(EMAIL_KEY, email);
    localStorage.setItem('portfolio_owner_authorized', 'true');
    notifyListeners(true, email);
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

/**
 * Clears local session records
 */
export function clearLocalSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.setItem('portfolio_owner_authorized', 'false');
    notifyListeners(false);
  } catch (e) {
    console.error('Failed to clear session:', e);
  }
}

/**
 * Verifies the current session token against the backend server
 */
export async function verifySessionWithServer(): Promise<boolean> {
  const token = getStoredToken();
  if (!token) {
    clearLocalSession();
    return false;
  }

  try {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        if (data.email) {
          localStorage.setItem(EMAIL_KEY, data.email);
        }
        notifyListeners(true, data.email);
        return true;
      }
    }
  } catch (err) {
    console.warn('Unable to verify session with backend, keeping local token if unexpired', err);
    return isLocalSessionValid();
  }

  // Token is expired or invalid on server
  clearLocalSession();
  return false;
}

/**
 * Logs out and invalidates the session token on the server
 */
export async function logoutSession(): Promise<void> {
  const token = getStoredToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch {
      // Ignore network errors on logout
    }
  }
  clearLocalSession();
}
