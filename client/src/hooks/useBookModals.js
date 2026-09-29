import { useState, useCallback } from 'react';

/**
 * Custom hook to encapsulate modal and context-menu state across the application.
 */
export function useBookModals() {
  const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0, book: null });
  const [shelfContextMenu, setShelfContextMenu] = useState({ isOpen: false, x: 0, y: 0, shelf: null });
  const [renameModal, setRenameModal] = useState({ isOpen: false, shelf: null });
  const [iconModal, setIconModal] = useState({ isOpen: false, shelf: null });
  const [tagModal, setTagModal] = useState({ isOpen: false, book: null });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, book: null });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const openBookContextMenu = useCallback((e, book) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      book,
    });
  }, []);

  const closeBookContextMenu = useCallback(() => {
    setContextMenu({ isOpen: false, x: 0, y: 0, book: null });
  }, []);

  const openShelfContextMenu = useCallback((e, shelf) => {
    e.preventDefault();
    setShelfContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      shelf,
    });
  }, []);

  const closeShelfContextMenu = useCallback(() => {
    setShelfContextMenu({ isOpen: false, x: 0, y: 0, shelf: null });
  }, []);

  const openRenameModal = useCallback((shelf) => {
    setRenameModal({ isOpen: true, shelf });
  }, []);

  const closeRenameModal = useCallback(() => {
    setRenameModal({ isOpen: false, shelf: null });
  }, []);

  const openIconModal = useCallback((shelf) => {
    setIconModal({ isOpen: true, shelf });
  }, []);

  const closeIconModal = useCallback(() => {
    setIconModal({ isOpen: false, shelf: null });
  }, []);

  const openTagModal = useCallback((book) => {
    setTagModal({ isOpen: true, book });
  }, []);

  const closeTagModal = useCallback(() => {
    setTagModal({ isOpen: false, book: null });
  }, []);

  const openDetailsModal = useCallback((book) => {
    setDetailsModal({ isOpen: true, book });
  }, []);

  const closeDetailsModal = useCallback(() => {
    setDetailsModal({ isOpen: false, book: null });
  }, []);

  return {
    contextMenu,
    openBookContextMenu,
    closeBookContextMenu,
    shelfContextMenu,
    openShelfContextMenu,
    closeShelfContextMenu,
    renameModal,
    openRenameModal,
    closeRenameModal,
    iconModal,
    openIconModal,
    closeIconModal,
    tagModal,
    openTagModal,
    closeTagModal,
    detailsModal,
    openDetailsModal,
    closeDetailsModal,
    settingsOpen,
    setSettingsOpen,
    themeMenuOpen,
    setThemeMenuOpen,
  };
}
