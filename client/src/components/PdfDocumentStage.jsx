import React from 'react';
import PdfPageView from './PdfPageView';

/**
 * Component rendering the visual stage of PDF document pages,
 * including continuous scroll (single and dual page spreads) and paged views.
 */
export default function PdfDocumentStage({
  nav,
  continuousPageSpacing,
  bookTextureEnabled,
  centerVertically,
  pageDimsMap,
  estimatedPageDims,
  visiblePageNumbers,
  pageRefsMap,
}) {
  const renderContinuousPage = (p, pageSide = 'single') => {
    const isVisible = visiblePageNumbers.has(p);
    const dims = pageDimsMap[p] || estimatedPageDims;
    return (
      <div
        key={p}
        id={`pdf-page-${p}`}
        data-page-number={p}
        ref={(el) => {
          if (el) pageRefsMap.current.set(p, el);
          else pageRefsMap.current.delete(p);
        }}
        style={{
          minHeight: dims.height ? `${dims.height}px` : `${estimatedPageDims.height}px`,
          width: dims.width ? `${dims.width}px` : `${estimatedPageDims.width}px`,
        }}
        className="pdf-page-container relative flex justify-center items-center select-text"
      >
        {isVisible ? (
          <PdfPageView
            pageNum={p}
            pageSide={pageSide}
            initialDims={dims}
          />
        ) : (
          <div 
            style={{ width: `${dims.width}px`, height: `${dims.height}px` }} 
            className="flex items-center justify-center text-xs text-neutral-600 font-mono"
          >
            {p}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-full flex justify-center items-start">
      {nav.isContinuous ? (
        nav.isDualPage ? (
          <div className={`w-full flex flex-col items-center ${continuousPageSpacing ? 'gap-6' : 'gap-0'} pb-24`}>
            {nav.allSpreads.map((sp) => (
              <div
                key={sp.currentBase}
                id={`pdf-spread-${sp.currentBase}`}
                className={`flex items-start justify-center ${bookTextureEnabled && sp.left && sp.right ? 'shadow-2xl' : 'shadow-md'}`}
              >
                {sp.left && renderContinuousPage(sp.left, sp.right ? 'left' : 'single')}
                {sp.right && renderContinuousPage(sp.right, sp.left ? 'right' : 'single')}
              </div>
            ))}
          </div>
        ) : (
          <div className={`w-full flex flex-col items-center ${continuousPageSpacing ? 'gap-6' : 'gap-0'} pb-24`}>
            {Array.from({ length: nav.totalPages }, (_, i) => i + 1).map((p) => (
              renderContinuousPage(p, 'single')
            ))}
          </div>
        )
      ) : nav.isDualPage ? (
        <div className={`flex items-start justify-center ${bookTextureEnabled ? 'shadow-2xl' : 'shadow-md'} ${centerVertically ? 'my-auto' : ''}`}>
          {nav.spread.left && (
            <PdfPageView
              key={`dual-left-${nav.spread.left}`}
              pageNum={nav.spread.left}
              pageSide={nav.spread.right ? 'left' : 'single'}
              initialDims={pageDimsMap[nav.spread.left] || estimatedPageDims}
            />
          )}
          {nav.spread.right && (
            <PdfPageView
              key={`dual-right-${nav.spread.right}`}
              pageNum={nav.spread.right}
              pageSide={nav.spread.left ? 'right' : 'single'}
              initialDims={pageDimsMap[nav.spread.right] || estimatedPageDims}
            />
          )}
        </div>
      ) : (
        <div className={`relative ${centerVertically ? 'my-auto' : ''}`}>
          <PdfPageView
            key={`single-${nav.currentPage}`}
            pageNum={nav.currentPage}
            pageSide="single"
            initialDims={pageDimsMap[nav.currentPage] || estimatedPageDims}
          />
        </div>
      )}
    </div>
  );
}
