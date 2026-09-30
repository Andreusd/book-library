import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getBookOriginRect } from '../utils/bookTransition';

/**
 * ReaderTransition component provides smooth zoom-in and zoom-out transitions
 * between book cards on the library shelf and the full-screen reader.
 *
 * Supports:
 * - Zoom in from selected book card bounding box to fullscreen
 * - Zoom out from fullscreen back into the book card position on exit
 * - Handling exit from inside the reader (back button, Escape key)
 * - Handling exit from browser navigation (Back button)
 * - Morphing book cover crossfade overlay during animation
 * - Graceful fallback to centered zoom when book is not currently in viewport
 * - Respects library animation setting (`enabled`) and prefers-reduced-motion
 */
export default function ReaderTransition({
  book,
  enabled = true,
  onClose,
  onTransitionStateChange,
  children,
}) {
  const [displayBook, setDisplayBook] = useState(book);
  const [prevBook, setPrevBook] = useState(book);
  const [isExpanded, setIsExpanded] = useState(() => !enabled);
  const [isClosing, setIsClosing] = useState(false);
  const [isFullyOpen, setIsFullyOpen] = useState(() => !enabled);
  const [rect, setRect] = useState(() => {
    return book?._originRect || (book?.id ? getBookOriginRect(book.id) : null);
  });

  const prevBookIdRef = useRef(null);
  const apertureRef = useRef(null);

  const isAnimationDisabled = !enabled;

  // Adjust state during render when `book` prop changes (React recommended pattern)
  if (book !== prevBook) {
    setPrevBook(book);
    if (book) {
      setDisplayBook(book);
      setIsClosing(false);
      setIsFullyOpen(isAnimationDisabled);
      setIsExpanded(isAnimationDisabled);
      setRect(book._originRect || getBookOriginRect(book.id));
    } else if (displayBook) {
      if (isAnimationDisabled) {
        setDisplayBook(null);
        setIsClosing(false);
      } else {
        setIsClosing(true);
        setIsExpanded(false);
        setIsFullyOpen(false);
      }
    }
  }

  // Request close transition
  const handleClose = useCallback(() => {
    if (isAnimationDisabled) {
      setDisplayBook(null);
      setIsClosing(false);
      if (onClose) {
        onClose();
      }
      return;
    }
    setIsClosing((prev) => {
      if (prev) return true;
      if (displayBook?.id) {
        const freshRect = getBookOriginRect(displayBook.id);
        if (freshRect) {
          setRect(freshRect);
        }
      }
      setIsExpanded(false);
      setIsFullyOpen(false);
      return true;
    });
  }, [displayBook, isAnimationDisabled, onClose]);

  // Synchronize opening animation only when a new book ID is mounted
  const currentBookId = book?.id;
  useEffect(() => {
    if (currentBookId && currentBookId !== prevBookIdRef.current) {
      prevBookIdRef.current = currentBookId;

      if (!isAnimationDisabled) {
        let openTimer;
        // Force synchronous layout recalculation so Firefox flushes initial contracted dimensions
        if (apertureRef.current) {
          void apertureRef.current.offsetHeight;
        }
        // Double rAF ensures the browser paints initial contracted dimensions first
        const frame = requestAnimationFrame(() => {
          if (apertureRef.current) {
            void apertureRef.current.offsetHeight;
          }
          requestAnimationFrame(() => {
            setIsExpanded(true);
            openTimer = setTimeout(() => {
              setIsFullyOpen(true);
            }, 340);
          });
        });
        return () => {
          cancelAnimationFrame(frame);
          if (openTimer) clearTimeout(openTimer);
        };
      }
    } else if (!currentBookId) {
      prevBookIdRef.current = null;
    }
  }, [currentBookId, isAnimationDisabled]);

  // Execute closing animation timer & completion
  useEffect(() => {
    if (isClosing) {
      const timer = setTimeout(() => {
        setDisplayBook(null);
        setIsClosing(false);
        if (onClose) {
          onClose();
        }
      }, 340);

      return () => clearTimeout(timer);
    }
  }, [isClosing, onClose]);

  // Notify parent of active transition state
  useEffect(() => {
    if (onTransitionStateChange) {
      onTransitionStateChange(Boolean(displayBook));
    }
  }, [displayBook, onTransitionStateChange]);

  if (!displayBook) {
    return null;
  }

  const currentRect = rect || {
    top: typeof window !== 'undefined' ? Math.round((window.innerHeight - 260) / 2) : 100,
    left: typeof window !== 'undefined' ? Math.round((window.innerWidth - 180) / 2) : 100,
    width: 180,
    height: 260,
  };

  return (
    <>
      {/* Dimmed backdrop theater overlay */}
      <div
        data-testid="reader-transition-backdrop"
        className={`fixed inset-0 bg-neutral-950/85 backdrop-blur-sm z-50 pointer-events-none ${
          isAnimationDisabled ? '' : 'transition-opacity duration-300'
        }`}
        style={{
          opacity: isExpanded ? 1 : 0,
        }}
      />

      {/* Morphing zoom container (aperture) */}
      <div
        ref={apertureRef}
        data-testid="reader-zoom-aperture"
        className={`fixed z-50 overflow-hidden shadow-2xl ${
          isAnimationDisabled ? '' : 'book-zoom-aperture'
        }`}
        style={{
          top: isAnimationDisabled || isExpanded ? 0 : `${currentRect.top}px`,
          left: isAnimationDisabled || isExpanded ? 0 : `${currentRect.left}px`,
          width: isAnimationDisabled || isExpanded ? '100vw' : `${currentRect.width}px`,
          height: isAnimationDisabled || isExpanded ? '100vh' : `${currentRect.height}px`,
          borderRadius: isAnimationDisabled || isExpanded ? '0px' : '8px',
          boxShadow: isAnimationDisabled || isExpanded ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          transform: 'translateZ(0)',
          transition: isAnimationDisabled
            ? 'none'
            : 'top 340ms cubic-bezier(0.16, 1, 0.3, 1), left 340ms cubic-bezier(0.16, 1, 0.3, 1), width 340ms cubic-bezier(0.16, 1, 0.3, 1), height 340ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 340ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 340ms ease',
          willChange: isAnimationDisabled ? 'auto' : 'top, left, width, height, border-radius',
        }}
      >
        {/* Book Cover Morphing Layer - only rendered during transitions when animations are enabled */}
        {!isAnimationDisabled && (!isFullyOpen || isClosing) && (
          <div
            data-testid="reader-zoom-cover"
            className="absolute inset-0 z-20 pointer-events-none overflow-hidden select-none"
            style={{
              opacity: isExpanded ? 0 : 1,
              transition: isExpanded
                ? 'opacity 180ms ease 120ms'
                : 'opacity 160ms ease 0ms',
            }}
          >
            {displayBook.cover_url ? (
              <img
                src={displayBook.cover_url}
                alt={displayBook.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 p-4 flex flex-col justify-between border-l-4 border-amber-600">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-500/80">
                  {displayBook.shelf_display || displayBook.folder_display}
                </span>
                <p className="text-xs font-bold text-neutral-200 line-clamp-4 leading-snug">
                  {displayBook.title}
                </p>
                <span className="text-[10px] text-neutral-500">{displayBook.size_formatted}</span>
              </div>
            )}
            <div className="absolute inset-y-0 left-0 w-6 book-spine-highlight pointer-events-none" />
          </div>
        )}

        {/* Reader Fullscreen View Layer, pinned to screen (0, 0) */}
        <div
          data-testid="reader-zoom-content"
          className="absolute w-screen h-screen overflow-hidden"
          style={{
            top: isAnimationDisabled || isExpanded ? 0 : `-${currentRect.top}px`,
            left: isAnimationDisabled || isExpanded ? 0 : `-${currentRect.left}px`,
            opacity: isAnimationDisabled || isExpanded ? 1 : 0,
            transition: isAnimationDisabled
              ? 'none'
              : isExpanded
                ? 'top 340ms cubic-bezier(0.16, 1, 0.3, 1), left 340ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease 100ms'
                : 'top 340ms cubic-bezier(0.16, 1, 0.3, 1), left 340ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease 0ms',
            pointerEvents: isAnimationDisabled || (isExpanded && !isClosing) ? 'auto' : 'none',
          }}
        >
          {typeof children === 'function' ? children(displayBook, handleClose) : children}
        </div>
      </div>
    </>
  );
}
