import { Component, effect, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonInput, IonItem, IonLabel } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserProfile } from '../../models/user.model';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonInput, IonItem, IonLabel, BottomNavComponent],
  template: `
    <ion-content class="app-root">
      <div class="page">
        <header class="topbar">
          <div class="title">Kukusa Mock</div>
        </header>

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
            <div class="notice" *ngIf="notice">{{ notice }}</div>
            <div class="tab-row">
              <button class="tab" type="button" [class.active]="mode==='login'" (click)="mode='login'">Login</button>
              <button class="tab" type="button" [class.active]="mode==='signup'" (click)="mode='signup'">Signup</button>
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

            <button class="btn-primary" type="submit">Continue</button>
          </form>
        </ng-template>

        <app-bottom-nav *ngIf="auth.user()"></app-bottom-nav>
      </div>
    </ion-content>
  `,
  styleUrls: ['./profile.page.css']
})
export class ProfilePage {
  email = '';
  password = '';
  mode: 'login' | 'signup' = 'login';
  returnUrl = '/home';
  notice = '';

  signupUsername = '';
  signupPhone = '';
  signupAge: number | null = null;

  profileUsername = '';
  profilePhone = '';
  profileAge: number | null = null;
  avatarPreview = '';
  avatarData = '';

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

  submit() {
    if (this.mode === 'signup') {
      if (!this.signupUsername || !this.signupPhone || !this.signupAge) {
        this.notice = 'Please fill all signup fields.';
        return;
      }
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
          this.navigateAfterAuth();
        },
        error: (err) => {
          const rawMessage = String(err?.error?.message || '');
          const messageLower = rawMessage.toLowerCase();
          if (err?.status === 409 || messageLower.includes('already')) {
            this.notice = 'User already exists. Please log in.';
            this.mode = 'login';
            this.password = '';
            return;
          }
          this.notice = rawMessage || 'Signup failed. Please try again.';
        }
      });
      return;
    }

    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.notice = '';
        this.syncProfile(res.user);
        this.navigateAfterAuth();
      },
      error: (err) => {
        this.notice = err?.error?.message || 'Login failed. Please try again.';
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
}
