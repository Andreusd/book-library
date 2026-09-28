/**
 * PdfTextHighlighter integrates PDF.js TextLayer with PDFFindController,
 * highlighting matched search terms in the DOM and scrolling active matches into view.
 */
export class PdfTextHighlighter {
  constructor({ findController, eventBus, pageIndex }) {
    this.findController = findController;
    this.matches = [];
    this.eventBus = eventBus;
    this.pageIdx = pageIndex;
    this.textDivs = null;
    this.textContentItemsStr = null;
    this.enabled = false;
    this._listener = null;
  }

  setTextMapping(divs, texts) {
    this.textDivs = divs;
    this.textContentItemsStr = texts;
  }

  enable() {
    if (!this.textDivs || !this.textContentItemsStr) return;
    if (this.enabled) return;
    this.enabled = true;

    if (!this._listener && this.eventBus) {
      this._listener = (evt) => {
        if (evt.pageIndex === this.pageIdx || evt.pageIndex === -1) {
          this._updateMatches();
        }
      };
      this.eventBus.on('updatetextlayermatches', this._listener);
    }
    this._updateMatches();
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    if (this._listener && this.eventBus) {
      this.eventBus.off('updatetextlayermatches', this._listener);
      this._listener = null;
    }
    this._updateMatches(true);
  }

  _convertMatches(matches, matchesLength) {
    if (!matches || !this.textContentItemsStr) return [];
    const textContentItemsStr = this.textContentItemsStr;
    let i = 0;
    let iIndex = 0;
    const end = textContentItemsStr.length - 1;
    const result = [];

    for (let m = 0, mm = matches.length; m < mm; m++) {
      let matchIdx = matches[m];
      while (i !== end && matchIdx >= iIndex + textContentItemsStr[i].length) {
        iIndex += textContentItemsStr[i].length;
        i++;
      }
      if (i === textContentItemsStr.length) continue;

      const match = {
        begin: {
          divIdx: i,
          offset: matchIdx - iIndex,
        },
      };

      matchIdx += matchesLength[m];
      while (i !== end && matchIdx > iIndex + textContentItemsStr[i].length) {
        iIndex += textContentItemsStr[i].length;
        i++;
      }
      match.end = {
        divIdx: i,
        offset: matchIdx - iIndex,
      };
      result.push(match);
    }
    return result;
  }

  _renderMatches(matches) {
    if (!matches || matches.length === 0) return;
    const { findController, pageIdx, textContentItemsStr, textDivs } = this;
    if (!textDivs || !textContentItemsStr) return;

    const isSelectedPage = pageIdx === findController.selected.pageIdx;
    const selectedMatchIdx = findController.selected.matchIdx;
    const highlightAll = findController.state?.highlightAll ?? true;
    let prevEnd = null;
    const infinity = { divIdx: -1, offset: undefined };

    function beginText(begin, className) {
      const divIdx = begin.divIdx;
      if (!textDivs[divIdx]) return null;
      textDivs[divIdx].textContent = '';
      return appendTextToDiv(divIdx, 0, begin.offset, className);
    }

    function appendTextToDiv(divIdx, fromOffset, toOffset, className) {
      let div = textDivs[divIdx];
      if (!div) return null;
      if (div.nodeType === Node.TEXT_NODE) {
        const span = document.createElement('span');
        div.before(span);
        span.append(div);
        textDivs[divIdx] = span;
        div = span;
      }
      const rawText = textContentItemsStr[divIdx] || '';
      const content = rawText.substring(fromOffset, toOffset);
      const node = document.createTextNode(content);

      if (className) {
        const span = document.createElement('span');
        span.className = `${className} appended`;
        span.append(node);
        div.append(span);
        if (className.includes('selected')) {
          return span;
        }
        return null;
      }
      div.append(node);
      return null;
    }

    let i0 = selectedMatchIdx;
    let i1 = i0 + 1;
    if (highlightAll) {
      i0 = 0;
      i1 = matches.length;
    } else if (!isSelectedPage) {
      return;
    }

    let lastDivIdx = -1;
    let lastOffset = -1;

    for (let i = i0; i < i1; i++) {
      const match = matches[i];
      if (!match) continue;
      const begin = match.begin;
      if (begin.divIdx === lastDivIdx && begin.offset === lastOffset) {
        continue;
      }
      lastDivIdx = begin.divIdx;
      lastOffset = begin.offset;
      const end = match.end;
      const isSelected = isSelectedPage && i === selectedMatchIdx;
      const highlightSuffix = isSelected ? ' selected' : '';
      let selectedSpan = null;

      if (!prevEnd || begin.divIdx !== prevEnd.divIdx) {
        if (prevEnd !== null) {
          appendTextToDiv(prevEnd.divIdx, prevEnd.offset, infinity.offset);
        }
        beginText(begin);
      } else {
        appendTextToDiv(prevEnd.divIdx, prevEnd.offset, begin.offset);
      }

      if (begin.divIdx === end.divIdx) {
        selectedSpan = appendTextToDiv(begin.divIdx, begin.offset, end.offset, 'highlight' + highlightSuffix);
      } else {
        selectedSpan = appendTextToDiv(begin.divIdx, begin.offset, infinity.offset, 'highlight begin' + highlightSuffix);
        for (let n0 = begin.divIdx + 1, n1 = end.divIdx; n0 < n1; n0++) {
          if (textDivs[n0]) {
            textDivs[n0].className = 'highlight middle' + highlightSuffix;
          }
        }
        beginText(end, 'highlight end' + highlightSuffix);
      }
      prevEnd = end;

      if (isSelected && selectedSpan) {
        findController.scrollMatchIntoView({
          element: selectedSpan,
          pageIndex: pageIdx,
          matchIndex: selectedMatchIdx,
        });
      }
    }

    if (prevEnd) {
      appendTextToDiv(prevEnd.divIdx, prevEnd.offset, infinity.offset);
    }
  }

  _updateMatches(reset = false) {
    if (!this.enabled && !reset) return;
    const { findController, matches, pageIdx, textContentItemsStr, textDivs } = this;
    if (!textDivs || !textContentItemsStr) return;

    let clearedUntilDivIdx = -1;
    for (const match of matches) {
      const begin = Math.max(clearedUntilDivIdx, match.begin.divIdx);
      for (let n = begin, end = match.end.divIdx; n <= end; n++) {
        const div = textDivs[n];
        if (div && textContentItemsStr[n] !== undefined) {
          div.textContent = textContentItemsStr[n];
          div.className = '';
        }
      }
      clearedUntilDivIdx = match.end.divIdx + 1;
    }

    if (!findController?.highlightMatches || reset) {
      this.matches = [];
      return;
    }

    const pageMatches = findController.pageMatches?.[pageIdx] || null;
    const pageMatchesLength = findController.pageMatchesLength?.[pageIdx] || null;
    this.matches = this._convertMatches(pageMatches, pageMatchesLength);
    this._renderMatches(this.matches);
  }
}
