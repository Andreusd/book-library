import React, { createContext, useContext, useState, useEffect } from 'react';

export const translations = {
  en: {
    // Sidebar
    appTitle: 'Digital Bookshelf',
    shelfCount: '{books} books • {shelves} shelves',
    filterShelvesPlaceholder: 'Filter shelves...',
    allShelves: 'Home',
    allBooks: 'Home',
    categories: 'Bookshelves ({count})',
    librarySafe: 'Source Folder Protected (Read-Only)',
    customNameNotice: 'Custom display name in app',
    originalFolderLabel: 'Original Folder: {folder}',
    toggleSidebar: 'Toggle menu (Ctrl+B)',
    collapseSidebar: 'Collapse menu (Ctrl+B)',
    expandSidebar: 'Expand menu (Ctrl+B)',

    // Header & Navigation
    searchPlaceholder: "Search books by title... (Press '/' to search)",
    sortNameAsc: 'Name (A-Z)',
    sortNameDesc: 'Name (Z-A)',
    sortSizeDesc: 'Largest Size',
    sortRecent: 'Recently Read',
    fullLibrary: 'Home',
    viewAll: 'View all',
    booksInShelf: '{count} books in this shelf',
    searchResults: 'Results for "{query}" ({count} books found)',

    // Continue Reading
    continueReading: 'Continue Reading',
    booksInProgress: '({count} books in progress)',
    pageOf: 'Page {page} of {total}',

    // Favorites
    favorites: 'Favorites',
    favoriteBooksCount: '({count} favorite books)',
    addToFavorites: 'Add to Favorites',
    removeFromFavorites: 'Remove from Favorites',
    favoriteShelfTitle: 'Favorite Books',

    // Book Card
    completed: 'Completed',
    pageBadge: 'p. {page}',
    readButton: 'Read',

    // Empty state & Onboarding
    noBooksFound: 'No books found',
    noBooksDesc: "We couldn't find any books matching your search or in this bookshelf.",
    clearSearch: 'Clear search',
    setupPromptTitle: 'Welcome to Digital Bookshelf',
    setupPromptDesc: 'To get started, configure the folder where your PDF books are located.',
    configureLibrary: 'Configure Library Folder',

    // Reader
    backToLibrary: 'Library',
    backToLibraryTitle: 'Back to library (Esc)',
    prevPageTitle: 'Previous page (Left arrow)',
    nextPageTitle: 'Next page (Right arrow)',
    fitWidth: 'Fit Width',
    zoomInTitle: 'Zoom In (+)',
    zoomOutTitle: 'Zoom Out (-)',
    nightModeTitle: 'Night Reading Mode (Invert PDF colors)',
    fullscreenTitle: 'Toggle Fullscreen',
    loadingBook: 'Loading book...',
    rendering: 'Rendering...',
    tableOfContents: 'Table of Contents',
    index: 'Index',
    showIndex: 'Show Table of Contents',
    hideIndex: 'Hide Table of Contents',
    filterIndexPlaceholder: 'Filter chapters...',
    noIndexItemsFound: 'No chapters match your search',
    noIndexAvailable: 'No table of contents available for this document',
    comments: 'Comments',
    commentsAndHighlights: 'Comments & Highlights',
    showComments: 'Show Comments & Highlights',
    hideComments: 'Hide Comments & Highlights',
    filterCommentsPlaceholder: 'Filter comments or quotes...',
    noCommentsYet: 'No comments or highlights yet',
    noCommentsDesc: 'Select text in the book and right-click to highlight or add notes.',
    jumpToPage: 'Jump to page {page}',
    editComment: 'Edit Note',
    deleteComment: 'Delete Annotation',
    saveComment: 'Save',
    addComment: 'Add Note',
    addCommentPlaceholder: 'Write a note or comment...',
    highlight: 'Highlight',
    removeHighlight: 'Remove Highlight',

    // Book Context Menu
    readNow: 'Read Now',
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
    renameDisclaimer: 'This name is only displayed inside the app. Real filesystem folders remain 100% untouched.',
    shelfNameLabel: 'Shelf Display Name:',
    renamePlaceholder: 'e.g. Advanced Algorithms',
    restoreOriginal: 'Restore Original',
    cancel: 'Cancel',
    saveName: 'Save Name',

    // Settings
    settings: 'Settings',
    settingsTitle: 'Library Settings',
    libraryPathLabel: 'Books Directory Path',
    libraryPathPlaceholder: 'e.g. C:\\Books or /home/user/books',
    libraryPathHelp: 'Enter the folder where your PDF books or bookshelf folders are stored.',
    validFolder: 'Valid folder: {books} books across {shelves} shelves found',
    noPdfsFound: 'Directory exists, but no PDF files were found inside',
    pathNotFound: 'Directory does not exist on disk',
    notADirectory: 'Path is a file, not a directory',
    saveSettings: 'Save & Rescan',
    settingsSaved: 'Settings saved successfully!',
  },
  pt: {
    // Sidebar
    appTitle: 'Estante Digital',
    shelfCount: '{books} livros • {shelves} estantes',
    filterShelvesPlaceholder: 'Filtrar estantes...',
    allShelves: 'Casa',
    allBooks: 'Casa',
    categories: 'Estantes ({count})',
    librarySafe: 'Pasta de Origem Protegida (Modo Leitura)',
    customNameNotice: 'Nome personalizado no app',
    originalFolderLabel: 'Pasta Original: {folder}',
    toggleSidebar: 'Alternar menu (Ctrl+B)',
    collapseSidebar: 'Recolher menu (Ctrl+B)',
    expandSidebar: 'Expandir menu (Ctrl+B)',

    // Header & Navigation
    searchPlaceholder: "Pesquisar livros por título... (Pressione '/' para buscar)",
    sortNameAsc: 'Nome (A-Z)',
    sortNameDesc: 'Nome (Z-A)',
    sortSizeDesc: 'Maior Tamanho',
    sortRecent: 'Lido Recentemente',
    fullLibrary: 'Casa',
    viewAll: 'Ver todos',
    booksInShelf: '{count} livros nesta estante',
    searchResults: 'Resultados para "{query}" ({count} livros encontrados)',

    // Continue Reading
    continueReading: 'Continuar Lendo',
    booksInProgress: '({count} livros em progresso)',
    pageOf: 'Pág. {page} de {total}',

    // Favorites
    favorites: 'Favoritos',
    favoriteBooksCount: '({count} livros favoritos)',
    addToFavorites: 'Adicionar aos Favoritos',
    removeFromFavorites: 'Remover dos Favoritos',
    favoriteShelfTitle: 'Livros Favoritos',

    // Book Card
    completed: 'Concluído',
    pageBadge: 'p. {page}',
    readButton: 'Ler',

    // Empty state & Onboarding
    noBooksFound: 'Nenhum livro encontrado',
    noBooksDesc: 'Não encontramos nenhum livro correspondente à sua busca ou nesta estante.',
    clearSearch: 'Limpar pesquisa',
    setupPromptTitle: 'Bem-vindo à Estante Digital',
    setupPromptDesc: 'Para começar, configure a pasta onde seus livros em PDF estão localizados.',
    configureLibrary: 'Configurar Pasta de Livros',

    // Reader
    backToLibrary: 'Biblioteca',
    backToLibraryTitle: 'Voltar à estante (Esc)',
    prevPageTitle: 'Página anterior (Seta esquerda)',
    nextPageTitle: 'Próxima página (Seta direita)',
    fitWidth: 'Ajustar',
    zoomInTitle: 'Aumentar Zoom (+)',
    zoomOutTitle: 'Diminuir Zoom (-)',
    nightModeTitle: 'Modo Leitura Noturna (Inverter cores do PDF)',
    fullscreenTitle: 'Tela cheia',
    loadingBook: 'Carregando livro...',
    rendering: 'Renderizando...',
    tableOfContents: 'Sumário',
    index: 'Sumário',
    showIndex: 'Mostrar Sumário',
    hideIndex: 'Ocultar Sumário',
    filterIndexPlaceholder: 'Filtrar capítulos...',
    noIndexItemsFound: 'Nenhum capítulo corresponde à pesquisa',
    noIndexAvailable: 'Nenhum sumário disponível para este documento',
    comments: 'Comentários',
    commentsAndHighlights: 'Comentários e Destaques',
    showComments: 'Mostrar Comentários e Destaques',
    hideComments: 'Ocultar Comentários e Destaques',
    filterCommentsPlaceholder: 'Filtrar anotações ou citações...',
    noCommentsYet: 'Nenhum comentário ou destaque ainda',
    noCommentsDesc: 'Selecione um trecho do livro e clique com o botão direito para destacar ou anotar.',
    jumpToPage: 'Ir para a página {page}',
    editComment: 'Editar Nota',
    deleteComment: 'Excluir Anotação',
    saveComment: 'Salvar',
    addComment: 'Adicionar Nota',
    addCommentPlaceholder: 'Escreva uma nota ou comentário...',
    highlight: 'Destacar',
    removeHighlight: 'Remover Destaque',

    // Book Context Menu
    readNow: 'Ler Agora',
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
    renameDisclaimer: 'Este nome é exibido apenas dentro do app. Os arquivos e pastas reais no disco permanecem 100% inalterados.',
    shelfNameLabel: 'Nome de Exibição da Estante:',
    renamePlaceholder: 'Ex: Algoritmos Avançados',
    restoreOriginal: 'Restaurar Original',
    cancel: 'Cancelar',
    saveName: 'Salvar Nome',

    // Settings
    settings: 'Configurações',
    settingsTitle: 'Configurações da Biblioteca',
    libraryPathLabel: 'Caminho da Pasta de Livros',
    libraryPathPlaceholder: 'Ex: C:\\Livros ou /home/usuario/livros',
    libraryPathHelp: 'Insira a pasta onde seus livros em PDF ou pastas de estantes estão armazenados.',
    validFolder: 'Pasta válida: {books} livros encontrados em {shelves} estantes',
    noPdfsFound: 'A pasta existe, mas nenhum arquivo PDF foi encontrado dentro',
    pathNotFound: 'O diretório não existe no disco',
    notADirectory: 'O caminho informado é um arquivo, não uma pasta',
    saveSettings: 'Salvar e Reexaminar',
    settingsSaved: 'Configurações salvas com sucesso!',
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
