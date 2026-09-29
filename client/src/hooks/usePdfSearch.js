import { useState, useEffect, useRef, useCallback } from 'react';
// PDF.js FindState constants
export const FindState = {
  FOUND: 0,
  NOT_FOUND: 1,
  WRAPPED: 2,
  PENDING: 3,
};

/**
 * Custom hook to manage PDF in-document search using PDF.js EventBus and FindController.
 */
export function usePdfSearch({ eventBus, findController, showHeader }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchesCount, setMatchesCount] = useState({ current: 0, total: 0 });
  const [isSearching, setIsSearching] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [entireWord, setEntireWord] = useState(false);

  const eventBusRef = useRef(eventBus);
  const findControllerRef = useRef(findController);
  const searchOpenRef = useRef(searchOpen);

  useEffect(() => {
    eventBusRef.current = eventBus;
  }, [eventBus]);

  useEffect(() => {
    findControllerRef.current = findController;
  }, [findController]);

  useEffect(() => {
    searchOpenRef.current = searchOpen;
  }, [searchOpen]);

  // Handle EventBus find events
  useEffect(() => {
    const bus = eventBusRef.current;
    if (!bus) return;

    const handleMatchesCount = ({ matchesCount: count }) => {
      if (count) {
        setMatchesCount({
          current: count.current || 0,
          total: count.total || 0,
        });
      }
    };

    const handleFindControlState = ({ state, matchesCount: count }) => {
      if (state === FindState.PENDING) {
        setIsSearching(true);
      } else {
        setIsSearching(false);
      }
      if (count) {
        setMatchesCount({
          current: count.current || 0,
          total: count.total || 0,
        });
      }
    };

    bus.on('updatefindmatchescount', handleMatchesCount);
    bus.on('updatefindcontrolstate', handleFindControlState);

    return () => {
      bus.off('updatefindmatchescount', handleMatchesCount);
      bus.off('updatefindcontrolstate', handleFindControlState);
    };
  }, []);

  const executePdfSearch = useCallback((query, { findPrevious = false, again = false, caseSensitiveVal, entireWordVal } = {}) => {
    const bus = eventBusRef.current;
    if (!bus) return;
    const cs = caseSensitiveVal !== undefined ? caseSensitiveVal : caseSensitive;
    const ew = entireWordVal !== undefined ? entireWordVal : entireWord;

    if (!query || query.trim() === '') {
      bus.dispatch('findbarclose', {});
      setMatchesCount({ current: 0, total: 0 });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    bus.dispatch('find', {
      type: again ? 'again' : '',
      query: query.trim(),
      caseSensitive: cs,
      entireWord: ew,
      highlightAll: true,
      findPrevious,
    });
  }, [caseSensitive, entireWord]);

  const handleFindNext = useCallback(() => {
    if (!searchQuery) return;
    executePdfSearch(searchQuery, { again: true, findPrevious: false });
  }, [searchQuery, executePdfSearch]);

  const handleFindPrev = useCallback(() => {
    if (!searchQuery) return;
    executePdfSearch(searchQuery, { again: true, findPrevious: true });
  }, [searchQuery, executePdfSearch]);

  const handleSearchQueryChange = useCallback((newQuery) => {
    setSearchQuery(newQuery);
    executePdfSearch(newQuery, { again: false });
  }, [executePdfSearch]);

  const handleToggleCaseSensitive = useCallback(() => {
    setCaseSensitive(prev => {
      const next = !prev;
      if (searchQuery) {
        executePdfSearch(searchQuery, { again: false, caseSensitiveVal: next });
      }
      return next;
    });
  }, [searchQuery, executePdfSearch]);

  const handleToggleEntireWord = useCallback(() => {
    setEntireWord(prev => {
      const next = !prev;
      if (searchQuery) {
        executePdfSearch(searchQuery, { again: false, entireWordVal: next });
      }
      return next;
    });
  }, [searchQuery, executePdfSearch]);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
    if (eventBusRef.current) {
      eventBusRef.current.dispatch('findbarclose', {});
    }
    setMatchesCount({ current: 0, total: 0 });
    setIsSearching(false);
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    if (showHeader) showHeader();
  }, [showHeader]);

  return {
    searchOpen,
    setSearchOpen,
    searchOpenRef,
    searchQuery,
    setSearchQuery,
    matchesCount,
    isSearching,
    caseSensitive,
    entireWord,
    openSearch,
    executePdfSearch,
    handleFindNext,
    handleFindPrev,
    handleSearchQueryChange,
    handleToggleCaseSensitive,
    handleToggleEntireWord,
    handleCloseSearch,
  };
}
