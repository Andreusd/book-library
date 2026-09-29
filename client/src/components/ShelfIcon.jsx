import React from 'react';
import { Folder } from 'lucide-react';
import { ICON_MAP } from '../utils/shelfIcons';

export default function ShelfIcon({ icon, className = 'w-4 h-4' }) {
  const IconComponent = ICON_MAP[icon] || Folder;
  return <IconComponent className={className} />;
}

export const FolderIcon = ShelfIcon;
