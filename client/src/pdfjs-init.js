// Polyfills for TC39 Map.prototype.getOrInsertComputed and getOrInsert used by pdfjs-dist
if (typeof Map !== 'undefined') {
  if (!Map.prototype.getOrInsertComputed) {
    Map.prototype.getOrInsertComputed = function (key, callbackFn) {
      if (this.has(key)) {
        return this.get(key);
      }
      const value = callbackFn(key);
      this.set(key, value);
      return value;
    };
  }
  if (!Map.prototype.getOrInsert) {
    Map.prototype.getOrInsert = function (key, defaultValue) {
      if (this.has(key)) {
        return this.get(key);
      }
      this.set(key, defaultValue);
      return defaultValue;
    };
  }
}

if (typeof WeakMap !== 'undefined') {
  if (!WeakMap.prototype.getOrInsertComputed) {
    WeakMap.prototype.getOrInsertComputed = function (key, callbackFn) {
      if (this.has(key)) {
        return this.get(key);
      }
      const value = callbackFn(key);
      this.set(key, value);
      return value;
    };
  }
}

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

if (typeof window !== 'undefined') {
  window.pdfjsLib = pdfjsLib;
}
if (typeof globalThis !== 'undefined') {
  globalThis.pdfjsLib = pdfjsLib;
}

export default pdfjsLib;
