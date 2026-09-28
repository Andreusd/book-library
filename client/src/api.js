/**
 * API client utilities and automatic fetch interceptor for user profile management.
 */

export const USER_STORAGE_KEY = 'book_library_user';

export function getCurrentUser() {
  try {
    return (localStorage.getItem(USER_STORAGE_KEY) || '').trim();
  } catch (e) {
    return '';
  }
}

export function setCurrentUser(username) {
  try {
    const clean = (username || '').trim();
    if (clean) {
      localStorage.setItem(USER_STORAGE_KEY, clean);
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    // Dispatch event to notify any active components
    window.dispatchEvent(new CustomEvent('book_library_user_changed', { detail: { user: clean } }));
  } catch (e) {
    console.error('Failed to set current user in localStorage:', e);
  }
}

/**
 * Monkey-patches window.fetch to automatically inject the X-User header into all
 * /api requests when a user is logged into localStorage.
 */
let isInterceptorSetup = false;

export function setupFetchInterceptor() {
  if (isInterceptorSetup || typeof window === 'undefined') return;
  isInterceptorSetup = true;

  const originalFetch = window.fetch;
  window.fetch = function (input, init = {}) {
    try {
      let url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof Request) {
        url = input.url;
      } else if (input && typeof input.href === 'string') {
        url = input.href;
      }

      // Check if this request is directed to the backend API
      const isApiRequest = url.startsWith('/api') || url.includes('/api/');
      if (isApiRequest) {
        const user = getCurrentUser();
        if (user) {
          // Normalize headers
          const headers = new Headers(init.headers || (input instanceof Request ? input.headers : {}));
          if (!headers.has('X-User')) {
            headers.set('X-User', user);
          }
          init = { ...init, headers };
        }
      }
    } catch (err) {
      console.warn('Error inside fetch interceptor:', err);
    }

    return originalFetch(input, init);
  };
}
