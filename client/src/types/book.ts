import type { Annotation } from './annotations';

export type BookFormat = 'pdf' | 'epub';

export type ReadingStatus = 'not_started' | 'in_progress' | 'completed';

export interface BookProgress {
  page: number;
  total_pages: number;
  percent: number;
  status?: ReadingStatus;
  zoom?: number;
  invert_colors?: boolean;
  cfi?: string;
  updated_at?: string;
}

export interface BookTag {
  id: string;
  name: string;
  color: string;
  library_id?: string;
  book_count?: number;
}

export interface Book {
  id: string;
  library_id: string;
  title: string;
  author: string;
  format: BookFormat;
  filename: string;
  shelf: string;
  shelf_display: string;
  folder: string;
  folder_display: string;
  size_bytes: number;
  size_formatted: string;
  modified_time: number;
  path: string;
  description?: string;
  publisher?: string;
  published_date?: string;
  progress?: BookProgress;
  cover_url: string;
  is_favorite: boolean;
  tags: BookTag[];
  annotations?: Annotation[];
  annotations_count?: number;
  creator?: string;
  creation_date?: string;
  total_pages?: number;
}

export interface Shelf {
  id: string;
  name: string;
  original_name: string;
  custom_name: string;
  folder: string;
  shelf: string;
  book_count: number;
  icon?: string;
  library_id: string;
  sample_covers: string[];
}

export type Folder = Shelf;

export interface Library {
  id: string;
  name: string;
  path: string;
  is_active?: boolean;
  folder_count?: number;
  book_count?: number;
  valid?: boolean;
  error?: string | null;
  sample_covers?: string[];
}
