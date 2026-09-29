import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../i18n';
import { useZoomControls } from '../hooks/useZoomControls';
import { usePageNavigation } from '../hooks/usePageNavigation';
import { usePdfSearch } from '../hooks/usePdfSearch';
import { usePdfTts } from '../hooks/usePdfTts';
import { usePdfAnnotations } from '../hooks/usePdfAnnotations';
import ReaderToolbar from '../components/ReaderToolbar';
import ReaderLayout from '../components/ReaderLayout';

const wrapper = ({ children }) => <I18nProvider>{children}</I18nProvider>;

describe('Viewer Sub-System Hooks', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ status: 'ok', annotations: [], progress: {} }),
    }));
    vi.stubGlobal('speechSynthesis', {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
      onvoiceschanged: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  describe('useZoomControls', () => {
    it('initializes scale from book progress zoom or defaults to 1.2', () => {
      const { result: res1 } = renderHook(() =>
        useZoomControls({ book: { progress: { zoom: 1.5 } } })
      );
      expect(res1.current.scale).toBe(1.5);

      const { result: res2 } = renderHook(() =>
        useZoomControls({ book: null })
      );
      expect(res2.current.scale).toBe(1.2);
    });

    it('zooms in, zooms out, and resets zoom correctly', () => {
      const { result } = renderHook(() =>
        useZoomControls({ book: { progress: { zoom: 1.0 } } })
      );

      act(() => {
        result.current.handleZoomIn();
      });
      expect(result.current.scale).toBeCloseTo(1.15, 2);

      act(() => {
        result.current.handleZoomOut();
      });
      expect(result.current.scale).toBeCloseTo(1.0, 2);

      act(() => {
        result.current.handleResetZoom();
      });
      expect(result.current.scale).toBe(1.2);
    });
  });

  describe('usePageNavigation', () => {
    it('initializes document and handles next/prev page navigation', () => {
      const { result } = renderHook(() =>
        usePageNavigation({
          book: { id: 1, progress: { page: 1 } },
          pdfDoc: null,
          containerRef: { current: null },
          pageRefsMap: { current: new Map() },
          scaleRef: { current: 1.0 },
          invertColorsRef: { current: false },
          fitWidth: vi.fn(),
        })
      );

      act(() => {
        result.current.initializeDocument(10, 1);
      });

      expect(result.current.totalPages).toBe(10);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.hasPrev).toBe(false);
      expect(result.current.hasNext).toBe(true);

      act(() => {
        result.current.goToNextPage();
      });

      expect(result.current.currentPage).toBe(2);
      expect(result.current.hasPrev).toBe(true);

      act(() => {
        result.current.goToPrevPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('toggles dual-page mode and dual-cover standalone', () => {
      const mockFitWidth = vi.fn();
      const { result } = renderHook(() =>
        usePageNavigation({
          book: { id: 1, progress: { page: 1 } },
          pdfDoc: null,
          containerRef: { current: null },
          pageRefsMap: { current: new Map() },
          fitWidth: mockFitWidth,
        })
      );

      act(() => {
        result.current.initializeDocument(10, 1);
      });

      const initialDual = result.current.isDualPage;
      act(() => {
        result.current.toggleDualPage();
      });
      expect(result.current.isDualPage).toBe(!initialDual);

      const initialCover = result.current.dualCoverStandalone;
      act(() => {
        result.current.toggleDualCover();
      });
      expect(result.current.dualCoverStandalone).toBe(!initialCover);
    });

    it('toggles continuous scroll mode', () => {
      const { result } = renderHook(() =>
        usePageNavigation({
          book: { id: 1, progress: { page: 1 } },
          pdfDoc: null,
          containerRef: { current: null },
          pageRefsMap: { current: new Map() },
          fitWidth: vi.fn(),
        })
      );

      const initialContinuous = result.current.isContinuous;
      act(() => {
        result.current.toggleScrollMode();
      });
      expect(result.current.isContinuous).toBe(!initialContinuous);
    });
  });

  describe('usePdfSearch', () => {
    it('opens and closes search, resetting state', () => {
      const mockEventBus = { on: vi.fn(), off: vi.fn(), dispatch: vi.fn() };
      const mockFindController = { executeCommand: vi.fn() };
      const mockShowHeader = vi.fn();

      const { result } = renderHook(() =>
        usePdfSearch({
          eventBus: mockEventBus,
          findController: mockFindController,
          showHeader: mockShowHeader,
        })
      );

      expect(result.current.searchOpen).toBe(false);

      act(() => {
        result.current.openSearch();
      });

      expect(result.current.searchOpen).toBe(true);
      expect(mockShowHeader).toHaveBeenCalled();

      act(() => {
        result.current.setSearchQuery('test query');
      });
      expect(result.current.searchQuery).toBe('test query');

      act(() => {
        result.current.handleCloseSearch();
      });

      expect(result.current.searchOpen).toBe(false);
      expect(mockEventBus.dispatch).toHaveBeenCalledWith('findbarclose', {});
    });

    it('executes search dispatch on eventBus for next and prev', () => {
      const mockEventBus = { on: vi.fn(), off: vi.fn(), dispatch: vi.fn() };
      const mockFindController = {};

      const { result } = renderHook(() =>
        usePdfSearch({
          eventBus: mockEventBus,
          findController: mockFindController,
        })
      );

      act(() => {
        result.current.setSearchQuery('hello');
      });

      act(() => {
        result.current.handleFindNext();
      });
      expect(mockEventBus.dispatch).toHaveBeenCalledWith('find', expect.objectContaining({
        type: 'again',
        query: 'hello',
        findPrevious: false,
      }));

      act(() => {
        result.current.handleFindPrev();
      });
      expect(mockEventBus.dispatch).toHaveBeenCalledWith('find', expect.objectContaining({
        type: 'again',
        query: 'hello',
        findPrevious: true,
      }));
    });
  });

  describe('usePdfTts', () => {
    it('initializes inactive and toggles selection read aloud', () => {
      const { result } = renderHook(() =>
        usePdfTts({
          pdfDoc: null,
          currentPage: 1,
          isDualPage: false,
          spread: { left: 1, right: null },
        }),
        { wrapper }
      );

      expect(result.current.ttsOpen).toBe(false);

      act(() => {
        result.current.handleReadSelection('Selected text for read aloud');
      });
      expect(result.current.ttsOpen).toBe(true);
      expect(result.current.ttsText).toBe('Selected text for read aloud');

      act(() => {
        result.current.setTtsOpen(false);
      });
      expect(result.current.ttsOpen).toBe(false);
    });
  });

  describe('usePdfAnnotations', () => {
    it('manages context menu selection and comments drawer', async () => {
      const { result } = renderHook(() =>
        usePdfAnnotations({ bookId: 42 })
      );
      await act(async () => {});

      expect(result.current.selectionMenu.isOpen).toBe(false);
      expect(result.current.commentsDrawerOpen).toBe(false);

      act(() => {
        result.current.setSelectionMenu({
          isOpen: true,
          x: 100,
          y: 200,
          text: 'Highlighted phrase',
          rects: [],
          page: 3,
        });
      });

      expect(result.current.selectionMenu.isOpen).toBe(true);
      expect(result.current.selectionMenu.text).toBe('Highlighted phrase');

      act(() => {
        result.current.setSelectionMenu(prev => ({ ...prev, isOpen: false }));
      });
      expect(result.current.selectionMenu.isOpen).toBe(false);

      act(() => {
        result.current.setCommentsDrawerOpen(true);
      });
      expect(result.current.commentsDrawerOpen).toBe(true);
    });
  });
});

describe('Reader Sub-System Isolated Components', () => {
  it('renders ReaderToolbar with title and buttons', () => {
    const onClose = vi.fn();
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();

    render(
      <I18nProvider>
        <ReaderToolbar
          book={{ title: 'Test Book Title', shelf_display: 'Shelf A', size_formatted: '2 MB' }}
          format="pdf"
          onClose={onClose}
          isHeaderShowing={true}
          headerPinned={true}
          currentPage={3}
          totalPages={10}
          pageInput="3"
          progressPercent={30}
          handleZoomIn={onZoomIn}
          handleZoomOut={onZoomOut}
          annotationsCount={2}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Test Book Title')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();

    const zoomInBtn = screen.getByTitle(/Zoom In/i);
    fireEvent.click(zoomInBtn);
    expect(onZoomIn).toHaveBeenCalledTimes(1);

    const backBtn = screen.getByTitle(/Back to library/i);
    fireEvent.click(backBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders ReaderLayout container with children', () => {
    const { container } = render(
      <I18nProvider>
        <ReaderLayout
          isDarkMode={false}
          isDualPage={false}
          isContinuous={false}
          scrollMode="flip"
          hasPrev={false}
          hasNext={true}
          totalPages={10}
        >
          <div data-testid="test-content">Page Content</div>
        </ReaderLayout>
      </I18nProvider>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(container.querySelector('.relative')).toBeInTheDocument();
  });
});
