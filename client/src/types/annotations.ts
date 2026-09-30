export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  book_id: string;
  page?: number;
  cfi?: string | null;
  chapter?: string | null;
  text: string;
  color: AnnotationColor;
  comment?: string;
  rects?: HighlightRect[];
  created_at: string;
  updated_at: string;
}
