import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [],
  template: `
    <nav class="bottom-nav" aria-label="Primary">
      <button class="nav-item" type="button" [class.active]="isActive('/home')" (click)="go('/home')">
        <span class="nav-icon">H</span>
        <span>Home</span>
      </button>
      <button class="nav-item" type="button" [class.active]="isActive('/leaderboard')" (click)="go('/leaderboard')">
        <span class="nav-icon">L</span>
        <span>Board</span>
      </button>
      <button class="nav-item" type="button" [class.active]="isActive('/result')" (click)="go('/result')">
        <span class="nav-icon">R</span>
        <span>Result</span>
      </button>
      <button class="nav-item" type="button" [class.active]="isActive('/profile')" (click)="go('/profile')">
        <span class="nav-icon">P</span>
        <span>Profile</span>
      </button>
    </nav>
  `,
  styleUrls: ['./bottom-nav.component.css']
})
export class BottomNavComponent {
  currentUrl = '';

  constructor(private router: Router) {
    this.currentUrl = this.router.url;
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl = event.urlAfterRedirects;
      });
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }

  isActive(path: string) {
    return this.currentUrl === path || this.currentUrl.startsWith(`${path}/`);
  }
}
