import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { ApiService } from '../../services/api.service';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-incorrect',
  standalone: true,
  imports: [CommonModule, IonContent, BottomNavComponent],
  template: `
    <ion-content class="app-root">
      <div class="page">
        <div class="glass-card header-card">
          <div>
            <div class="title">Incorrect Notebook</div>
            <div class="subtitle">Review the questions you answered incorrectly.</div>
          </div>
          <button class="btn-secondary" type="button" (click)="reload()">Refresh</button>
        </div>

        <div class="glass-card empty-state" *ngIf="loading">
          <p class="muted">Loading incorrect answers...</p>
        </div>
        <div class="glass-card empty-state" *ngIf="!loading && errorMessage">
          <p class="muted">{{ errorMessage }}</p>
        </div>
        <div class="glass-card empty-state" *ngIf="!loading && !items.length">
          <p class="muted">No incorrect answers yet.</p>
        </div>

        <div class="section-title" *ngIf="!loading && items.length">Review</div>
        <div class="glass-card review" *ngFor="let item of items; trackBy: trackItem">
          <p class="question">{{ item.question?.question }}</p>
          <div class="answer-row wrong">
            <span class="label">Your Answer</span>
            <span class="value">{{ item.answer || 'Not Answered' }}</span>
          </div>
          <div class="answer-row correct">
            <span class="label">Correct Answer</span>
            <span class="value">{{ item.question?.correct_answer || '--' }}</span>
          </div>

          <div class="option-list">
            <div
              class="option-item"
              *ngFor="let opt of optionsFor(item); trackBy: trackOption"
              [class.selected]="isSelected(item, opt.value)"
              [class.correct]="isCorrect(item, opt.value)"
              [class.wrong]="isSelected(item, opt.value) && !isCorrect(item, opt.value)">
              <span class="option-letter">{{ opt.label }}</span>
              <span class="option-text">{{ opt.value }}</span>
              <span class="option-tags">
                <span class="option-tag selected" *ngIf="isSelected(item, opt.value)" [class.wrong]="!isCorrect(item, opt.value)">Your</span>
                <span class="option-tag correct" *ngIf="isCorrect(item, opt.value)">Correct</span>
              </span>
            </div>
          </div>

          <div class="explanation" *ngIf="explanationFor(item)">
            <div class="explanation-title">Explanation</div>
            <p>{{ explanationFor(item) }}</p>
          </div>
        </div>

        <app-bottom-nav></app-bottom-nav>
      </div>
    </ion-content>
  `,
  styleUrls: ['./incorrect.page.css']
})
export class IncorrectPage implements OnInit {
  items: any[] = [];
  loading = true;
  errorMessage = '';

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.load();
  }

  reload() {
    this.load();
  }

  private load() {
    this.loading = true;
    this.errorMessage = '';
    this.api.incorrectAnswers(50).subscribe({
      next: (res) => {
        this.items = res?.items || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to load incorrect answers.';
        this.cdr.detectChanges();
      }
    });
  }

  optionsFor(item: any) {
    const q = item?.question || {};
    return [
      { label: 'A', value: q.option_a },
      { label: 'B', value: q.option_b },
      { label: 'C', value: q.option_c },
      { label: 'D', value: q.option_d }
    ].filter((opt) => !!opt.value);
  }

  trackItem(index: number, item: any) {
    return item?.id ?? index;
  }

  trackOption(index: number, option: any) {
    return option?.label ?? index;
  }

  normalize(value: string) {
    return String(value || '').trim();
  }

  isSelected(item: any, value: string) {
    return this.normalize(item?.answer || '') === this.normalize(value);
  }

  isCorrect(item: any, value: string) {
    return this.normalize(item?.question?.correct_answer || '') === this.normalize(value);
  }

  explanationFor(item: any) {
    const text = String(item?.question?.explanation || '').trim();
    return text || 'Explanation not available.';
  }
}
