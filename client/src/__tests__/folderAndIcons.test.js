import { describe, it, expect } from 'vitest';
import { getFolderCovers } from '../utils/folderUtils';
import { ICON_MAP, AVAILABLE_SHELF_ICONS } from '../utils/shelfIcons';

describe('folderUtils', () => {
  it('returns sample_covers if already present on folder object', () => {
    const folder = { id: 'f1', sample_covers: ['/cov1.webp', '/cov2.webp'] };
    expect(getFolderCovers(folder, [])).toEqual(['/cov1.webp', '/cov2.webp']);
  });

  it('computes covers from matching books up to 4 covers', () => {
    const folder = { id: 'Sci-Fi' };
    const books = [
      { id: 'b1', folder: 'Sci-Fi', cover_url: '/c1.webp' },
      { id: 'b2', shelf: 'Sci-Fi', cover_url: '/c2.webp' },
      { id: 'b3', folder: 'Sci-Fi', cover_url: '/c3.webp' },
      { id: 'b4', folder: 'Sci-Fi', cover_url: '/c4.webp' },
      { id: 'b5', folder: 'Sci-Fi', cover_url: '/c5.webp' },
      { id: 'b6', folder: 'Other', cover_url: '/c6.webp' },
    ];
    const covers = getFolderCovers(folder, books);
    expect(covers).toHaveLength(4);
    expect(covers).toEqual(['/c1.webp', '/c2.webp', '/c3.webp', '/c4.webp']);
  });

  it('returns empty array when no matching books or covers exist', () => {
    const folder = { id: 'EmptyFolder' };
    expect(getFolderCovers(folder, [])).toEqual([]);
    expect(getFolderCovers(folder, null)).toEqual([]);
  });
});

describe('shelfIcons', () => {
  it('ICON_MAP contains standard library icons', () => {
    expect(ICON_MAP.Folder).toBeDefined();
    expect(ICON_MAP.GitBranch).toBeDefined();
    expect(ICON_MAP.Brain).toBeDefined();
    expect(ICON_MAP.Database).toBeDefined();
    expect(ICON_MAP.Cpu).toBeDefined();
    expect(ICON_MAP.Terminal).toBeDefined();
    expect(ICON_MAP.Rocket).toBeDefined();
  });

  it('AVAILABLE_SHELF_ICONS defines icon metadata categories', () => {
    expect(AVAILABLE_SHELF_ICONS.length).toBeGreaterThan(20);
    const categories = new Set(AVAILABLE_SHELF_ICONS.map((i) => i.category));
    expect(categories.has('Dev')).toBe(true);
    expect(categories.has('Architecture')).toBe(true);
    expect(categories.has('System')).toBe(true);
    expect(categories.has('Science')).toBe(true);
    expect(categories.has('General')).toBe(true);
  });
});
