/**
 * Utility functions for folders / shelves
 */

export function getFolderCovers(folder, books = []) {
  if (folder.sample_covers && folder.sample_covers.length > 0) {
    return folder.sample_covers;
  }
  if (books && books.length > 0) {
    const matching = books.filter(b => b.shelf === folder.id || b.folder === folder.id);
    return matching.slice(0, 4).map(b => b.cover_url);
  }
  return [];
}
