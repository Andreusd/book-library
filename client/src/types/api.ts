import type { Book, Shelf, Library, BookTag } from './book';
import type { Annotation, HighlightRect, AnnotationColor } from './annotations';

// ==========================================
// Request Payloads (Matching server/schemas.py)
// ==========================================

export interface ProgressPayload {
  book_id: string;
  page?: number;
  total_pages?: number;
  zoom?: number;
  invert_colors?: boolean;
  cfi?: string;
  percent?: number;
}

export interface ZoomPayload {
  book_id: string;
  zoom: number;
}

export interface NightModePayload {
  book_id: string;
  invert_colors: boolean;
}

export interface StatusPayload {
  book_id: string;
  status: 'not_started' | 'completed';
}

export interface RenameShelfPayload {
  shelf_id?: string;
  folder_id?: string;
  custom_name: string;
  library_id?: string;
}

export interface SetShelfIconPayload {
  shelf_id?: string;
  folder_id?: string;
  icon: string;
  library_id?: string;
}

export interface ToggleFavoritePayload {
  book_id: string;
}

export interface SettingsPayload {
  library_path: string;
}

export interface DisplaySettingsPayload {
  show_file_extension?: boolean;
  book_animations?: boolean;
}

export interface ValidatePathPayload {
  path: string;
}

export interface AddLibraryPayload {
  name: string;
  path: string;
  set_active?: boolean;
}

export interface UpdateLibraryPayload {
  name?: string;
  path?: string;
}

export interface SetActiveLibraryPayload {
  library_id: string;
}

export interface AnnotationPayload {
  book_id: string;
  page?: number;
  cfi?: string | null;
  chapter?: string | null;
  text: string;
  color?: AnnotationColor | string;
  comment?: string;
  rects?: HighlightRect[];
}

export interface UpdateAnnotationPayload {
  comment?: string;
  color?: AnnotationColor | string;
}

export interface TranslatePayload {
  text: string;
  target_lang?: string;
  source_lang?: string;
}

export interface CreateTagPayload {
  name: string;
  color?: string;
  library_id?: string;
}

export interface UpdateTagPayload {
  name?: string;
  color?: string;
}

export interface SetBookTagsPayload {
  tag_ids: string[];
}

export interface ToggleBookTagPayload {
  tag_id: string;
}

export interface UserPayload {
  username: string;
}

// ==========================================
// Domain & Helper Entities
// ==========================================

export interface UserProfile {
  username: string;
  slug: string;
  created_at: string;
  last_active: string;
}

export interface WordDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
}

export interface WordMeaning {
  partOfSpeech: string;
  definitions: WordDefinition[];
}

export interface PathValidationResult {
  valid: boolean;
  exists: boolean;
  is_dir: boolean;
  shelf_count: number;
  folder_count: number;
  book_count: number;
  error?: string;
  normalized_path?: string;
}

// ==========================================
// Response Envelopes
// ==========================================

export interface BooksListResponse {
  books: Book[];
  count: number;
}

export interface ContinueReadingResponse {
  books: Book[];
}

export interface FavoritesResponse {
  favorite_ids: string[];
  books: Book[];
  count: number;
}

export interface FoldersResponse {
  folders: Shelf[];
  shelves: Shelf[];
  total_folders: number;
  total_shelves: number;
  total_books: number;
  library_id: string;
}

export interface RenameFolderResponse {
  status: string;
  folders: Shelf[];
  shelves: Shelf[];
  folder_id: string;
  shelf_id: string;
  name: string;
}

export interface SetFolderIconResponse {
  status: string;
  folders: Shelf[];
  shelves: Shelf[];
  folder_id: string;
  shelf_id: string;
  icon: string;
}

export interface LibrariesResponse {
  libraries: Library[];
  active_library_id: string;
  show_file_extension?: boolean;
  book_animations?: boolean;
}

export interface AddLibraryResponse {
  status: string;
  library: Library;
  libraries: Library[];
  active_library_id: string;
}

export interface UpdateLibraryResponse {
  status: string;
  library: Library;
  libraries: Library[];
}

export interface SettingsResponse {
  library_path: string;
  active_library_id: string;
  libraries: Library[];
  validation: PathValidationResult;
  show_file_extension: boolean;
}

export interface TagsResponse {
  tags: BookTag[];
  tag?: BookTag;
  status?: string;
}

export interface BookTagsResponse {
  status?: string;
  book_id?: string;
  tag_id?: string;
  is_assigned?: boolean;
  tags: BookTag[];
}

export interface AnnotationsResponse {
  annotations: Annotation[];
  annotation?: Annotation;
  status?: string;
}

export interface UsersResponse {
  users: UserProfile[];
  user?: UserProfile;
  status?: string;
}

export interface LookupDefinitionResponse {
  word: string;
  phonetic?: string;
  meanings: WordMeaning[];
  audio?: string;
}

export interface LookupTranslationResponse {
  text: string;
  translated: string;
  target_lang: string;
  source_lang: string;
}
