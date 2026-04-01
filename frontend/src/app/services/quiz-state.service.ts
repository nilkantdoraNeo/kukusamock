import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription, interval, of, forkJoin } from 'rxjs';
import { catchError, map, switchMap, takeWhile } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { QuizAnswer, QuizQuestion } from '../models/quiz.model';
import { UserProfile } from '../models/user.model';
import { Exam } from '../models/exam.model';

export interface QuizState {
  questions: QuizQuestion[];
  currentIndex: number;
  answers: QuizAnswer[];
  score: number;
  secondsLeft: number;
  secondsPerQuestion: number;
  totalSecondsLeft: number;
  status: 'idle' | 'loading' | 'active' | 'finished';
  correctMap: Record<number, string>;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalCount: number;
  bookmarkedIds: number[];
  visitedIds: number[];
  examId?: number;
  examName?: string;
  durationSeconds?: number;
  questionLimit?: number;
  marksPerQuestion?: number;
  negativeMarkRatio?: number;
  errorMessage?: string;
  user?: UserProfile | null;
}

@Injectable({ providedIn: 'root' })
export class QuizStateService {
  private timerSub?: Subscription;
  private overallTimerSub?: Subscription;
  private loading = false;
  private stateSubject = new BehaviorSubject<QuizState>({
    questions: [],
    currentIndex: 0,
    answers: [],
    score: 0,
    secondsLeft: 0,
    secondsPerQuestion: 20,
    totalSecondsLeft: 0,
    status: 'idle',
    correctMap: {},
    correctCount: 0,
    wrongCount: 0,
    skippedCount: 0,
    totalCount: 0,
    bookmarkedIds: [],
    visitedIds: [],
    examId: undefined,
    examName: '',
    durationSeconds: 0,
    questionLimit: 0,
    marksPerQuestion: 0,
    negativeMarkRatio: 0,
    errorMessage: '',
    user: null
  });

  state$ = this.stateSubject.asObservable();

  constructor(private api: ApiService, private auth: AuthService) {}

  loadQuiz(
    examId: number,
    options: { limit?: number; durationSeconds?: number; questionLimit?: number; random?: boolean; perQuestionTimer?: boolean } = {}
  ) {
    if (this.loading) return;
    this.loading = true;
    this.timerSub?.unsubscribe();
    this.overallTimerSub?.unsubscribe();
    this.update({ status: 'loading', errorMessage: '' });

    this.ensureToken().pipe(
      switchMap((ok) => ok
        ? forkJoin({
          questions: this.api.fetchQuiz(examId, { daily: true, limit: options.limit, random: options.random }),
          exam: this.api.examById(examId).pipe(catchError(() => of(null)))
        })
        : of(null)
      )
    ).subscribe({
      next: (payload: { questions: QuizQuestion[] | { data?: QuizQuestion[]; questions?: QuizQuestion[] }; exam: Exam | null } | null) => {
        if (!payload) {
          this.loading = false;
          this.update({ status: 'idle', errorMessage: 'Please log in to continue.' });
          return;
        }

        let questions = this.normalizeQuestions(payload.questions);
        if (options.limit && questions.length > options.limit) {
          questions = questions.slice(0, options.limit);
        }
        const exam = payload.exam;

        if (questions.length === 0) {
          this.loading = false;
          this.update({ status: 'idle', errorMessage: 'No quiz available right now. Please try again later.' });
          return;
        }

        const totalCount = questions.length;
        const durationSeconds = Number(options.durationSeconds ?? exam?.duration_seconds ?? totalCount * 20);
        const questionLimit = Number(options.questionLimit ?? exam?.question_limit ?? totalCount);
        const marksPerQuestion = Number(exam?.marks_per_question ?? 3);
        const negativeMarkRatio = Number(exam?.negative_mark_ratio ?? (1 / 3));
        const usePerQuestionTimer = options.perQuestionTimer !== false;
        const secondsPerQuestion = usePerQuestionTimer
          ? Math.max(5, Math.ceil(durationSeconds / Math.max(questionLimit || totalCount, 1)))
          : 0;

        this.update({
          questions,
          currentIndex: 0,
          answers: [],
          score: 0,
          secondsLeft: secondsPerQuestion,
          secondsPerQuestion,
          totalSecondsLeft: durationSeconds,
          status: 'active',
          correctMap: {},
          correctCount: 0,
          wrongCount: 0,
          skippedCount: 0,
          totalCount,
          bookmarkedIds: [],
          visitedIds: questions[0]?.id ? [questions[0].id] : [],
          examId,
          examName: exam?.name || '',
          durationSeconds,
          questionLimit,
          marksPerQuestion,
          negativeMarkRatio,
          errorMessage: '',
          user: null
        });
        this.loading = false;
        if (secondsPerQuestion > 0) {
          this.startTimer(secondsPerQuestion);
        }
        this.startOverallTimer(durationSeconds);
      },
      error: (err) => {
        const message = err?.error?.message || (err?.status === 401 ? 'Please log in to continue.' : 'Failed to load quiz. Please try again.');
        this.loading = false;
        this.update({ status: 'idle', errorMessage: message });
      }
    });
  }

  answerCurrent(answer: string) {
    const state = this.stateSubject.value;
    const current = state.questions[state.currentIndex];
    if (!current) return;

    const cleaned = this.normalizeChoice(answer);
    const existing = state.answers.find(a => a.question_id === current.id);
    if (existing && this.normalizeChoice(existing.answer) === cleaned) {
      const answers = state.answers.filter(a => a.question_id !== current.id);
      this.update({ answers });
      return;
    }
    const answers = [
      ...state.answers.filter(a => a.question_id !== current.id),
      { question_id: current.id, answer: cleaned }
    ];

    this.update({ answers });
  }

  previousQuestion() {
    const state = this.stateSubject.value;
    if (state.currentIndex <= 0) return;
    this.moveTo(state.currentIndex - 1);
  }

  nextQuestion() {
    const state = this.stateSubject.value;
    if (state.currentIndex + 1 >= state.questions.length) {
      this.finishQuiz();
      return;
    }
    this.moveTo(state.currentIndex + 1);
  }

  skipCurrent() {
    const state = this.stateSubject.value;
    if (state.status !== 'active') return;
    this.nextQuestion();
  }

  goTo(index: number) {
    const state = this.stateSubject.value;
    if (state.status !== 'active') return;
    if (index < 0 || index >= state.questions.length) return;
    this.moveTo(index);
  }

  toggleBookmark(questionId: number) {
    const state = this.stateSubject.value;
    if (!questionId) return;
    const current = new Set(state.bookmarkedIds || []);
    if (current.has(questionId)) {
      current.delete(questionId);
    } else {
      current.add(questionId);
    }
    this.update({ bookmarkedIds: Array.from(current) });
  }

  submitEarly() {
    const state = this.stateSubject.value;
    if (state.status !== 'active') return;
    this.finishQuiz();
  }

  private startTimer(seconds: number) {
    this.timerSub?.unsubscribe();
    this.update({ secondsLeft: seconds });
    this.timerSub = interval(1000).pipe(
      map(i => seconds - i - 1),
      takeWhile(t => t >= 0)
    ).subscribe(t => {
      this.update({ secondsLeft: t });
      if (t === 0) {
        this.nextQuestion();
      }
    });
  }

  private startOverallTimer(totalSeconds: number) {
    this.overallTimerSub?.unsubscribe();
    if (!totalSeconds || totalSeconds <= 0) {
      this.update({ totalSecondsLeft: 0 });
      return;
    }
    this.update({ totalSecondsLeft: totalSeconds });
    this.overallTimerSub = interval(1000).pipe(
      map(i => totalSeconds - i - 1),
      takeWhile(t => t >= 0)
    ).subscribe(t => {
      this.update({ totalSecondsLeft: t });
      if (t === 0) {
        this.submitEarly();
      }
    });
  }

  finishQuiz() {
    const state = this.stateSubject.value;
    if (state.status === 'finished') return;
    this.timerSub?.unsubscribe();
    this.overallTimerSub?.unsubscribe();
    if (!state.examId) {
      this.update({ status: 'finished' });
      return;
    }
    const questionIds = state.questions.map(q => q.id);
    this.update({ status: 'loading', errorMessage: '' });
    this.api.submitQuiz(state.examId, state.answers, questionIds, state.totalCount).subscribe({
      next: (res: { score: number; correct: Record<number, string>; user?: UserProfile; stats?: { correctCount: number; wrongCount: number; skippedCount: number; totalCount: number } }) => {
        if (res.user) {
          this.auth.user.set(res.user);
        }
        this.update({
          score: res.score,
          correctMap: res.correct,
          correctCount: res.stats?.correctCount ?? state.correctCount,
          wrongCount: res.stats?.wrongCount ?? state.wrongCount,
          skippedCount: res.stats?.skippedCount ?? state.skippedCount,
          totalCount: res.stats?.totalCount ?? state.totalCount,
          user: res.user ?? state.user,
          status: 'finished'
        });
      },
      error: (err) => {
        const message = err?.error?.message || 'Failed to submit quiz. Please try again.';
        this.update({ status: 'idle', errorMessage: message });
      }
    });
  }

  reset() {
    this.timerSub?.unsubscribe();
    this.overallTimerSub?.unsubscribe();
    this.update({
      questions: [],
      currentIndex: 0,
      answers: [],
      score: 0,
      secondsLeft: 0,
      secondsPerQuestion: 20,
      totalSecondsLeft: 0,
      status: 'idle',
      correctMap: {},
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 0,
      totalCount: 0,
      bookmarkedIds: [],
      visitedIds: [],
      examId: undefined,
      examName: '',
      durationSeconds: 0,
      questionLimit: 0,
      marksPerQuestion: 0,
      negativeMarkRatio: 0,
      errorMessage: '',
      user: null
    });
  }

  getSnapshot() {
    return this.stateSubject.value;
  }

  private ensureToken() {
    return of(!!this.auth.getToken());
  }

  private update(partial: Partial<QuizState>) {
    this.stateSubject.next({ ...this.stateSubject.value, ...partial });
  }

  private normalizeChoice(value: string) {
    return String(value || '').trim();
  }

  private moveTo(index: number) {
    const state = this.stateSubject.value;
    const visited = new Set(state.visitedIds || []);
    const questionId = state.questions[index]?.id;
    if (questionId) visited.add(questionId);
    this.update({
      currentIndex: index,
      secondsLeft: state.secondsPerQuestion,
      visitedIds: Array.from(visited)
    });
    if (state.secondsPerQuestion > 0) {
      this.startTimer(state.secondsPerQuestion);
    }
  }

  private normalizeQuestions(
    payload: QuizQuestion[] | { data?: QuizQuestion[]; questions?: QuizQuestion[] }
  ): QuizQuestion[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.questions)) return payload.questions;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  }
}
