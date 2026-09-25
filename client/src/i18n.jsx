import React, { createContext, useContext, useState, useEffect } from 'react';

export const translations = {
  en: {
    // Sidebar
    appTitle: 'Digital Library',
    shelfCount: '{books} books • {folders} folders',
    filterShelvesPlaceholder: 'Filter folders...',
    allShelves: 'Home',
    allBooks: 'Home',
    categories: 'Folders ({count})',
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
    booksInShelf: '{count} books in this folder',
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
    noBooksDesc: "We couldn't find any books matching your search or in this folder.",
    clearSearch: 'Clear search',
    setupPromptTitle: 'Welcome to Digital Library',
    setupPromptDesc: 'To get started, configure the folder where your PDF books are located.',
    configureLibrary: 'Configure Library Folder',

    // Reader
    backToLibrary: 'Library',
    backToLibraryTitle: 'Back to library (Esc)',
    prevPageTitle: 'Previous page (Left arrow)',
    nextPageTitle: 'Next page (Right arrow)',
    resetWidth: 'Reset Width',
    resetWidthTitle: 'Reset zoom to default (100%)',
    fitWidth: 'Fit Width',
    dualPageMode: 'Dual Page View',
    singlePageMode: 'Single Page View',
    dualPageToggle: 'Toggle Dual Page View',
    dualPageSetting: 'Dual Page Mode',
    dualPageSettingDesc: 'Display two pages side-by-side like an open book',
    dualCoverStandalone: 'Cover Page Alone',
    dualCoverStandaloneDesc: 'Display the first page alone as the book cover',
    readerSettings: 'Reader Settings',
    trackpadSwipe: 'Two-Finger Trackpad Swipe',
    trackpadSwipeDesc: 'Swipe 2 fingers horizontally to flip pages',
    floatingSideButtons: 'Floating Side Buttons',
    floatingSideButtonsDesc: 'Show big ‹ and › buttons on screen sides',
    upDownPageFlip: 'Up/Down Page Flip',
    upDownPageFlipDesc: 'Turn page when reaching start or end with Up/Down arrows',
    zoomInTitle: 'Zoom In (+)',
    zoomOutTitle: 'Zoom Out (-)',
    nightModeTitle: 'Night Reading Mode (Invert PDF colors)',
    fullscreenTitle: 'Toggle Fullscreen',
    pinHeaderTitle: 'Keep header visible (Pin)',
    unpinHeaderTitle: 'Auto-hide header (Disappears after a few seconds)',
    autoHideHeader: 'Auto-Hide Header',
    autoHideHeaderDesc: 'Header disappears after a few seconds and reappears on hover',
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

    // Folder Context Menu & Modal
    folderLabel: 'Folder: {folder}',
    renameShelfVirtual: 'Rename Folder (Virtual)',
    chooseShelfIcon: 'Change Icon',
    iconModalTitle: 'Choose Folder Icon',
    searchIconsPlaceholder: 'Search icons (e.g. code, database, cloud)...',
    restoreDefaultIcon: 'Reset to default folder',
    previewLabel: 'Sidebar Preview',
    saveIcon: 'Save Icon',
    restoreOriginalName: 'Restore Original Name',
    renameModalTitle: 'Rename Folder (Virtual)',
    realFolderPrefix: 'Real folder: ',
    renameDisclaimer: 'This name is only displayed inside the app. Real filesystem folders remain 100% untouched.',
    shelfNameLabel: 'Folder Display Name:',
    renamePlaceholder: 'e.g. Advanced Algorithms',
    restoreOriginal: 'Restore Original',
    cancel: 'Cancel',
    saveName: 'Save Name',

    // Settings & Libraries
    settings: 'Settings',
    settingsTitle: 'Library Settings',
    settingsSubtitle: 'Configure your library folders and interface preferences',
    libraries: 'Libraries',
    activeLibrary: 'Active Library',
    switchLibrary: 'Switch Library',
    addLibrary: 'Add Library',
    addNewLibrary: 'Add New Library',
    manageLibraries: 'Manage Libraries',
    libraryName: 'Library Name',
    libraryPath: 'Folder Path',
    libraryNamePlaceholder: 'e.g. Work, Fiction, Reference',
    activeBadge: 'Active',
    setActive: 'Set Active',
    editLibrary: 'Edit Library',
    deleteLibrary: 'Remove Library',
    deleteLibraryConfirm: 'Remove "{name}" from your libraries? (Files on disk will NOT be deleted)',
    cannotDeleteOnlyLibrary: 'You cannot remove the only configured library.',
    libraryAdded: 'Library added successfully!',
    libraryUpdated: 'Library updated successfully!',
    libraryRemoved: 'Library removed!',
    booksIsolatedNotice: 'Books in different directories are kept strictly isolated.',
    switchingLibrary: 'Switching library...',
    languageLabel: 'Interface Language',
    libraryPathLabel: 'Books Directory Path',
    libraryPathPlaceholder: 'e.g. C:\\Books or /home/user/books',
    libraryPathHelp: 'Enter the folder where your books (.pdf, .epub) or subfolders are stored.',
    validFolder: 'Valid folder: {books} books across {folders} folders found',
    noPdfsFound: 'Directory exists, but no book files (.pdf, .epub) were found inside',
    pathNotFound: 'Directory does not exist on disk',
    notADirectory: 'Path is a file, not a directory',
    saveSettings: 'Save & Rescan',
    settingsSaved: 'Settings saved successfully!',
  },
  pt: {
    // Sidebar
    appTitle: 'Biblioteca Digital',
    shelfCount: '{books} livros • {folders} pastas',
    filterShelvesPlaceholder: 'Filtrar pastas...',
    allShelves: 'Início',
    allBooks: 'Início',
    categories: 'Pastas ({count})',
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
    fullLibrary: 'Início',
    viewAll: 'Ver todos',
    booksInShelf: '{count} livros nesta pasta',
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
    noBooksDesc: 'Não encontramos nenhum livro correspondente à sua busca ou nesta pasta.',
    clearSearch: 'Limpar pesquisa',
    setupPromptTitle: 'Bem-vindo à Biblioteca Digital',
    setupPromptDesc: 'Para começar, configure a pasta onde seus livros em PDF estão localizados.',
    configureLibrary: 'Configurar Pasta de Livros',

    // Reader
    backToLibrary: 'Biblioteca',
    backToLibraryTitle: 'Voltar à pasta (Esc)',
    prevPageTitle: 'Página anterior (Seta esquerda)',
    nextPageTitle: 'Próxima página (Seta direita)',
    resetWidth: 'Redefinir Largura',
    resetWidthTitle: 'Redefinir zoom para o padrão (100%)',
    fitWidth: 'Ajustar Largura',
    dualPageMode: 'Visualização em Duas Páginas',
    singlePageMode: 'Visualização em Página Única',
    dualPageToggle: 'Alternar Modo Duas Páginas',
    dualPageSetting: 'Modo Duas Páginas',
    dualPageSettingDesc: 'Exibir duas páginas lado a lado como um livro aberto',
    dualCoverStandalone: 'Capa Isolada',
    dualCoverStandaloneDesc: 'Exibir a primeira página isolada como capa do livro',
    readerSettings: 'Configurações do Leitor',
    trackpadSwipe: 'Gesto de 2 Dedos no Trackpad',
    trackpadSwipeDesc: 'Deslizar 2 dedos para os lados para virar páginas',
    floatingSideButtons: 'Botões Flutuantes Laterais',
    floatingSideButtonsDesc: 'Exibir botões grandes ‹ e › nas laterais da tela',
    upDownPageFlip: 'Virar Páginas com Cima/Baixo',
    upDownPageFlipDesc: 'Mudar de página ao atingir o início ou fim com as setas para Cima/Baixo',
    zoomInTitle: 'Aumentar Zoom (+)',
    zoomOutTitle: 'Diminuir Zoom (-)',
    nightModeTitle: 'Modo Leitura Noturna (Inverter cores do PDF)',
    fullscreenTitle: 'Tela cheia',
    pinHeaderTitle: 'Manter cabeçalho visível (Fixar)',
    unpinHeaderTitle: 'Ocultar cabeçalho automaticamente (Some após alguns segundos)',
    autoHideHeader: 'Ocultar Cabeçalho Automaticamente',
    autoHideHeaderDesc: 'O cabeçalho desaparece após alguns segundos e reaparece ao passar o mouse',
    loadingBook: 'Carregando livro...',
    rendering: 'Rendering...',
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

    // Folder Context Menu & Modal
    folderLabel: 'Pasta: {folder}',
    renameShelfVirtual: 'Renomear Pasta (Virtual)',
    chooseShelfIcon: 'Alterar Ícone',
    iconModalTitle: 'Escolher Ícone da Pasta',
    searchIconsPlaceholder: 'Buscar ícones (ex: código, banco de dados, nuvem)...',
    restoreDefaultIcon: 'Restaurar pasta padrão',
    previewLabel: 'Prévia no Menu',
    saveIcon: 'Salvar Ícone',
    restoreOriginalName: 'Restaurar Nome Original',
    renameModalTitle: 'Renomear Pasta (Virtual)',
    realFolderPrefix: 'Pasta real: ',
    renameDisclaimer: 'Este nome é exibido apenas dentro do app. Os arquivos e pastas reais no disco permanecem 100% inalterados.',
    shelfNameLabel: 'Nome de Exibição da Pasta:',
    renamePlaceholder: 'Ex: Algoritmos Avançados',
    restoreOriginal: 'Restaurar Original',
    cancel: 'Cancelar',
    saveName: 'Salvar Nome',

    // Settings & Libraries
    settings: 'Configurações',
    settingsTitle: 'Configurações da Biblioteca',
    settingsSubtitle: 'Configure suas pastas de livros e preferências da interface',
    libraries: 'Bibliotecas',
    activeLibrary: 'Biblioteca Ativa',
    switchLibrary: 'Alternar Biblioteca',
    addLibrary: 'Adicionar Biblioteca',
    addNewLibrary: 'Adicionar Nova Biblioteca',
    manageLibraries: 'Gerenciar Bibliotecas',
    libraryName: 'Nome da Biblioteca',
    libraryPath: 'Caminho da Pasta',
    libraryNamePlaceholder: 'Ex: Trabalho, Ficção, Referência',
    activeBadge: 'Ativa',
    setActive: 'Tornar Ativa',
    editLibrary: 'Editar Biblioteca',
    deleteLibrary: 'Remover Biblioteca',
    deleteLibraryConfirm: 'Remover "{name}" das suas bibliotecas? (Os arquivos no disco NÃO serão excluídos)',
    cannotDeleteOnlyLibrary: 'Você não pode remover a única biblioteca configurada.',
    libraryAdded: 'Biblioteca adicionada com sucesso!',
    libraryUpdated: 'Biblioteca atualizada com sucesso!',
    libraryRemoved: 'Biblioteca removida!',
    booksIsolatedNotice: 'Livros em diretórios diferentes são mantidos estritamente isolados.',
    switchingLibrary: 'Alternando biblioteca...',
    languageLabel: 'Idioma da Interface',
    libraryPathLabel: 'Caminho da Pasta de Livros',
    libraryPathPlaceholder: 'Ex: C:\\Livros ou /home/usuario/livros',
    libraryPathHelp: 'Insira a pasta onde seus livros (.pdf, .epub) ou subpastas estão armazenados.',
    validFolder: 'Pasta válida: {books} livros encontrados em {folders} pastas',
    noPdfsFound: 'A pasta existe, mas nenhum livro (.pdf, .epub) foi encontrado dentro',
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
    const resolvedParams = { ...params };
    if (resolvedParams.shelves !== undefined && resolvedParams.folders === undefined) {
      resolvedParams.folders = resolvedParams.shelves;
    }
    if (resolvedParams.folders !== undefined && resolvedParams.shelves === undefined) {
      resolvedParams.shelves = resolvedParams.folders;
    }
    for (const [k, v] of Object.entries(resolvedParams)) {
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
