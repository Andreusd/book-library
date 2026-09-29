import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShelfIcon from '../components/ShelfIcon';
import FolderCard from '../components/FolderCard';
import Reader from '../components/Reader';
import { I18nProvider } from '../i18n';

// Mock EpubViewer and PdfViewer to test Reader format routing cleanly
vi.mock('../components/EpubViewer', () => ({
  default: (props) => (
    <div data-testid="mock-epub-viewer">
      <span>EPUB: {props.book?.title}</span>
      <span>Extension: {String(props.showFileExtension)}</span>
    </div>
  ),
}));

vi.mock('../components/PdfViewer', () => ({
  default: (props) => (
    <div data-testid="mock-pdf-viewer">
      <span>PDF: {props.book?.title}</span>
      <span>Extension: {String(props.showFileExtension)}</span>
    </div>
  ),
}));

describe('ShelfIcon component', () => {
  it('renders standard icon from ICON_MAP', () => {
    const { container } = render(<ShelfIcon icon="Brain" className="test-brain-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('test-brain-class');
  });

  it('falls back to default Folder icon for unknown icon name', () => {
    const { container } = render(<ShelfIcon icon="NonExistentIconName123" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

describe('FolderCard component', () => {
  const mockFolder = {
    id: 'Science-Fiction',
    name: 'Science Fiction',
    icon: 'Rocket',
    book_count: 5,
  };

  const renderFolderCard = (props = {}) => {
    return render(
      <I18nProvider>
        <FolderCard folder={mockFolder} {...props} />
      </I18nProvider>
    );
  };

  it('renders folder name and book count', () => {
    renderFolderCard({ covers: ['/cover1.webp'] });
    expect(screen.getByText('Science Fiction')).toBeInTheDocument();
    expect(screen.getByText(/5 books/i)).toBeInTheDocument();
  });

  it('renders empty state placeholder when no covers available', () => {
    renderFolderCard({ covers: [] });
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('renders single cover correctly', () => {
    const { container } = renderFolderCard({ covers: ['/cover1.webp'] });
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', '/cover1.webp');
  });

  it('renders multiple stacked covers for 2 and 3+ books', () => {
    const { container: container2 } = renderFolderCard({ covers: ['/c1.webp', '/c2.webp'] });
    expect(container2.querySelectorAll('img')).toHaveLength(2);

    const { container: container3 } = renderFolderCard({ covers: ['/c1.webp', '/c2.webp', '/c3.webp'] });
    expect(container3.querySelectorAll('img')).toHaveLength(3);
  });

  it('triggers onSelectFolder callback on click', () => {
    const onSelect = vi.fn();
    renderFolderCard({ onSelectFolder: onSelect, covers: [] });

    fireEvent.click(screen.getByText('Science Fiction'));
    expect(onSelect).toHaveBeenCalledWith('Science-Fiction');
  });

  it('triggers onContextMenu callback on right-click', () => {
    const onContextMenu = vi.fn();
    renderFolderCard({ onContextMenu, covers: [] });

    fireEvent.contextMenu(screen.getByText('Science Fiction'));
    expect(onContextMenu).toHaveBeenCalled();
  });
});

describe('Reader component format routing', () => {
  it('routes to EpubViewer when book format is epub', async () => {
    const epubBook = {
      id: 'book_epub',
      title: 'Foundation',
      format: 'epub',
      path: '/books/foundation.epub',
    };

    render(<Reader book={epubBook} showFileExtension={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-epub-viewer')).toBeInTheDocument();
    });
    expect(screen.getByText('EPUB: Foundation')).toBeInTheDocument();
    expect(screen.getByText('Extension: true')).toBeInTheDocument();
  });

  it('routes to PdfViewer when book format is pdf', async () => {
    const pdfBook = {
      id: 'book_pdf',
      title: 'Clean Code',
      format: 'pdf',
      path: '/books/clean_code.pdf',
    };

    render(<Reader book={pdfBook} showFileExtension={false} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-pdf-viewer')).toBeInTheDocument();
    });
    expect(screen.getByText('PDF: Clean Code')).toBeInTheDocument();
    expect(screen.getByText('Extension: false')).toBeInTheDocument();
  });
});
