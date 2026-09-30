import { describe, it, expect } from 'vitest';
import {
  adaptColorForDarkMode,
  tokenizeCodeText,
  highlightUnstyledCodeBlocks,
  applyThemeToDoc,
  EPUB_THEMES,
} from '../utils/epubThemeUtils';

describe('EPUB Colored Text & Dark Mode Syntax Highlighting', () => {
  describe('adaptColorForDarkMode', () => {
    it('converts dark grayscale colors to readable body text', () => {
      expect(adaptColorForDarkMode('#000000', '#e2e8f0')).toBe('#e2e8f0');
      expect(adaptColorForDarkMode('black', '#e2e8f0')).toBe('#e2e8f0');
      expect(adaptColorForDarkMode('rgb(20, 20, 20)', '#e2e8f0')).toBe('#e2e8f0');
      expect(adaptColorForDarkMode('#222', '#e2e8f0')).toBe('#e2e8f0');
    });

    it('boosts lightness of dark saturated colors for high contrast', () => {
      const darkTeal = adaptColorForDarkMode('#006699');
      expect(darkTeal).toMatch(/hsl\(200,\s*100%,\s*65%\)/);

      const darkBlue = adaptColorForDarkMode('rgb(0, 0, 128)');
      expect(darkBlue).toMatch(/hsl\(240,\s*100%,\s*65%\)/);

      const darkOrange = adaptColorForDarkMode('rgb(204, 51, 0)');
      expect(darkOrange).toMatch(/hsl\(15,\s*100%,\s*75%\)/);
    });

    it('preserves colors that already have sufficient lightness and contrast', () => {
      expect(adaptColorForDarkMode('#00CCFF')).toBe('#00ccff');
      expect(adaptColorForDarkMode('#c0f')).toBe('#c0f');
      expect(adaptColorForDarkMode('#ffffff')).toBe('#ffffff');
      expect(adaptColorForDarkMode('white')).toBe('#ffffff');
      expect(adaptColorForDarkMode('transparent')).toBe('transparent');
    });

    it('maps named dark colors to high-contrast equivalents', () => {
      expect(adaptColorForDarkMode('navy')).toBe('#60a5fa');
      expect(adaptColorForDarkMode('darkred')).toBe('#f87171');
      expect(adaptColorForDarkMode('darkgreen')).toBe('#4ade80');
    });
  });

  describe('tokenizeCodeText', () => {
    it('tokenizes python code with keywords, strings, decorators, comments, and builtins', () => {
      const code = `
# 1) Define tool
@tool
def cancel_order(order_id: str) -> str:
    """Cancel order."""
    return f"Order {order_id}"
      `.trim();

      const html = tokenizeCodeText(code);
      expect(html).toContain('<code class="c1"># 1) Define tool</code>');
      expect(html).toContain('<code class="nd">@tool</code>');
      expect(html).toContain('<code class="kn">def</code>');
      expect(html).toContain('<code class="nf">cancel_order</code>');
      expect(html).toContain('<code class="nb">str</code>');
      expect(html).toContain('<code class="s1">&quot;&quot;&quot;Cancel order.&quot;&quot;&quot;</code>');
      expect(html).toContain('<code class="kn">return</code>');
    });
  });

  describe('highlightUnstyledCodeBlocks', () => {
    it('leaves pre-highlighted code blocks untouched', () => {
      const mockDoc = {
        querySelectorAll: () => [
          {
            querySelector: () => ({
              getAttribute: () => null,
              setAttribute: () => {},
              classList: ['kn'],
              textContent: 'from langchain.tools import tool',
            }),
          },
        ],
      };

      highlightUnstyledCodeBlocks(mockDoc);
    });
  });

  describe('applyThemeToDoc', () => {
    it('injects dark mode stylesheet containing code syntax rules without obliterating spans', () => {
      const createdStyles = [];
      const mockHead = {
        appendChild: (el) => createdStyles.push(el),
      };
      const mockDoc = {
        head: mockHead,
        getElementById: () => null,
        createElement: (tag) => {
          const el = { tagName: tag, id: '', textContent: '' };
          return el;
        },
        querySelectorAll: () => [],
        documentElement: { style: { setProperty: () => {} } },
        body: {
          style: { setProperty: () => {} },
          classList: { remove: () => {}, add: () => {} },
        },
      };

      applyThemeToDoc(mockDoc, 'dark');

      expect(createdStyles.length).toBe(1);
      const css = createdStyles[0].textContent;

      // Crucial: check that `span` and `code` are NOT unconditionally forced to `color: #e2e8f0 !important`
      expect(css).not.toMatch(/span\s*,\s*li.*pre\s*,\s*code\s*\{\s*color:\s*#e2e8f0\s*!important/);

      // Check dark mode syntax highlighting rules are present
      expect(css).toContain('code.kn');
      expect(css).toContain('#38bdf8 !important'); // keywords
      expect(css).toContain('code.nn');
      expect(css).toContain('#67e8f9 !important'); // namespaces
      expect(css).toContain('code.nf');
      expect(css).toContain('#c084fc !important'); // functions
      expect(css).toContain('code.s1');
      expect(css).toContain('#fb923c !important'); // strings
      expect(css).toContain('code.c1');
      expect(css).toContain('#94a3b8 !important'); // comments
      expect(css).toContain('code.p');
      expect(css).toContain('#cbd5e1 !important'); // punctuation
    });

    it('injects light mode stylesheet allowing author CSS colors to display freely', () => {
      let createdStyle = null;
      const mockDoc = {
        head: { appendChild: (el) => { createdStyle = el; } },
        getElementById: () => null,
        createElement: () => ({ tagName: 'style', id: '', textContent: '' }),
        querySelectorAll: () => [],
        documentElement: { style: { setProperty: () => {} } },
        body: {
          style: { setProperty: () => {} },
          classList: { remove: () => {}, add: () => {} },
        },
      };

      applyThemeToDoc(mockDoc, 'light');

      const css = createdStyle.textContent;

      // In light mode, span and code must NOT be forced to #1e293b !important
      expect(css).not.toContain('span, li, blockquote, dd, dt, article, section, label, header, footer, nav, table, tbody, thead, tr, td, th, caption, pre, code');
      expect(css).not.toContain('code.kn, code.k, code.kd, code.kp, code.kr, code.kt, span.kn, span.k, span.kd, span.kp, span.kr, span.kt {\n      color: #0284c7 !important;');

      // Background color is white
      expect(css).toContain(`background-color: ${EPUB_THEMES.light.bg} !important`);
    });

    it('adapts inline colors in dark mode and restores them in light mode', () => {
      const mockElement = {
        style: {
          color: 'rgb(0, 102, 153)', // dark teal #006699
          setProperty(prop, val) { this[prop] = val; },
          removeProperty(prop) { delete this[prop]; },
        },
        getAttribute: () => null,
        dataset: {},
      };

      const mockDoc = {
        head: { appendChild: () => {} },
        getElementById: () => null,
        createElement: () => ({ tagName: 'style', id: '', textContent: '' }),
        querySelectorAll: (selector) => {
          if (selector.includes('[style*="color"]') || selector.includes('[data-orig-color]')) {
            return [mockElement];
          }
          return [];
        },
        documentElement: { style: { setProperty: () => {} } },
        body: {
          style: { setProperty: () => {} },
          classList: { remove: () => {}, add: () => {} },
        },
      };

      // Apply dark mode: should save original color and boost lightness
      applyThemeToDoc(mockDoc, 'dark');
      expect(mockElement.dataset.origColor).toBe('rgb(0, 102, 153)');
      expect(mockElement.style.color).toMatch(/hsl\(200,\s*100%,\s*65%\)/);

      // Apply light mode: should restore original color
      applyThemeToDoc(mockDoc, 'light');
      expect(mockElement.dataset.origColor).toBeUndefined();
      expect(mockElement.style.color).toBe('rgb(0, 102, 153)');
    });
  });
});
