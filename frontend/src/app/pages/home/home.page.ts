import { ChangeDetectorRef, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { QuizStateService } from '../../services/quiz-state.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Exam } from '../../models/exam.model';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';
import { filter } from 'rxjs/operators';

interface RecentAttemptView {
  id: number;
  examName: string;
  totalCount: number;
  correctCount: number;
  score: number;
  progress: number;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    BottomNavComponent
  ],
  template: `
    <ion-content class="app-root">
      <div class="page home-page">
        <header class="home-header">
          <div class="user-row">
            <div class="avatar">
              <img *ngIf="auth.user()?.avatar_url" [src]="auth.user()?.avatar_url" alt="avatar" />
              <span *ngIf="!auth.user()?.avatar_url">{{ displayInitial() }}</span>
            </div>
            <div>
              <div class="user-name">{{ displayName() }}</div>
              <div class="user-id" *ngIf="displayId()">{{ displayId() }}</div>
            </div>
          </div>
          <div class="points-chip">
            <span class="points-dot"></span>
            <span>{{ score() | number:'1.0-0' }}</span>
          </div>
        </header>

        <section class="banner">
          <div class="banner-text">
            <div class="banner-title">Test Your Knowledge with Quizzes</div>
            <p class="banner-copy">Your journey for a playful way to learn new skills. Our quizzes are designed to entertain and educate.</p>
            <button class="banner-btn" type="button" (click)="startPrimary()">Play Now</button>
          </div>
        </section>

        <section class="quick-test">
          <div>
            <div class="section-title">Quick 15-Minute Test</div>
            <div class="muted small-text">15 questions • 15 minutes</div>
          </div>
          <button class="quick-btn" type="button" (click)="openQuickTest()">Start</button>
        </section>

        <div class="search-row">
          <div class="search-box">
            <input type="text" placeholder="Search" [(ngModel)]="searchTerm" />
            <span class="search-icon"></span>
          </div>
          <button class="filter-btn" type="button" aria-label="Filter"></button>
        </div>

        <div class="section-title">Categories</div>
        <div class="categories">
          <button class="category" type="button" *ngFor="let exam of categoryExams(); let i = index; trackBy: trackExam" (click)="startExam(exam)" [style.--cat-color]="categoryColor(i)">
            <div class="cat-icon">{{ categoryInitial(exam) }}</div>
            <div class="cat-label">{{ exam.name }}</div>
          </button>
        </div>
        <div class="muted small-text" *ngIf="loadingExams">Loading categories...</div>
        <div class="muted small-text" *ngIf="!loadingExams && examError">{{ examError }}</div>

        <div class="section-title">Recent Activity</div>
        <div class="activity-list" *ngIf="filteredAttempts().length">
          <div class="activity-card" *ngFor="let item of filteredAttempts(); trackBy: trackAttempt">
          <div class="activity-left">
            <div class="activity-icon" [style.background]="item.color">{{ item.icon }}</div>
            <div>
              <div class="activity-title">{{ item.examName }}</div>
              <div class="activity-sub">{{ item.totalCount || 0 }} Question</div>
              <div class="activity-score">Score: {{ item.score | number:'1.0-2' }}</div>
            </div>
          </div>
            <div class="progress-ring" [style.--progress]="item.progress" [style.--ring-color]="item.color">
              <span>{{ item.correctCount }}/{{ item.totalCount || 0 }}</span>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="!loadingAttempts && !filteredAttempts().length">
          <p class="muted">No recent activity yet.</p>
        </div>

        <app-bottom-nav></app-bottom-nav>
      </div>
    </ion-content>

    <div class="quick-overlay" *ngIf="quickTestOpen" (click)="closeQuickTest()">
      <div class="quick-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title">Choose Exam</div>
          <button class="modal-close" type="button" (click)="closeQuickTest()">X</button>
        </div>
        <div class="modal-list">
          <button class="modal-item" type="button" *ngFor="let exam of exams; trackBy: trackExam" (click)="startQuickTest(exam)">
            {{ exam.name }}
          </button>
        </div>
        <div class="muted small-text" *ngIf="!exams.length">No exams available.</div>
      </div>
    </div>
  `,
  styleUrls: ['./home.page.css']
})
export class HomePage {
  private quiz = inject(QuizStateService);
  public auth = inject(AuthService);
  private router = inject(Router);
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private navSub = this.router.events
    .pipe(filter((event) => event instanceof NavigationEnd))
    .subscribe(() => {
      if (this.router.url.startsWith('/home')) {
        this.loadRecentAttempts();
      }
    });

  exams: Exam[] = [];
  loadingExams = true;
  examError = '';

  searchTerm = '';
  recentAttempts: RecentAttemptView[] = [];
  loadingAttempts = true;
  quickTestOpen = false;

  private palette = ['#ff8a34', '#4c7ef3', '#21b28e', '#9b6bff', '#f25c5c'];

  score = computed(() => this.auth.user()?.score ?? 0);

  constructor() {
    this.loadExams();
    this.loadRecentAttempts();
  }

  ionViewWillEnter() {
    this.loadExams();
    this.loadRecentAttempts();
  }

  loadExams() {
    this.loadingExams = true;
    this.examError = '';
    this.api.exams().subscribe({
      next: (exams) => {
        this.exams = exams || [];
        this.loadingExams = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingExams = false;
        this.examError = 'Failed to load exams. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  loadRecentAttempts() {
    this.loadingAttempts = true;
    if (!this.auth.getToken()) {
      this.recentAttempts = [];
      this.loadingAttempts = false;
      this.cdr.detectChanges();
      return;
    }
    this.api.attempts(20).subscribe({
      next: (res) => {
        const attempts = res?.attempts || [];
        if (!attempts.length) {
          this.loadLatestAttemptFallback();
          return;
        }
        this.recentAttempts = attempts.map((attempt: any, index: number) =>
          this.mapAttempt(attempt, index)
        );
        this.loadingAttempts = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadLatestAttemptFallback();
      }
    });
  }

  startExam(exam: Exam) {
    if (!this.auth.getToken()) {
      this.router.navigateByUrl('/profile');
      return;
    }
    this.quiz.loadQuiz(exam.id);
    this.router.navigateByUrl(`/quiz/${exam.id}`);
  }

  startPrimary() {
    const exam = this.exams?.[0];
    if (exam) {
      this.startExam(exam);
    }
  }

  openQuickTest() {
    this.quickTestOpen = true;
  }

  closeQuickTest() {
    this.quickTestOpen = false;
  }

  startQuickTest(exam: Exam) {
    if (!this.auth.getToken()) {
      this.router.navigateByUrl('/profile');
      return;
    }
    this.quickTestOpen = false;
    this.quiz.loadQuiz(exam.id, {
      limit: 15,
      durationSeconds: 900,
      questionLimit: 15,
      random: true,
      perQuestionTimer: false
    });
    this.router.navigateByUrl(`/quiz/${exam.id}?quick=1&limit=15`);
  }

  displayName() {
    const user = this.auth.user();
    if (user?.username) {
      return user.username;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Guest';
  }

  displayInitial() {
    const name = this.displayName();
    return name ? name[0].toUpperCase() : 'G';
  }

  displayId() {
    const id = this.auth.user()?.id;
    if (!id) return '';
    const digits = String(id).replace(/[^0-9]/g, '');
    const tail = digits.slice(-4) || String(id).slice(-4).toUpperCase();
    return `ID-${tail}`;
  }

  categoryExams() {
    const term = this.searchTerm.trim().toLowerCase();
    const list = term
      ? this.exams.filter((exam) => exam?.name?.toLowerCase().includes(term))
      : this.exams;
    return list.slice(0, 5);
  }

  filteredAttempts() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.recentAttempts;
    return this.recentAttempts.filter((item) => item.examName.toLowerCase().includes(term));
  }

  categoryInitial(exam: Exam) {
    return exam?.name ? exam.name[0].toUpperCase() : 'Q';
  }

  categoryColor(index: number) {
    return this.palette[index % this.palette.length];
  }

  trackExam(index: number, exam: Exam) {
    return exam?.id ?? index;
  }

  trackAttempt(index: number, attempt: RecentAttemptView) {
    return attempt?.id ?? index;
  }

  private initialFor(name: string) {
    return name ? name[0].toUpperCase() : 'Q';
  }

  private mapAttempt(attempt: any, index: number): RecentAttemptView {
    const total = Number(attempt?.total_count ?? attempt?.exam?.question_limit ?? 0);
    const correct = Number(attempt?.correct_count ?? 0);
    const score = Number(attempt?.score ?? 0);
    const name = attempt?.exam?.name || 'Quiz';
    const progress = total > 0 ? Math.min(correct / total, 1) : 0;
    return {
      id: attempt?.id,
      examName: name,
      totalCount: total,
      correctCount: correct,
      score,
      progress,
      color: this.palette[index % this.palette.length],
      icon: this.initialFor(name)
    };
  }

  private loadLatestAttemptFallback() {
    this.api.latestAttempt().subscribe({
      next: (res) => {
        const attempt = res?.attempt;
        this.recentAttempts = attempt ? [this.mapAttempt(attempt, 0)] : [];
        this.loadingAttempts = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.recentAttempts = [];
        this.loadingAttempts = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
  }
}
