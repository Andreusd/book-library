/**
 * EPUB theme definitions and DOM iframe styling helpers.
 */

export const COLOR_HEX_MAP = {
  yellow: '#facc15',
  green: '#34d399',
  blue: '#38bdf8',
  purple: '#c084fc',
  rose: '#fb7185',
};

export const EPUB_THEMES = {
  dark: {
    bg: '#000000',
    text: '#e2e8f0',
    heading: '#f8fafc',
    link: '#fbbf24',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  light: {
    bg: '#ffffff',
    text: '#1e293b',
    heading: '#0f172a',
    link: '#d97706',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  sepia: {
    bg: '#fbf0d9',
    text: '#433422',
    heading: '#292014',
    link: '#b45309',
    fontFamily: 'Georgia, serif'
  }
};

export const applyThemeToDoc = (doc, themeName) => {
  if (!doc) return;
  const cfg = EPUB_THEMES[themeName] || EPUB_THEMES.dark;

  // Remove any conflicting epubjs theme style tags
  try {
    const existingEpubStyles = doc.querySelectorAll(
      '#epubjs-inserted-css-dark, #epubjs-inserted-css-light, #epubjs-inserted-css-sepia, #epubjs-inserted-css-default'
    );
    existingEpubStyles.forEach(el => el.remove());
  } catch {}

  // Create or update dedicated custom theme style element
  let styleTag = doc.getElementById('epub-custom-theme-style');
  if (!styleTag) {
    styleTag = doc.createElement('style');
    styleTag.id = 'epub-custom-theme-style';
    doc.head?.appendChild(styleTag);
  }

  styleTag.textContent = `
    html, body {
      background-color: ${cfg.bg} !important;
      color: ${cfg.text} !important;
      font-family: ${cfg.fontFamily} !important;
      line-height: 1.8 !important;
      padding: 0 24px !important;
      font-weight: 400 !important;
    }
    p, div, span, li, blockquote, dd, dt, article, section, label, header, footer, nav, table, tbody, thead, tr, td, th, caption, pre, code {
      color: ${cfg.text} !important;
      background-color: transparent !important;
    }
    h1, h2, h3, h4, h5, h6 {
      color: ${cfg.heading} !important;
      font-weight: 600 !important;
      background-color: transparent !important;
    }
    a, a * {
      color: ${cfg.link} !important;
      text-decoration: underline !important;
    }
    img, svg {
      max-width: 100% !important;
      height: auto !important;
    }
  `;

  // Direct element-level properties for instant consistency
  try {
    if (doc.documentElement) {
      doc.documentElement.style.setProperty('background-color', cfg.bg, 'important');
      doc.documentElement.style.setProperty('color', cfg.text, 'important');
    }
    if (doc.body) {
      doc.body.style.setProperty('background-color', cfg.bg, 'important');
      doc.body.style.setProperty('color', cfg.text, 'important');
      doc.body.classList.remove('dark', 'light', 'sepia');
      doc.body.classList.add(themeName);
    }
  } catch {}
};
