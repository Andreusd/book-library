import { useState, useRef, useCallback } from 'react';

export function getSearchRegex(query, { caseSensitive, entireWord }) {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let pattern = escaped;
  if (entireWord) {
    try {
      return new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, `gu${caseSensitive ? '' : 'i'}`);
    } catch {
      pattern = `\\b${pattern}\\b`;
    }
  }
  return new RegExp(pattern, `g${caseSensitive ? '' : 'i'}`);
}

/**
 * Hook for full-text search across EPUB spine items using TreeWalker and CFI range generation.
 */
export function useEpubSearch({ bookRef, renditionRef }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIdx, setCurrentSearchIdx] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [entireWord, setEntireWord] = useState(false);

  const activeSearchIdRef = useRef(0);
  const activeSearchCfiRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const jumpToEpubMatch = useCallback(async (match) => {
    if (!match || !match.cfi || !renditionRef?.current) return;

    if (activeSearchCfiRef.current && renditionRef.current) {
      try {
        renditionRef.current.annotations.remove(activeSearchCfiRef.current, 'highlight');
      } catch {}
    }

    activeSearchCfiRef.current = match.cfi;

    try {
      await renditionRef.current.display(match.cfi);
      renditionRef.current.annotations.add(
        'highlight',
        match.cfi,
        { isSearchMatch: true },
        null,
        'epub-search-match-selected',
        { fill: '#f59e0b', 'fill-opacity': '0.6', 'mix-blend-mode': 'multiply' }
      );
    } catch (err) {
      console.warn('Error jumping to EPUB match:', err);
    }
  }, [renditionRef]);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
    activeSearchIdRef.current++;
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setIsSearching(false);
    setSearchResults([]);
    setCurrentSearchIdx(-1);
    if (activeSearchCfiRef.current && renditionRef?.current) {
      try {
        renditionRef.current.annotations.remove(activeSearchCfiRef.current, 'highlight');
      } catch {}
      activeSearchCfiRef.current = null;
    }
  }, [renditionRef]);

  const executeEpubSearch = useCallback(async (query, { caseSensitiveVal, entireWordVal } = {}) => {
    const cs = caseSensitiveVal !== undefined ? caseSensitiveVal : caseSensitive;
    const ew = entireWordVal !== undefined ? entireWordVal : entireWord;

    const searchId = ++activeSearchIdRef.current;

    // Clear previous highlights
    if (activeSearchCfiRef.current && renditionRef?.current) {
      try {
        renditionRef.current.annotations.remove(activeSearchCfiRef.current, 'highlight');
      } catch {}
      activeSearchCfiRef.current = null;
    }

    if (!query || query.trim() === '' || !bookRef?.current) {
      setSearchResults([]);
      setCurrentSearchIdx(-1);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setCurrentSearchIdx(-1);

    const spine = bookRef.current.spine;
    if (!spine || !spine.items || spine.items.length === 0) {
      setIsSearching(false);
      return;
    }

    const regex = getSearchRegex(query.trim(), { caseSensitive: cs, entireWord: ew });
    const matches = [];

    try {
      for (let i = 0; i < spine.items.length; i++) {
        if (activeSearchIdRef.current !== searchId) return;

        const section = spine.items[i];
        const wasLoaded = !!section.document;

        if (!wasLoaded) {
          try {
            await section.load(bookRef.current.load.bind(bookRef.current));
          } catch (loadErr) {
            console.warn('Could not load section for search:', section.href, loadErr);
            continue;
          }
        }

        if (activeSearchIdRef.current !== searchId) {
          if (!wasLoaded) section.unload();
          return;
        }

        if (section.document) {
          const treeWalker = document.createTreeWalker(section.document, NodeFilter.SHOW_TEXT, null, false);
          let textNode;
          const limit = 120;

          while ((textNode = treeWalker.nextNode())) {
            const textContent = textNode.textContent;
            if (!textContent) continue;

            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(textContent)) !== null) {
              const startPos = match.index;
              const matchLen = match[0].length;
              if (matchLen === 0) {
                regex.lastIndex++;
                continue;
              }

              try {
                const range = section.document.createRange();
                range.setStart(textNode, startPos);
                range.setEnd(textNode, startPos + matchLen);
                const cfi = section.cfiFromRange(range);

                let excerpt = '';
                if (textContent.length <= limit) {
                  excerpt = textContent.trim();
                } else {
                  const s = Math.max(0, startPos - Math.floor(limit / 2));
                  const e = Math.min(textContent.length, startPos + matchLen + Math.floor(limit / 2));
                  excerpt = (s > 0 ? '...' : '') + textContent.substring(s, e).trim() + (e < textContent.length ? '...' : '');
                }

                matches.push({
                  cfi,
                  excerpt,
                  sectionIndex: i,
                });
              } catch {
                // Ignore range creation errors on detached nodes
              }
            }
          }
        }

        if (!wasLoaded) {
          section.unload();
        }
      }

      if (activeSearchIdRef.current === searchId) {
        setSearchResults(matches);
        setIsSearching(false);
        if (matches.length > 0) {
          setCurrentSearchIdx(0);
          jumpToEpubMatch(matches[0]);
        }
      }
    } catch (err) {
      console.error('EPUB search error:', err);
      if (activeSearchIdRef.current === searchId) {
        setIsSearching(false);
      }
    }
  }, [bookRef, caseSensitive, entireWord, jumpToEpubMatch, renditionRef]);

  const handleFindNext = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
      executeEpubSearch(searchQuery);
      return;
    }
    if (searchResults.length === 0) return;
    const nextIdx = (currentSearchIdx + 1) % searchResults.length;
    setCurrentSearchIdx(nextIdx);
    jumpToEpubMatch(searchResults[nextIdx]);
  }, [searchResults, currentSearchIdx, jumpToEpubMatch, searchQuery, executeEpubSearch]);

  const handleFindPrev = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
      executeEpubSearch(searchQuery);
      return;
    }
    if (searchResults.length === 0) return;
    const prevIdx = (currentSearchIdx - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIdx(prevIdx);
    jumpToEpubMatch(searchResults[prevIdx]);
  }, [searchResults, currentSearchIdx, jumpToEpubMatch, searchQuery, executeEpubSearch]);

  const handleSearchQueryChange = useCallback((newQuery) => {
    setSearchQuery(newQuery);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (!newQuery || newQuery.trim() === '') {
      handleCloseSearch();
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      executeEpubSearch(newQuery);
    }, 250);
  }, [executeEpubSearch, handleCloseSearch]);

  const handleToggleCaseSensitive = useCallback(() => {
    setCaseSensitive(prev => {
      const next = !prev;
      if (searchQuery.trim()) {
        executeEpubSearch(searchQuery, { caseSensitiveVal: next });
      }
      return next;
    });
  }, [searchQuery, executeEpubSearch]);

  const handleToggleEntireWord = useCallback(() => {
    setEntireWord(prev => {
      const next = !prev;
      if (searchQuery.trim()) {
        executeEpubSearch(searchQuery, { entireWordVal: next });
      }
      return next;
    });
  }, [searchQuery, executeEpubSearch]);

  return {
    searchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    currentSearchIdx,
    isSearching,
    caseSensitive,
    entireWord,
    activeSearchCfiRef,
    jumpToEpubMatch,
    handleCloseSearch,
    executeEpubSearch,
    handleFindNext,
    handleFindPrev,
    handleSearchQueryChange,
    handleToggleCaseSensitive,
    handleToggleEntireWord,
  };
}
