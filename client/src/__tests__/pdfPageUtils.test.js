import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDualPageSpread,
  getNextSpreadPage,
  getPrevSpreadPage,
  getPdfDocFingerprint,
  getCachedPageCanvas,
  setCachedPageCanvas,
  clearPageRenderCache,
  pageRenderCache,
} from '../utils/pdfPageUtils';

describe('pdfPageUtils', () => {
  beforeEach(() => {
    clearPageRenderCache();
  });

  describe('getDualPageSpread', () => {
    it('calculates standard dual-page spreads (no separate cover)', () => {
      // Page 1 and 2
      const spread1 = getDualPageSpread(1, 10, false);
      expect(spread1).toEqual({ left: 1, right: 2, currentBase: 1 });

      const spread2 = getDualPageSpread(2, 10, false);
      expect(spread2).toEqual({ left: 1, right: 2, currentBase: 1 });

      // Page 3 and 4
      const spread3 = getDualPageSpread(3, 10, false);
      expect(spread3).toEqual({ left: 3, right: 4, currentBase: 3 });

      // Last odd page with no right page
      const spreadOddLast = getDualPageSpread(9, 9, false);
      expect(spreadOddLast).toEqual({ left: 9, right: null, currentBase: 9 });
    });

    it('calculates dual-page spreads with separate cover', () => {
      // Cover alone on right
      const cover = getDualPageSpread(1, 10, true);
      expect(cover).toEqual({ left: null, right: 1, currentBase: 1 });

      // Spread 2 and 3
      const spread2 = getDualPageSpread(2, 10, true);
      expect(spread2).toEqual({ left: 2, right: 3, currentBase: 2 });

      const spread3 = getDualPageSpread(3, 10, true);
      expect(spread3).toEqual({ left: 2, right: 3, currentBase: 2 });

      // Last even page alone when total is 10
      const spread10 = getDualPageSpread(10, 10, true);
      expect(spread10).toEqual({ left: 10, right: null, currentBase: 10 });
    });

    it('handles out of bounds or negative page inputs gracefully', () => {
      const spreadLow = getDualPageSpread(-5, 10, false);
      expect(spreadLow.currentBase).toBe(1);

      const spreadHigh = getDualPageSpread(100, 10, false);
      expect(spreadHigh.currentBase).toBe(9);
    });
  });

  describe('getNextSpreadPage and getPrevSpreadPage', () => {
    it('advances next spread correctly', () => {
      expect(getNextSpreadPage(1, 10, false)).toBe(3);
      expect(getNextSpreadPage(3, 10, false)).toBe(5);
      expect(getNextSpreadPage(9, 10, false)).toBe(9); // does not overshoot

      // Separate cover: from cover (1) moves to page 2
      expect(getNextSpreadPage(1, 10, true)).toBe(2);
      expect(getNextSpreadPage(2, 10, true)).toBe(4);
    });

    it('rewinds previous spread correctly', () => {
      expect(getPrevSpreadPage(5, 10, false)).toBe(3);
      expect(getPrevSpreadPage(3, 10, false)).toBe(1);
      expect(getPrevSpreadPage(1, 10, false)).toBe(1); // does not go below 1

      // Separate cover: from page 2 returns to cover (1)
      expect(getPrevSpreadPage(2, 10, true)).toBe(1);
      expect(getPrevSpreadPage(4, 10, true)).toBe(2);
    });
  });

  describe('getPdfDocFingerprint', () => {
    it('extracts fingerprint from various pdfDoc shapes', () => {
      expect(getPdfDocFingerprint(null)).toBe('');
      expect(getPdfDocFingerprint({ fingerprints: ['fp_123'] })).toBe('fp_123');
      expect(getPdfDocFingerprint({ fingerprint: 'single_fp' })).toBe('single_fp');
      expect(getPdfDocFingerprint({ _pdfInfo: { fingerprint: 'info_fp' } })).toBe('info_fp');
      expect(getPdfDocFingerprint({ loadingTask: { docId: 'task_doc' } })).toBe('task_doc');
      expect(getPdfDocFingerprint({})).toBe('doc');
    });
  });

  describe('Page render cache and eviction', () => {
    it('caches and retrieves canvas items', () => {
      const mockItem = { canvas: {}, dims: { width: 100, height: 200 } };
      setCachedPageCanvas('doc1_p1_1', mockItem);
      expect(getCachedPageCanvas('doc1_p1_1')).toBe(mockItem);
      expect(getCachedPageCanvas('missing')).toBeNull();
    });

    it('evicts oldest entry when MAX_CACHE_SIZE (24) is exceeded', () => {
      for (let i = 1; i <= 25; i++) {
        setCachedPageCanvas(`key_${i}`, { index: i });
      }
      expect(pageRenderCache.size).toBe(24);
      // First key (key_1) should be evicted
      expect(getCachedPageCanvas('key_1')).toBeNull();
      // Latest key should exist
      expect(getCachedPageCanvas('key_25')).toEqual({ index: 25 });
    });

    it('clears all cached items', () => {
      setCachedPageCanvas('key_a', {});
      setCachedPageCanvas('key_b', {});
      clearPageRenderCache();
      expect(pageRenderCache.size).toBe(0);
    });
  });
});
