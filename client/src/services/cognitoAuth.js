/**
 * AWS Cognito + Google OAuth Helper.
 * Handles redirection to the Cognito Hosted UI and Google Federated Login.
 */

const COGNITO_DOMAIN = 'book-library-auth-109990058921-dev.auth.us-east-1.amazoncognito.com';
const CLIENT_ID = '1o3v03p0b6m6otbssnnhan0k40';
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin : 'https://d4n8d1cbh8pro.cloudfront.net';

export function getGoogleLoginUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: REDIRECT_URI,
    identity_provider: 'Google'
  });
  return `https://${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

export function getCognitoLoginUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: REDIRECT_URI
  });
  return `https://${COGNITO_DOMAIN}/login?${params.toString()}`;
}

export function getLogoutUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: REDIRECT_URI
  });
  return `https://${COGNITO_DOMAIN}/logout?${params.toString()}`;
}

export function parseAuthTokens() {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    // Clean up code from address bar
    window.history.replaceState({}, document.title, window.location.pathname);
    return { code };
  }
  return null;
}

export const AUTH_STORAGE_KEY = 'book_library_auth';

export function getStoredAuth() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(authData) {
  if (typeof window === 'undefined') return;
  try {
    if (authData) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error saving auth tokens:', e);
  }
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
}

export const ALLOWED_EMAILS = ['andreuzielsd@gmail.com'];

/**
 * Exchange OAuth authorization code for Cognito JWT tokens.
 */
export async function exchangeCodeForTokens(code) {
  const tokenUrl = `https://${COGNITO_DOMAIN}/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code: code,
    redirect_uri: REDIRECT_URI
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.statusText}`);
  }

  const data = await res.json();
  // Decode id_token payload to extract user info (email)
  if (data.id_token) {
    try {
      const parts = data.id_token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        data.user = payload;
      }
    } catch (e) {
      console.warn('Could not decode id_token payload:', e);
    }
  }

  const userEmail = (data?.user?.email || '').toLowerCase().trim();
  if (ALLOWED_EMAILS.length > 0 && (!userEmail || !ALLOWED_EMAILS.includes(userEmail))) {
    clearStoredAuth();
    throw new Error(`Acesso não autorizado para o email ${userEmail || 'desconhecido'}. Apenas o proprietário autorizado possui permissão.`);
  }

  setStoredAuth(data);
  return data;
}



