import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TAG_COLORS, COLOR_OPTIONS, getTagColorConfig } from '../utils/tagColors';
import { 
  getCurrentUser, 
  setCurrentUser, 
  apiFetch, 
  USER_STORAGE_KEY,
  booksApi,
  librariesApi,
  tagsApi,
  settingsApi,
} from '../api';

const createStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => (key in store ? store[key] : null)),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
};

const storageMock = createStorageMock();
Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true });

describe('tagColors', () => {
  it('defines valid color palettes', () => {
    expect(COLOR_OPTIONS).toContain('amber');
    expect(COLOR_OPTIONS).toContain('emerald');
    expect(COLOR_OPTIONS).toContain('sky');
    expect(COLOR_OPTIONS).toContain('purple');
    expect(COLOR_OPTIONS).toContain('rose');
    expect(COLOR_OPTIONS).toContain('indigo');
    expect(COLOR_OPTIONS).toContain('orange');
    expect(COLOR_OPTIONS).toContain('slate');
  });

  it('resolves color config with fallback to amber', () => {
    const config = getTagColorConfig('emerald');
    expect(config.label).toBe('Emerald');
    expect(config.bg).toBe('bg-emerald-500');

    const fallback = getTagColorConfig('unknown_color');
    expect(fallback).toBe(TAG_COLORS.amber);
  });
});

describe('api client', () => {
  beforeEach(() => {
    storageMock.clear();
  });

  afterEach(() => {
    storageMock.clear();
    vi.restoreAllMocks();
  });

  it('sets and retrieves current user', () => {
    expect(getCurrentUser()).toBe('');

    setCurrentUser('Alice');
    expect(getCurrentUser()).toBe('Alice');
    expect(storageMock.getItem(USER_STORAGE_KEY)).toBe('Alice');

    setCurrentUser('');
    expect(getCurrentUser()).toBe('');
    expect(storageMock.getItem(USER_STORAGE_KEY)).toBeNull();
  });

  it('injects X-User header in apiFetch when user is logged in', async () => {
    setCurrentUser('Bob');

    let capturedHeaders = null;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedHeaders = init?.headers;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
    });

    await apiFetch('/api/books');

    expect(capturedHeaders).not.toBeNull();
    expect(capturedHeaders.get('X-User')).toBe('Bob');
  });

  it('booksApi.getBooks builds proper query params', async () => {
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = url;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ books: [], count: 0 }) });
    });

    await booksApi.getBooks({ folder: 'Fiction', sort: 'title_asc', library_id: 'lib_1' });

    expect(capturedUrl).toContain('/api/books?');
    expect(capturedUrl).toContain('folder=Fiction');
    expect(capturedUrl).toContain('sort=title_asc');
    expect(capturedUrl).toContain('library_id=lib_1');
  });

  it('librariesApi.addLibrary serializes payload as JSON', async () => {
    let capturedOptions = null;
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      capturedOptions = opts;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
    });

    await librariesApi.addLibrary({ name: 'Books', path: '/books' });

    expect(capturedOptions.method).toBe('POST');
    expect(capturedOptions.headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(capturedOptions.body)).toEqual({ name: 'Books', path: '/books' });
  });

  it('handles API errors by throwing informative messages', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ detail: 'Invalid library folder path' }),
      });
    });

    await expect(settingsApi.saveSettings('/invalid')).rejects.toThrow('Invalid library folder path');
  });
});
