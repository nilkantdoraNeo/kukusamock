import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { ApiService } from '../../services/api.service';
import { UserProfile } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, IonContent, BottomNavComponent],
  template: `
    <ion-content class="app-root">
      <div class="page">
        <header class="topbar">
          <div>
            <div class="title">Leaderboard</div>
            <div class="subtitle">Top performers right now</div>
          </div>
        </header>

        <div class="glass-card empty-state" *ngIf="loading">
          <p class="muted">Loading leaderboard...</p>
        </div>
        <div class="glass-card empty-state" *ngIf="!loading && errorMessage">
          <p class="muted">{{ errorMessage }}</p>
        </div>
        <div class="glass-card empty-state" *ngIf="!loading && !errorMessage && leaderboard.length === 0">
          <p class="muted">No leaderboard data yet.</p>
        </div>

        <div class="glass-card list" *ngFor="let user of leaderboard; let i = index; trackBy: trackUser" [class.me]="isMe(user)">
          <div class="rank" [class.top]="i < 3">#{{ user.rank || (i + 1) }}</div>
          <div class="avatar">
            <img *ngIf="user.avatar_url" [src]="user.avatar_url" alt="avatar" />
            <span *ngIf="!user.avatar_url">{{ initial(user) }}</span>
          </div>
          <div class="info">
            <div class="name">{{ displayName(user) }}</div>
            <div class="muted small">{{ user.email }}</div>
          </div>
          <div class="score">{{ user.score | number:'1.0-2' }}</div>
        </div>

        <app-bottom-nav></app-bottom-nav>
      </div>
    </ion-content>
  `,
  styleUrls: ['./leaderboard.page.css']
})
export class LeaderboardPage implements OnInit {
  leaderboard: UserProfile[] = [];
  loading = false;
  errorMessage = '';

  constructor(private api: ApiService, private cdr: ChangeDetectorRef, private auth: AuthService) {}

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading = true;
    this.errorMessage = '';
    this.api.leaderboard().subscribe({
      next: (list: UserProfile[]) => {
        this.leaderboard = list || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.status === 401 ? 'Please log in to view the leaderboard.' : 'Failed to load leaderboard.';
        this.cdr.detectChanges();
      }
    });
  }

  displayName(user: UserProfile) {
    return user.username || user.email || 'User';
  }

  initial(user: UserProfile) {
    const name = user.username || user.email || 'U';
    return name[0].toUpperCase();
  }

  isMe(user: UserProfile) {
    return !!user?.id && this.auth.user()?.id === user.id;
  }

  trackUser(index: number, user: UserProfile) {
    return user?.id ?? index;
  }
}
