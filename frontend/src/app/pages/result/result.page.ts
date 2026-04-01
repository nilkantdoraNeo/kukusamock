import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { QuizStateService } from '../../services/quiz-state.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [CommonModule, IonContent, BottomNavComponent],
  template: `
    <ion-content class="app-root">
      <div class="page">
        <div class="glass-card result-hero" *ngIf="state && !loading">
          <p class="kicker">Final Score</p>
          <div class="score">{{ state.score | number:'1.0-2' }}</div>
          <div class="summary">
            <div class="summary-item">
              <div class="label">Correct</div>
              <div class="value">{{ state.correctCount }}</div>
            </div>
            <div class="summary-item">
              <div class="label">Wrong</div>
              <div class="value">{{ state.wrongCount }}</div>
            </div>
            <div class="summary-item">
              <div class="label">Skipped</div>
              <div class="value">{{ state.skippedCount }}</div>
            </div>
            <div class="summary-item">
              <div class="label">Total</div>
              <div class="value">{{ totalCount() }}</div>
            </div>
          </div>
          <div class="rank-pill" *ngIf="auth.user()?.rank">Rank #{{ auth.user()?.rank }}</div>
          <p class="muted">Great job! Review your answers below.</p>
          <button class="btn-primary" type="button" (click)="goHome()">Back Home</button>
        </div>

        <div class="glass-card empty-state" *ngIf="loading">
          <p class="muted">Loading result...</p>
        </div>
        <div class="glass-card empty-state" *ngIf="!loading && errorMessage">
          <p class="muted">{{ errorMessage }}</p>
        </div>

        <div class="section-title" *ngIf="!loading && state?.questions?.length">Answer Review</div>
        <div class="glass-card review" *ngFor="let q of (loading ? [] : state?.questions); trackBy: trackQuestion">
          <p class="question">{{ q.question }}</p>
          <div class="answer-row" [class.correct]="isCorrectAnswer(q.id)" [class.wrong]="isWrongAnswer(q.id)" [class.skipped]="isSkipped(q.id)">
            <span class="label">Your Answer</span>
            <span class="value">{{ answerFor(q.id) || 'Not Answered' }}</span>
          </div>
          <div class="answer-row correct">
            <span class="label">Correct Answer</span>
            <span class="value">{{ correctFor(q.id) || '--' }}</span>
          </div>

          <div class="option-list">
            <div
              class="option-item"
              *ngFor="let opt of optionsFor(q); trackBy: trackOption"
              [class.selected]="isSelectedOption(q.id, opt.value)"
              [class.correct]="isCorrectOption(q.id, opt.value)"
              [class.wrong]="isSelectedOption(q.id, opt.value) && !isCorrectOption(q.id, opt.value)">
              <span class="option-letter">{{ opt.label }}</span>
              <span class="option-text">{{ opt.value }}</span>
              <span class="option-tags">
                <span
                  class="option-tag selected"
                  *ngIf="isSelectedOption(q.id, opt.value)"
                  [class.correct]="isCorrectOption(q.id, opt.value)"
                  [class.wrong]="!isCorrectOption(q.id, opt.value)">
                  Your
                </span>
                <span class="option-tag correct" *ngIf="isCorrectOption(q.id, opt.value)">Correct</span>
              </span>
            </div>
          </div>

          <div class="explanation" *ngIf="explanationFor(q)">
            <div class="explanation-title">Explanation</div>
            <p>{{ explanationFor(q) }}</p>
          </div>
        </div>

        <app-bottom-nav></app-bottom-nav>
      </div>
    </ion-content>
  `,
  styleUrls: ['./result.page.css']
})
export class ResultPage implements OnInit {
  state = this.quiz.getSnapshot();
  loading = false;
  errorMessage = '';

  constructor(
    private quiz: QuizStateService,
    public auth: AuthService,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    const hasExplanation = this.state?.questions?.some((q: any) => q?.explanation);
    if (!this.state?.questions?.length || !hasExplanation) {
      this.loadLatest(!this.state?.questions?.length);
    }
  }

  private loadLatest(showLoader = true) {
    if (showLoader) {
      this.loading = true;
    }
    this.api.latestAttempt().subscribe({
      next: (res) => {
        const attempt = res?.attempt;
        const answers = res?.answers || [];
        const currentQuestions = this.state?.questions || [];
        const answerQuestions = answers.map((a: any) => a.question).filter(Boolean);
        const questions = currentQuestions.length
          ? currentQuestions.map((q: any) => {
            const extra = answerQuestions.find((aq: any) => aq?.id === q?.id);
            return extra ? { ...q, ...extra } : q;
          })
          : answerQuestions;
        const answerList = answers.map((a: any) => ({
          question_id: a.question?.id,
          answer: a.answer
        })).filter((a: any) => a.question_id);

        const totalCount = Number(attempt?.total_count ?? this.state?.totalCount ?? questions.length ?? 0);
        const correctCount = Number(attempt?.correct_count ?? 0);
        const skippedCount = Math.max(0, totalCount - answers.length);
        const wrongCount = Math.max(0, totalCount - correctCount - skippedCount);

        this.state = {
          ...this.state,
          questions,
          answers: answerList,
          correctMap: { ...(this.state?.correctMap || {}), ...(res?.correct || {}) },
          score: Number(attempt?.score ?? 0),
          correctCount,
          wrongCount,
          skippedCount,
          totalCount,
          examName: attempt?.exam?.name || this.state?.examName
        };
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.status === 401 ? 'Please log in to view your result.' : (err?.error?.message || 'No recent attempt found.');
        this.cdr.detectChanges();
      }
    });
  }

  totalCount() {
    return this.state?.totalCount || this.state?.questions?.length || 0;
  }

  answerFor(id: number) {
    return this.state?.answers?.find((a: any) => a.question_id === id)?.answer;
  }

  correctFor(id: number) {
    return this.state?.correctMap?.[id];
  }

  optionsFor(q: any) {
    return [
      { label: 'A', value: q?.option_a },
      { label: 'B', value: q?.option_b },
      { label: 'C', value: q?.option_c },
      { label: 'D', value: q?.option_d }
    ].filter((opt) => !!opt.value);
  }

  trackOption(index: number, option: any) {
    return option?.label ?? index;
  }

  normalizeAnswer(value: string) {
    return String(value || '').trim();
  }

  isSelectedOption(id: number, value: string) {
    return this.normalizeAnswer(this.answerFor(id) || '') === this.normalizeAnswer(value);
  }

  isCorrectOption(id: number, value: string) {
    return this.normalizeAnswer(this.correctFor(id) || '') === this.normalizeAnswer(value);
  }

  isCorrectAnswer(id: number) {
    const answer = this.answerFor(id);
    if (!answer) return false;
    return this.normalizeAnswer(answer) === this.normalizeAnswer(this.correctFor(id) || '');
  }

  isWrongAnswer(id: number) {
    const answer = this.answerFor(id);
    if (!answer) return false;
    return this.normalizeAnswer(answer) !== this.normalizeAnswer(this.correctFor(id) || '');
  }

  isSkipped(id: number) {
    return !this.answerFor(id);
  }

  explanationFor(q: any) {
    const text = String(q?.explanation || '').trim();
    return text || 'Explanation not available.';
  }

  trackQuestion(index: number, question: any) {
    return question?.id ?? index;
  }

  goHome() {
    this.router.navigateByUrl('/home');
  }
}


