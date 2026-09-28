/**
 * Text-to-Speech Utilities for PDF and EPUB readers.
 * Uses the browser-native Web Speech API (window.speechSynthesis).
 */

/**
 * Splits raw page text into natural, digestible reading chunks (paragraphs or sentences).
 * Avoids browser utterance length limits (e.g. Chrome's ~15-second speech cutoff).
 */
export function splitTextIntoReadableChunks(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .trim();

  if (!normalized) return [];

  // Split by paragraph breaks (double newlines)
  const rawParagraphs = normalized.split(/\n\s*\n+/);
  const chunks = [];

  for (const para of rawParagraphs) {
    const cleaned = para.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;

    // Filter out pure page numbers, isolated symbols, or noise
    if (/^\d{1,4}$/.test(cleaned) || /^[\p{P}\s]+$/u.test(cleaned)) {
      continue;
    }

    // Keep reasonable-length paragraphs together (<= 280 chars)
    if (cleaned.length <= 280) {
      chunks.push(cleaned);
    } else {
      // Split long paragraphs by sentences
      const sentences = cleaned.match(/[^.!?]+(?:[.!?]+["'”’]?|$)/g) || [cleaned];
      let currentSentenceChunk = '';

      for (const sent of sentences) {
        const trimmed = sent.trim();
        if (!trimmed) continue;

        if (currentSentenceChunk.length + trimmed.length > 250) {
          if (currentSentenceChunk.trim()) {
            chunks.push(currentSentenceChunk.trim());
          }
          currentSentenceChunk = trimmed;
        } else {
          currentSentenceChunk += (currentSentenceChunk ? ' ' : '') + trimmed;
        }
      }

      if (currentSentenceChunk.trim()) {
        chunks.push(currentSentenceChunk.trim());
      }
    }
  }

  return chunks;
}

/**
 * Extracts readable plain text from a specific PDF page.
 */
export async function extractPdfPageText(pdfDoc, pageNum) {
  if (!pdfDoc || !pageNum) return '';
  try {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    if (!textContent || !textContent.items || textContent.items.length === 0) {
      return '';
    }

    let lastY = null;
    let text = '';
    for (const item of textContent.items) {
      if (!item.str) continue;
      // Detect vertical movement (> 5 pt difference) to create line breaks
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        text += '\n';
      } else if (text && !text.endsWith(' ') && !text.endsWith('\n')) {
        text += ' ';
      }
      text += item.str;
      lastY = item.transform[5];
    }
    return text.trim();
  } catch (err) {
    console.warn('Failed to extract PDF page text for TTS:', err);
    return '';
  }
}

/**
 * Extracts readable plain text from the currently displayed EPUB rendition view.
 */
export function extractEpubVisibleText(rendition) {
  if (!rendition) return '';
  try {
    const contentsList = rendition.getContents();
    if (!contentsList || contentsList.length === 0) return '';
    const texts = [];
    for (const content of contentsList) {
      if (content?.document?.body) {
        // innerText respects natural CSS layouts, block boundaries, and ignores hidden elements
        const text = content.document.body.innerText || content.document.body.textContent || '';
        if (text && text.trim()) {
          texts.push(text.trim());
        }
      }
    }
    return texts.join('\n\n');
  } catch (err) {
    console.warn('Failed to extract EPUB text for TTS:', err);
    return '';
  }
}

/**
 * Gets all voices from speechSynthesis, sorted with preferred languages first.
 */
export function getAvailableVoices(preferredLang = 'en') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices() || [];
  const langPrefix = preferredLang.slice(0, 2).toLowerCase();

  return [...voices].sort((a, b) => {
    const aMatch = a.lang.toLowerCase().startsWith(langPrefix);
    const bMatch = b.lang.toLowerCase().startsWith(langPrefix);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return a.name.localeCompare(b.name);
  });
}
