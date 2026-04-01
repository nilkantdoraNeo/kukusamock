import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { QuizAnswer, QuizQuestion } from '../models/quiz.model';
import { Exam } from '../models/exam.model';
import { UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  fetchQuiz(
    examId: number,
    options: { daily?: boolean; limit?: number; random?: boolean } = {}
  ) {
    const daily = options.daily !== false;
    const limit = Number(options.limit || 0) || undefined;
    const random = options.random === true;
    const cacheBuster = Date.now();
    const limitParam = limit ? `&limit=${limit}` : '';
    const randomParam = random ? '&random=true' : '';
    return this.http.get<QuizQuestion[]>(
      `${environment.apiUrl}/quiz?examId=${examId}&daily=${daily}${limitParam}${randomParam}&t=${cacheBuster}`
    );
  }

  submitQuiz(examId: number, answers: QuizAnswer[], questionIds: number[] = [], totalCount?: number) {
    return this.http.post<{
      score: number;
      correct: Record<number, string>;
      user?: UserProfile;
      stats?: { correctCount: number; wrongCount: number; skippedCount: number; totalCount: number };
    }>(
      `${environment.apiUrl}/quiz/submit`,
      { exam_id: examId, answers, question_ids: questionIds, total_count: totalCount }
    );
  }

  leaderboard() {
    return this.http.get<UserProfile[]>(`${environment.apiUrl}/leaderboard`);
  }

  exams() {
    return this.http.get<Exam[] | { data?: Exam[]; value?: Exam[]; items?: Exam[] }>(`${environment.apiUrl}/exams`)
      .pipe(map((res) => this.normalizeList<Exam>(res)));
  }

  examById(id: number) {
    return this.http.get<Exam>(`${environment.apiUrl}/exams/${id}`);
  }

  adminExams() {
    return this.http.get<Exam[]>(`${environment.apiUrl}/admin/exams`);
  }

  adminCreateExam(payload: Partial<Exam>) {
    return this.http.post<Exam>(`${environment.apiUrl}/admin/exams`, payload);
  }

  adminUpdateExam(id: number, payload: Partial<Exam>) {
    return this.http.patch<Exam>(`${environment.apiUrl}/admin/exams/${id}`, payload);
  }

  adminQuestions(examId?: number) {
    const qs = examId ? `?exam_id=${examId}` : '';
    return this.http.get<QuizQuestion[]>(`${environment.apiUrl}/admin/questions${qs}`);
  }

  adminCreateQuestion(payload: Partial<QuizQuestion>) {
    return this.http.post<QuizQuestion>(`${environment.apiUrl}/admin/questions`, payload);
  }

  adminImportQuestions(examId: number, questions: QuizQuestion[]) {
    return this.http.post<{ inserted: number }>(`${environment.apiUrl}/admin/questions/import`, {
      exam_id: examId,
      questions
    });
  }

  adminDeleteQuestion(id: number) {
    return this.http.delete<{ ok: boolean }>(`${environment.apiUrl}/admin/questions/${id}`);
  }

  adminUsers(limit = 25, offset = 0) {
    return this.http.get<UserProfile[]>(`${environment.apiUrl}/admin/users?limit=${limit}&offset=${offset}`);
  }

  adminUpdateUser(id: string, payload: Partial<UserProfile>) {
    return this.http.patch<UserProfile>(`${environment.apiUrl}/admin/users/${id}`, payload);
  }

  adminAttempts(limit = 25, offset = 0) {
    return this.http.get<any[]>(`${environment.apiUrl}/admin/attempts?limit=${limit}&offset=${offset}`);
  }

  adminAttemptAnswers(attemptId: number) {
    return this.http.get<any[]>(`${environment.apiUrl}/admin/attempts/${attemptId}/answers`);
  }

  latestAttempt() {
    return this.http.get<{
      attempt: any;
      answers: any[];
      correct: Record<number, string>;
    }>(`${environment.apiUrl}/attempts/latest`);
  }

  attempts(limit = 5) {
    return this.http.get<{ attempts: any[] }>(`${environment.apiUrl}/attempts?limit=${limit}`);
  }

  private normalizeList<T>(res: any): T[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.value)) return res.value;
    if (Array.isArray(res?.items)) return res.items;
    return [];
  }
}
