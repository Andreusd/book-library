import React, { createContext, useContext, useState, useEffect } from 'react';

export const translations = {
  en: {
    // Sidebar
    appTitle: 'Digital Bookshelf',
    shelfCount: '{books} books • {shelves} shelves',
    filterShelvesPlaceholder: 'Filter shelves...',
    allShelves: 'All Shelves',
    categories: 'Categories ({count})',
    oneDriveSafe: 'OneDrive Protected (Read-Only)',
    customNameNotice: 'Custom display name in app',
    oneDriveFolderLabel: 'OneDrive Folder: {folder}',
    toggleSidebar: 'Toggle menu (Ctrl+B)',
    collapseSidebar: 'Collapse menu (Ctrl+B)',
    expandSidebar: 'Expand menu (Ctrl+B)',

    // Header & Navigation
    searchPlaceholder: "Search books by title... (Press '/' to search)",
    sortNameAsc: 'Name (A-Z)',
    sortNameDesc: 'Name (Z-A)',
    sortSizeDesc: 'Largest Size',
    sortRecent: 'Recently Read',
    fullLibrary: 'Full Library',
    booksInShelf: '{count} books in this shelf',
    searchResults: 'Results for "{query}" ({count} books found)',

    // Continue Reading
    continueReading: 'Continue Reading',
    booksInProgress: '({count} books in progress)',
    pageOf: 'Page {page} of {total}',

    // Book Card
    completed: 'Completed',
    pageBadge: 'p. {page}',
    readButton: 'Read',
    openInSystemTitle: 'Open in Windows default app (Firefox, Acrobat)',

    // Empty state
    noBooksFound: 'No books found',
    noBooksDesc: "We couldn't find any books matching your search or in this category.",
    clearSearch: 'Clear search',

    // Reader
    backToLibrary: 'Library',
    backToLibraryTitle: 'Back to library (Esc)',
    prevPageTitle: 'Previous page (Left arrow)',
    nextPageTitle: 'Next page (Right arrow)',
    fitWidth: 'Fit Width',
    zoomInTitle: 'Zoom In (+)',
    zoomOutTitle: 'Zoom Out (-)',
    nightModeTitle: 'Night Reading Mode (Invert PDF colors)',
    openInWindowsTitle: 'Open in Windows default viewer (Firefox, Acrobat, etc.)',
    fullscreenTitle: 'Toggle Fullscreen',
    loadingBook: 'Loading book...',
    rendering: 'Rendering...',

    // Book Context Menu
    readNow: 'Read Now',
    openInWindowsApp: 'Open in Windows App',
    markNotStarted: 'Mark as Not Started',
    markCompleted: 'Mark as Completed',
    copyFilePath: 'Copy File Path',
    pathCopied: 'Path Copied!',

    // Shelf Context Menu & Modal
    folderLabel: 'Folder: {folder}',
    renameShelfVirtual: 'Rename Shelf (Virtual)',
    restoreOriginalName: 'Restore Original Name',
    renameModalTitle: 'Rename Shelf (Virtual)',
    realFolderPrefix: 'Real folder: ',
    renameDisclaimer: 'This name is only displayed inside the app. Real folders on OneDrive remain 100% untouched.',
    shelfNameLabel: 'Shelf Display Name:',
    renamePlaceholder: 'e.g. Advanced Algorithms',
    restoreOriginal: 'Restore Original',
    cancel: 'Cancel',
    saveName: 'Save Name',
  },
  pt: {
    // Sidebar
    appTitle: 'Estante Digital',
    shelfCount: '{books} livros • {shelves} estantes',
    filterShelvesPlaceholder: 'Filtrar estantes...',
    allShelves: 'Todas as Estantes',
    categories: 'Categorias ({count})',
    oneDriveSafe: 'OneDrive Protegido (Modo Leitura)',
    customNameNotice: 'Nome personalizado no app',
    oneDriveFolderLabel: 'Pasta OneDrive: {folder}',
    toggleSidebar: 'Alternar menu (Ctrl+B)',
    collapseSidebar: 'Recolher menu (Ctrl+B)',
    expandSidebar: 'Expandir menu (Ctrl+B)',

    // Header & Navigation
    searchPlaceholder: "Pesquisar livros por título... (Pressione '/' para buscar)",
    sortNameAsc: 'Nome (A-Z)',
    sortNameDesc: 'Nome (Z-A)',
    sortSizeDesc: 'Maior Tamanho',
    sortRecent: 'Lido Recentemente',
    fullLibrary: 'Biblioteca Completa',
    booksInShelf: '{count} livros nesta estante',
    searchResults: 'Resultados para "{query}" ({count} livros encontrados)',

    // Continue Reading
    continueReading: 'Continuar Lendo',
    booksInProgress: '({count} livros em progresso)',
    pageOf: 'Pág. {page} de {total}',

    // Book Card
    completed: 'Concluído',
    pageBadge: 'p. {page}',
    readButton: 'Ler',
    openInSystemTitle: 'Abrir no app padrão do Windows (Firefox, Acrobat)',

    // Empty state
    noBooksFound: 'Nenhum livro encontrado',
    noBooksDesc: 'Não encontramos nenhum livro correspondente à sua busca ou nesta categoria.',
    clearSearch: 'Limpar pesquisa',

    // Reader
    backToLibrary: 'Biblioteca',
    backToLibraryTitle: 'Voltar à estante (Esc)',
    prevPageTitle: 'Página anterior (Seta esquerda)',
    nextPageTitle: 'Próxima página (Seta direita)',
    fitWidth: 'Ajustar',
    zoomInTitle: 'Aumentar Zoom (+)',
    zoomOutTitle: 'Diminuir Zoom (-)',
    nightModeTitle: 'Modo Leitura Noturna (Inverter cores do PDF)',
    openInWindowsTitle: 'Abrir no leitor padrão do Windows (Firefox, Acrobat, etc.)',
    fullscreenTitle: 'Tela cheia',
    loadingBook: 'Carregando livro...',
    rendering: 'Renderizando...',

    // Book Context Menu
    readNow: 'Ler Agora',
    openInWindowsApp: 'Abrir no App do Windows',
    markNotStarted: 'Marcar como Não Iniciado',
    markCompleted: 'Marcar como Concluído',
    copyFilePath: 'Copiar Caminho do Arquivo',
    pathCopied: 'Caminho Copiado!',

    // Shelf Context Menu & Modal
    folderLabel: 'Pasta: {folder}',
    renameShelfVirtual: 'Renomear Estante (Virtual)',
    restoreOriginalName: 'Restaurar Nome Original',
    renameModalTitle: 'Renomear Estante (Virtual)',
    realFolderPrefix: 'Pasta real: ',
    renameDisclaimer: 'Este nome é exibido apenas dentro do app. Os arquivos e pastas reais no OneDrive permanecem 100% inalterados.',
    shelfNameLabel: 'Nome de Exibição da Estante:',
    renamePlaceholder: 'Ex: Algoritmos Avançados',
    restoreOriginal: 'Restaurar Original',
    cancel: 'Cancelar',
    saveName: 'Salvar Nome',
  }
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('book_library_lang') || 'en';
  });

  const setLang = (newLang) => {
    if (newLang === 'en' || newLang === 'pt') {
      setLangState(newLang);
      localStorage.setItem('book_library_lang', newLang);
    }
  };

  const t = (key, params = {}) => {
    const dict = translations[lang] || translations.en;
    let str = dict[key] || translations.en[key] || key;
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, v);
    }
    return str;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
