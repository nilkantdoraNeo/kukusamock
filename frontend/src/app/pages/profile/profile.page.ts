import { Component, effect, NgZone, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonInput, IonItem, IonLabel } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserProfile } from '../../models/user.model';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonInput, IonItem, IonLabel, BottomNavComponent],
  template: `
    <ion-content class="app-root">
      <button
        class="theme-toggle"
        type="button"
        (click)="toggleTheme()"
        [attr.aria-label]="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
        <span class="toggle-icon" aria-hidden="true">
          <svg *ngIf="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="5" />
            <g stroke-linecap="round">
              <line x1="12" y1="1.5" x2="12" y2="4.2" />
              <line x1="12" y1="19.8" x2="12" y2="22.5" />
              <line x1="1.5" y1="12" x2="4.2" y2="12" />
              <line x1="19.8" y1="12" x2="22.5" y2="12" />
              <line x1="4.2" y1="4.2" x2="6.1" y2="6.1" />
              <line x1="17.9" y1="17.9" x2="19.8" y2="19.8" />
              <line x1="4.2" y1="19.8" x2="6.1" y2="17.9" />
              <line x1="17.9" y1="6.1" x2="19.8" y2="4.2" />
            </g>
          </svg>
          <svg *ngIf="theme !== 'dark'" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 14.5a8.5 8.5 0 1 1-11.5-11 9.5 9.5 0 1 0 11.5 11Z" />
          </svg>
        </span>
      </button>
      <div class="theme-wipe" *ngIf="isTransitioning" [style.background]="wipeColor"></div>
      <div class="page auth-shell">
        <header class="topbar" *ngIf="auth.user(); else authHeader">
          <div>
            <div class="title">Candidate Profile</div>
            <div class="subtitle">Keep your exam identity and contact details updated.</div>
          </div>
        </header>
        <ng-template #authHeader>
          <header class="auth-header">
            <div class="header-row">
              <div>
                <div class="title">Medico Practice Portal</div>
                <div class="subtitle">Log in to start timed clinical mocks and review answers.</div>
                <div class="header-stickers">
                  <span class="sticker accent">NEET‑PG</span>
                  <span class="sticker">FMGE</span>
                  <span class="sticker soft">Clinical MCQs</span>
                </div>
              </div>
              <div class="seal" aria-hidden="true">
                <div class="seal-icon">+</div>
                <div class="seal-text">MBBS</div>
              </div>
            </div>
            <div class="pulse-line" aria-hidden="true"></div>
          </header>
        </ng-template>

        <div class="glass-card profile-card" *ngIf="auth.user(); else authForm">
          <div class="profile-header">
            <div class="avatar-lg">
              <img *ngIf="avatarPreview" [src]="avatarPreview" alt="Avatar" />
              <span *ngIf="!avatarPreview">{{ displayInitial() }}</span>
            </div>
            <div>
              <div class="profile-name">{{ displayName() }}</div>
              <div class="muted">{{ auth.user()?.email }}</div>
            </div>
          </div>

          <div class="notice" *ngIf="notice">{{ notice }}</div>

          <div class="form-grid">
            <label>Username</label>
            <input class="text-input" type="text" [(ngModel)]="profileUsername" />

            <label>Email</label>
            <input class="text-input" type="email" [value]="auth.user()?.email" disabled />

            <label>Phone</label>
            <input class="text-input" type="tel" [(ngModel)]="profilePhone" />

            <label>Age</label>
            <input class="text-input" type="number" [(ngModel)]="profileAge" />
          </div>

          <div class="upload-row">
            <label class="upload-btn">
              Upload Photo
              <input type="file" accept="image/*" (change)="onAvatarSelected($event)" />
            </label>
            <span class="muted small">PNG or JPG, max 5MB</span>
          </div>

          <div class="button-row">
            <button class="btn-primary" type="button" (click)="saveProfile()">Save Changes</button>
            <button class="btn-secondary" type="button" (click)="logout()">Logout</button>
          </div>
        </div>

        <ng-template #authForm>
          <form class="glass-card form" (ngSubmit)="submit()">
            <div class="form-head">
              <div class="form-title">{{ mode === 'login' ? 'Medico Login' : 'Create Medico Account' }}</div>
              <div class="form-sub">
                {{ mode === 'login'
                  ? 'Resume clinical practice tests and review your attempts.'
                  : 'Start clinical mocks with focused feedback.' }}
              </div>
            </div>
            <div class="sticker-row">
              <span class="sticker accent">Timed</span>
              <span class="sticker">Negative Marking</span>
              <span class="sticker soft">Smart Review</span>
            </div>
            <div class="notice" *ngIf="notice">{{ notice }}</div>
            <div class="tab-row">
              <button class="tab" type="button" [class.active]="mode==='login'" (click)="mode='login'" [disabled]="authLoading">Login</button>
              <button class="tab" type="button" [class.active]="mode==='signup'" (click)="mode='signup'" [disabled]="authLoading">Signup</button>
            </div>

            <ion-item class="input" *ngIf="mode === 'signup'">
              <ion-label position="stacked">Username</ion-label>
              <ion-input name="username" type="text" [(ngModel)]="signupUsername"></ion-input>
            </ion-item>

            <ion-item class="input">
              <ion-label position="stacked">Email</ion-label>
              <ion-input name="email" type="email" autocomplete="username" [(ngModel)]="email"></ion-input>
            </ion-item>

            <ion-item class="input" *ngIf="mode === 'signup'">
              <ion-label position="stacked">Phone</ion-label>
              <ion-input name="phone" type="tel" [(ngModel)]="signupPhone"></ion-input>
            </ion-item>

            <ion-item class="input" *ngIf="mode === 'signup'">
              <ion-label position="stacked">Age</ion-label>
              <ion-input name="age" type="number" [(ngModel)]="signupAge"></ion-input>
            </ion-item>

            <ion-item class="input">
              <ion-label position="stacked">Password</ion-label>
              <ion-input name="password" type="password" autocomplete="current-password" [(ngModel)]="password"></ion-input>
            </ion-item>

            <button class="btn-primary" type="submit" [disabled]="authLoading">
              {{ authLoading
                ? (mode === 'login' ? 'Logging in...' : 'Creating account...')
                : (mode === 'login' ? 'Login & Start Practice' : 'Create Account') }}
            </button>
          </form>
        </ng-template>

        <app-bottom-nav *ngIf="auth.user()"></app-bottom-nav>
      </div>
    </ion-content>
  `,
  styleUrls: ['./profile.page.css']
})
export class ProfilePage {
  private document = inject(DOCUMENT);
  private themeService = inject(ThemeService);
  email = '';
  password = '';
  mode: 'login' | 'signup' = 'login';
  returnUrl = '/home';
  notice = '';
  authLoading = false;

  signupUsername = '';
  signupPhone = '';
  signupAge: number | null = null;

  profileUsername = '';
  profilePhone = '';
  profileAge: number | null = null;
  avatarPreview = '';
  avatarData = '';
  isTransitioning = false;
  wipeColor = '';
  private wipeTimer: number | undefined;

  constructor(
    public auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private zone: NgZone
  ) {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (returnUrl) {
      this.returnUrl = returnUrl;
    }
    if (reason === 'auth') {
      this.notice = 'Please log in to continue.';
    }
    if (reason === 'admin') {
      this.notice = 'Admin access required.';
    }

    effect(() => {
      const profile = this.auth.user();
      if (profile) {
        this.syncProfile(profile);
      }
    });

    if (this.auth.getToken()) {
      this.auth.loadProfile().subscribe({
        next: (profile) => this.syncProfile(profile)
      });
    }
  }

  get theme() {
    return this.themeService.theme;
  }

  toggleTheme() {
    const next = this.themeService.theme === 'dark' ? 'light' : 'dark';
    this.wipeColor = next === 'light' ? '#0b0b0b' : '#ffffff';
    this.themeService.applyTheme(next);
    this.startWipe();
  }

  submit() {
    if (this.authLoading) return;
    if (this.mode === 'signup') {
      if (!this.signupUsername || !this.signupPhone || !this.signupAge) {
        this.notice = 'Please fill all signup fields.';
        return;
      }
      this.authLoading = true;
      this.auth.signup({
        username: this.signupUsername,
        email: this.email,
        phone: this.signupPhone,
        age: Number(this.signupAge),
        password: this.password
      }).subscribe({
        next: (res) => {
          this.notice = '';
          this.syncProfile(res.user);
          this.authLoading = false;
          this.navigateAfterAuth();
        },
        error: (err) => {
          const rawMessage = String(err?.error?.message || '');
          const messageLower = rawMessage.toLowerCase();
          if (err?.status === 409 || messageLower.includes('already')) {
            this.notice = 'User already exists. Please log in.';
            this.mode = 'login';
            this.password = '';
            this.authLoading = false;
            return;
          }
          this.notice = rawMessage || 'Signup failed. Please try again.';
          this.authLoading = false;
        }
      });
      return;
    }

    this.authLoading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.notice = '';
        this.syncProfile(res.user);
        this.authLoading = false;
        this.navigateAfterAuth();
      },
      error: (err) => {
        this.notice = err?.error?.message || 'Login failed. Please try again.';
        this.authLoading = false;
      }
    });
  }

  saveProfile() {
    const payload: Partial<UserProfile> = {};
    const username = (this.profileUsername || '').trim();
    const phone = (this.profilePhone || '').trim();
    if (username) payload.username = username;
    if (phone) payload.phone = phone;
    if (this.profileAge !== null && this.profileAge !== undefined && String(this.profileAge).trim() !== '') {
      payload.age = Number(this.profileAge);
    }
    if (this.avatarData) {
      payload.avatar_url = this.avatarData;
    }
    this.auth.updateProfile(payload).subscribe({
      next: (profile) => {
        this.notice = 'Profile updated.';
        this.avatarData = '';
        this.avatarPreview = profile.avatar_url || this.avatarPreview;
      },
      error: (err) => {
        this.notice = err?.error?.message || 'Unable to update profile.';
      }
    });
  }

  onAvatarSelected(event: any) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.notice = 'Image too large. Please upload under 5MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = String(reader.result || '');
      this.avatarData = this.avatarPreview;
      this.notice = '';
    };
    reader.readAsDataURL(file);
  }

  logout() {
    this.auth.logout();
  }

  displayName() {
    const profile = this.auth.user();
    return profile?.username || profile?.email?.split('@')[0] || 'User';
  }

  displayInitial() {
    const name = this.displayName();
    return name ? name[0].toUpperCase() : 'U';
  }

  private syncProfile(profile: UserProfile) {
    this.profileUsername = profile?.username || '';
    this.profilePhone = profile?.phone || '';
    this.profileAge = profile?.age ?? null;
    this.avatarPreview = profile?.avatar_url || '';
  }

  private navigateAfterAuth() {
    const target = this.returnUrl || '/home';
    this.zone.run(() => {
      this.router.navigateByUrl(target, { replaceUrl: true });
    });
  }

  private startWipe() {
    if (this.wipeTimer) {
      window.clearTimeout(this.wipeTimer);
    }
    this.isTransitioning = true;
    this.document.documentElement.classList.add('theme-transition');
    this.wipeTimer = window.setTimeout(() => {
      this.isTransitioning = false;
      this.document.documentElement.classList.remove('theme-transition');
    }, 1000);
  }
}
