const SESSION_TOKEN_KEY = 'ekhtyarak_owner_token';
const VISITOR_ID_KEY = 'ekhtyarak_visitor_id';
const VISIT_SESSION_ID_KEY = 'ekhtyarak_visit_session_id';

export function getStoredOwnerToken(): string | null {
  try {
    return window.localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredOwnerToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore storage restriction
  }
}

export function getVisitorIdentifiers(): { visitorId: string; sessionId: string } {
  let visitorId = '';
  let sessionId = '';
  try {
    visitorId = window.localStorage.getItem(VISITOR_ID_KEY) ?? '';
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    sessionId = window.sessionStorage.getItem(VISIT_SESSION_ID_KEY) ?? '';
    if (!sessionId) {
      sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(VISIT_SESSION_ID_KEY, sessionId);
    }
  } catch {
    visitorId = visitorId || `v_ephemeral_${Date.now()}`;
    sessionId = sessionId || `s_ephemeral_${Date.now()}`;
  }
  return { visitorId, sessionId };
}

export async function ownerFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredOwnerToken();
  const headers = new Headers(options.headers ?? {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}
