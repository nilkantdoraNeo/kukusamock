import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { QuizStateService, QuizState } from '../../services/quiz-state.service';
import { QuizQuestion } from '../../models/quiz.model';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, IonContent],
  templateUrl: './quiz.page.html',
  styleUrls: ['./quiz.page.css']
})
export class QuizPage implements OnInit, OnDestroy {
  state: QuizState;
  questions: QuizQuestion[] = [];
  loading = true;
  errorMessage = '';
  confirmOpen = false;
  confirmMode: 'submit' | 'quit' = 'submit';
  mapOpen = false;
  sub: Subscription;
  routeSub: Subscription;
  examId?: number;

  constructor(
    private quiz: QuizStateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {
    this.state = this.quiz.getSnapshot();
    this.questions = this.state.questions;
    this.loading = this.state.status === 'loading';
    this.errorMessage = this.state.errorMessage || '';
    this.sub = this.quiz.state$.subscribe(s => {
      this.state = s;
      this.questions = s.questions;
      this.loading = s.status === 'loading';
      this.errorMessage = s.errorMessage || '';
      this.cdr.markForCheck();
      if (s.status === 'finished') {
        this.router.navigateByUrl('/result');
      }
    });
    this.routeSub = this.route.paramMap.subscribe(() => this.maybeLoadQuiz());
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.maybeLoadQuiz();
  }

  ionViewWillLeave() {
    // Keep state for resume; submit is handled explicitly via Quit/Submit.
  }

  answer(option: string) {
    this.quiz.answerCurrent(option);
  }

  toggleMap() {
    this.mapOpen = !this.mapOpen;
  }

  closeMap() {
    this.mapOpen = false;
  }

  prev() {
    this.quiz.previousQuestion();
  }

  skip() {
    this.quiz.skipCurrent();
  }

  next() {
    const state = this.quiz.getSnapshot();
    if (state.currentIndex + 1 >= state.questions.length) {
      this.confirmSubmit();
      return;
    }
    this.quiz.nextQuestion();
  }

  submit() {
    this.confirmSubmit();
  }

  formatTime(totalSeconds: number) {
    const safe = Math.max(0, Number(totalSeconds || 0));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  confirmQuit() {
    if (this.loading || this.state.status !== 'active') return;
    this.confirmMode = 'quit';
    this.confirmOpen = true;
  }

  private confirmSubmit() {
    if (this.loading || this.state.status !== 'active') return;
    this.confirmMode = 'submit';
    this.confirmOpen = true;
  }

  cancelConfirm() {
    this.confirmOpen = false;
  }

  acceptConfirm() {
    if (this.loading || this.state.status !== 'active') {
      this.confirmOpen = false;
      return;
    }
    this.confirmOpen = false;
    this.quiz.submitEarly();
  }

  selectedFor(id: number) {
    return this.state?.answers?.find(a => a.question_id === id)?.answer;
  }

  normalizeOption(value: string) {
    return String(value || '').trim();
  }

  isSelected(id: number, option: string) {
    return this.normalizeOption(this.selectedFor(id) || '') === this.normalizeOption(option);
  }

  isAnswered(id: number) {
    return !!this.state?.answers?.find(a => a.question_id === id)?.answer;
  }

  isBookmarked(id: number) {
    return (this.state?.bookmarkedIds || []).includes(id);
  }

  isVisited(id: number) {
    return (this.state?.visitedIds || []).includes(id);
  }

  isNotAnswered(id: number) {
    return this.isVisited(id) && !this.isAnswered(id);
  }

  toggleBookmark() {
    const current = this.state?.questions?.[this.state?.currentIndex || 0];
    if (!current?.id) return;
    this.quiz.toggleBookmark(current.id);
  }

  jumpTo(index: number) {
    this.quiz.goTo(index);
  }

  answeredCount() {
    return this.state?.answers?.length || 0;
  }

  bookmarkedCount() {
    return this.state?.bookmarkedIds?.length || 0;
  }

  notAnsweredCount() {
    const visited = this.state?.visitedIds?.length || 0;
    return Math.max(0, visited - this.answeredCount());
  }

  notVisitedCount() {
    const total = this.state?.questions?.length || 0;
    const visited = this.state?.visitedIds?.length || 0;
    return Math.max(0, total - visited);
  }

  unattemptedCount() {
    const total = this.state?.questions?.length || 0;
    return Math.max(0, total - this.answeredCount());
  }

  retry() {
    if (this.examId) {
      this.quiz.loadQuiz(this.examId);
    } else {
      this.maybeLoadQuiz();
    }
  }

  goProfile() {
    this.router.navigateByUrl('/profile');
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.routeSub.unsubscribe();
  }

  isActiveIndex(index: number) {
    return this.state?.currentIndex === index;
  }

  trackQuestion(index: number, question: QuizQuestion) {
    return question?.id ?? index;
  }

  private maybeLoadQuiz() {
    const idParam = this.route.snapshot.paramMap.get('examId');
    const examId = Number(idParam || 0) || undefined;
    if (!examId) {
      this.errorMessage = 'Missing exam. Please select a quiz from Home.';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    const quick = this.route.snapshot.queryParamMap.get('quick');
    const limitParam = Number(this.route.snapshot.queryParamMap.get('limit') || 0) || undefined;
    const isQuick = quick === '1' || quick === 'true';
    const quickLimit = limitParam || 15;
    this.examId = examId;
    const snapshot = this.quiz.getSnapshot();
    if (this.quiz.restoreSavedState(examId)) {
      return;
    }
    if (snapshot.examId !== examId) {
      this.quiz.reset();
    }
    if (snapshot.status === 'idle' || snapshot.questions.length === 0 || snapshot.examId !== examId) {
      if (isQuick) {
        this.quiz.loadQuiz(examId, {
          limit: quickLimit,
          durationSeconds: 900,
          questionLimit: quickLimit,
          random: true,
          perQuestionTimer: false
        });
      } else {
        this.quiz.loadQuiz(examId);
      }
    }
  }
}
