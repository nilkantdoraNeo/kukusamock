export interface Exam {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
  duration_seconds?: number;
  question_limit?: number;
  marks_per_question?: number;
  negative_mark_ratio?: number;
}
