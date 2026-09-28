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
