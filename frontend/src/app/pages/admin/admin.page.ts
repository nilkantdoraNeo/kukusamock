import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonTextarea } from '@ionic/angular/standalone';
import { ApiService } from '../../services/api.service';
import { Exam } from '../../models/exam.model';
import { QuizQuestion } from '../../models/quiz.model';
import { UserProfile } from '../../models/user.model';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonTextarea, BottomNavComponent],
  template: `
    <ion-content class="app-root">
      <div class="page">
        <header class="topbar">
          <div class="title">Admin Console</div>
        </header>

        <div class="section-title">Exams</div>
        <div class="glass-card form">
          <ion-item class="input">
            <ion-label position="stacked">Name</ion-label>
            <ion-input [(ngModel)]="newExam.name"></ion-input>
          </ion-item>
          <ion-item class="input">
            <ion-label position="stacked">Slug</ion-label>
            <ion-input [(ngModel)]="newExam.slug"></ion-input>
          </ion-item>
          <ion-item class="input">
            <ion-label position="stacked">Description</ion-label>
            <ion-input [(ngModel)]="newExam.description"></ion-input>
          </ion-item>
          <ion-item class="input">
            <ion-label position="stacked">Duration (seconds)</ion-label>
            <ion-input type="number" [(ngModel)]="newExam.duration_seconds"></ion-input>
          </ion-item>
          <ion-item class="input">
            <ion-label position="stacked">Question Limit</ion-label>
            <ion-input type="number" [(ngModel)]="newExam.question_limit"></ion-input>
          </ion-item>
          <ion-item class="input">
            <ion-label position="stacked">Marks per Question</ion-label>
            <ion-input type="number" [(ngModel)]="newExam.marks_per_question"></ion-input>
          </ion-item>
          <ion-item class="input">
            <ion-label position="stacked">Negative Mark Ratio</ion-label>
            <ion-input type="number" step="0.01" [(ngModel)]="newExam.negative_mark_ratio"></ion-input>
          </ion-item>
          <button class="btn-primary" (click)="createExam()">Create Exam</button>
        </div>

        <div class="grid">
          <div class="glass-card stat" *ngFor="let exam of exams; trackBy: trackExam">
            <p class="muted">{{ exam.slug }}</p>
            <div class="big">{{ exam.name }}</div>
            <p class="muted">{{ exam.question_limit ?? '--' }} questions - {{ exam.duration_seconds ? (exam.duration_seconds / 60) : '--' }} min</p>
            <p class="muted">Marks: {{ exam.marks_per_question || 0 }} - Negative: {{ (exam.negative_mark_ratio || 0) * 100 | number:'1.0-2' }}%</p>
            <div class="button-row">
              <button class="btn-primary" (click)="toggleExam(exam)">
                {{ exam.is_active ? 'Deactivate' : 'Activate' }}
              </button>
            </div>
          </div>
        </div>

        <div class="section-title">Question Upload</div>
        <div class="glass-card form">
          <ion-item class="input">
            <ion-label position="stacked">Exam</ion-label>
            <ion-select [(ngModel)]="selectedExamId" (ionChange)="loadQuestions()">
              <ion-select-option *ngFor="let exam of exams" [value]="exam.id">{{ exam.name }}</ion-select-option>
            </ion-select>
          </ion-item>
          <div class="row">
            <input type="file" (change)="onFileSelected($event)" />
          </div>
          <ion-item class="input">
            <ion-label position="stacked">Questions JSON</ion-label>
            <ion-textarea rows="6" [(ngModel)]="questionsJson"></ion-textarea>
          </ion-item>
          <button class="btn-primary" (click)="importQuestions()">Import Questions</button>
          <p class="muted small">Format: [&#123; "question": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "..." &#125;]</p>
        </div>

        <div class="section-title">Questions (Selected Exam)</div>
        <div class="glass-card review" *ngFor="let q of questions; trackBy: trackQuestion">
          <p class="question">{{ q.question }}</p>
          <p class="answer">A: {{ q.option_a }}</p>
          <p class="answer">B: {{ q.option_b }}</p>
          <p class="answer">C: {{ q.option_c }}</p>
          <p class="answer">D: {{ q.option_d }}</p>
          <p class="answer correct">Correct: {{ q.correct_answer }}</p>
          <button class="btn-primary" (click)="deleteQuestion(q.id)">Delete</button>
        </div>

        <div class="section-title">Users</div>
        <div class="button-row">
          <button class="btn-primary" (click)="loadUsers(true)" [disabled]="usersLoading">Load Users</button>
          <button class="btn-secondary" *ngIf="users.length" (click)="loadUsers(true)" [disabled]="usersLoading">Refresh</button>
        </div>
        <div class="muted small" *ngIf="usersLoading">Loading users...</div>
        <div class="muted small" *ngIf="!usersLoading && !users.length">No users loaded yet.</div>
        <div class="glass-card review" *ngFor="let u of users; trackBy: trackUser">
          <p class="question">{{ u.username || u.email }}</p>
          <p class="answer">Email: {{ u.email }}</p>
          <p class="answer">Phone: {{ u.phone || '--' }} - Age: {{ u.age || '--' }}</p>
          <p class="answer">Score: {{ u.score }} - Rank: {{ u.rank }}</p>
          <p class="answer">Status: {{ u.status || 'active' }} - Admin: {{ u.is_admin ? 'yes' : 'no' }}</p>
          <div class="button-row">
            <button class="btn-primary" (click)="toggleUser(u)">
              {{ (u.status || 'active') === 'active' ? 'Suspend' : 'Activate' }}
            </button>
          </div>
        </div>
        <div class="button-row" *ngIf="users.length && usersHasMore">
          <button class="btn-secondary" (click)="loadUsers()" [disabled]="usersLoading">Load More</button>
        </div>

        <div class="section-title">Attempts</div>
        <div class="button-row">
          <button class="btn-primary" (click)="loadAttempts(true)" [disabled]="attemptsLoading">Load Attempts</button>
          <button class="btn-secondary" *ngIf="attempts.length" (click)="loadAttempts(true)" [disabled]="attemptsLoading">Refresh</button>
        </div>
        <div class="muted small" *ngIf="attemptsLoading">Loading attempts...</div>
        <div class="muted small" *ngIf="!attemptsLoading && !attempts.length">No attempts loaded yet.</div>
        <div class="glass-card review" *ngFor="let a of attempts; trackBy: trackAttempt">
          <p class="question">{{ a.user?.email || 'Unknown user' }}</p>
          <p class="answer">Exam: {{ a.exam?.name || 'Unknown' }}</p>
          <p class="answer">Score: {{ a.score }} - Correct: {{ a.correct_count }}/{{ a.total_count }}</p>
          <p class="answer">At: {{ a.created_at | date:'short' }}</p>
          <button class="btn-primary" (click)="viewAttempt(a.id)">View Answers</button>
        </div>
        <div class="button-row" *ngIf="attempts.length && attemptsHasMore">
          <button class="btn-secondary" (click)="loadAttempts()" [disabled]="attemptsLoading">Load More</button>
        </div>

        <div class="section-title" *ngIf="attemptAnswers.length">Attempt Answers ({{ selectedAttemptId }})</div>
        <div class="glass-card review" *ngFor="let a of attemptAnswers; trackBy: trackAttemptAnswer">
          <p class="question">{{ a.question?.question }}</p>
          <p class="answer">Answer: {{ a.answer }}</p>
          <p class="answer correct">Correct: {{ a.question?.correct_answer }}</p>
        </div>

        <app-bottom-nav></app-bottom-nav>
      </div>
    </ion-content>
  `,
  styleUrls: ['./admin.page.css']
})
export class AdminPage {
  exams: Exam[] = [];
  questions: QuizQuestion[] = [];
  users: UserProfile[] = [];
  attempts: any[] = [];
  attemptAnswers: any[] = [];
  selectedAttemptId?: number;

  usersLoading = false;
  usersHasMore = true;
  usersPage = 0;
  usersPageSize = 25;

  attemptsLoading = false;
  attemptsHasMore = true;
  attemptsPage = 0;
  attemptsPageSize = 25;

  selectedExamId?: number;
  questionsJson = '';
  newExam: Partial<Exam> = {
    name: '',
    slug: '',
    description: '',
    duration_seconds: 1200,
    question_limit: 10,
    marks_per_question: 3,
    negative_mark_ratio: 0.333333,
    is_active: true
  };

  constructor(private api: ApiService) {
    this.loadExams();
  }

  loadExams() {
    this.api.adminExams().subscribe(exams => this.exams = exams || []);
  }

  createExam() {
    if (!this.newExam.name || !this.newExam.slug) return;
    this.api.adminCreateExam(this.newExam).subscribe(exam => {
      this.exams = [exam, ...this.exams];
      this.newExam = { name: '', slug: '', description: '', duration_seconds: 1200, question_limit: 10, marks_per_question: 3, negative_mark_ratio: 0.333333, is_active: true };
    });
  }

  toggleExam(exam: Exam) {
    this.api.adminUpdateExam(exam.id, { is_active: !exam.is_active }).subscribe(updated => {
      this.exams = this.exams.map(e => e.id === updated.id ? updated : e);
    });
  }

  loadQuestions() {
    if (!this.selectedExamId) return;
    this.api.adminQuestions(this.selectedExamId).subscribe(qs => this.questions = qs || []);
  }

  onFileSelected(event: any) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.questionsJson = String(reader.result || '');
    };
    reader.readAsText(file);
  }

  importQuestions() {
    if (!this.selectedExamId) return;
    let parsed: QuizQuestion[] = [];
    try {
      const raw = JSON.parse(this.questionsJson || '[]');
      parsed = Array.isArray(raw) ? raw : [];
    } catch {
      return;
    }
    if (parsed.length === 0) return;
    this.api.adminImportQuestions(this.selectedExamId, parsed).subscribe(() => {
      this.questionsJson = '';
      this.loadQuestions();
    });
  }

  deleteQuestion(id: number) {
    this.api.adminDeleteQuestion(id).subscribe(() => {
      this.questions = this.questions.filter(q => q.id !== id);
    });
  }

  toggleUser(user: UserProfile) {
    const nextStatus = (user.status || 'active') === 'active' ? 'suspended' : 'active';
    this.api.adminUpdateUser(user.id, { status: nextStatus }).subscribe(updated => {
      this.users = this.users.map(u => u.id === updated.id ? updated : u);
    });
  }

  viewAttempt(id: number) {
    this.selectedAttemptId = id;
    this.api.adminAttemptAnswers(id).subscribe(ans => {
      this.attemptAnswers = ans || [];
    });
  }

  loadUsers(reset = false) {
    if (this.usersLoading) return;
    if (reset) {
      this.usersPage = 0;
      this.users = [];
      this.usersHasMore = true;
    }
    if (!this.usersHasMore) return;
    this.usersLoading = true;
    const offset = this.usersPage * this.usersPageSize;
    this.api.adminUsers(this.usersPageSize, offset).subscribe({
      next: (users) => {
        const list = users || [];
        this.users = [...this.users, ...list];
        this.usersHasMore = list.length === this.usersPageSize;
        this.usersPage += 1;
        this.usersLoading = false;
      },
      error: () => {
        this.usersLoading = false;
      }
    });
  }

  loadAttempts(reset = false) {
    if (this.attemptsLoading) return;
    if (reset) {
      this.attemptsPage = 0;
      this.attempts = [];
      this.attemptsHasMore = true;
    }
    if (!this.attemptsHasMore) return;
    this.attemptsLoading = true;
    const offset = this.attemptsPage * this.attemptsPageSize;
    this.api.adminAttempts(this.attemptsPageSize, offset).subscribe({
      next: (attempts) => {
        const list = attempts || [];
        this.attempts = [...this.attempts, ...list];
        this.attemptsHasMore = list.length === this.attemptsPageSize;
        this.attemptsPage += 1;
        this.attemptsLoading = false;
      },
      error: () => {
        this.attemptsLoading = false;
      }
    });
  }

  trackExam(index: number, exam: Exam) {
    return exam?.id ?? index;
  }

  trackQuestion(index: number, question: QuizQuestion) {
    return question?.id ?? index;
  }

  trackUser(index: number, user: UserProfile) {
    return user?.id ?? index;
  }

  trackAttempt(index: number, attempt: any) {
    return attempt?.id ?? index;
  }

  trackAttemptAnswer(index: number, attempt: any) {
    return attempt?.id ?? index;
  }
}
