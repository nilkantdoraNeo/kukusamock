export interface QuizQuestion {
  id: number;
  exam_id?: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer?: string;
  explanation?: string;
  difficulty?: string;
  is_active?: boolean;
}

export interface QuizAnswer {
  question_id: number;
  answer: string;
}
