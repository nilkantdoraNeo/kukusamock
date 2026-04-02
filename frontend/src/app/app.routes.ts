import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },

  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage),
    canActivate: [authGuard]
  },

  {
    path: 'quiz/:examId',
    loadComponent: () => import('./pages/quiz/quiz.page').then(m => m.QuizPage),
    canActivate: [authGuard]
  },

  { path: 'quiz', redirectTo: 'home', pathMatch: 'full' },

  {
    path: 'result',
    loadComponent: () => import('./pages/result/result.page').then(m => m.ResultPage),
    canActivate: [authGuard]
  },

  {
    path: 'leaderboard',
    loadComponent: () => import('./pages/leaderboard/leaderboard.page').then(m => m.LeaderboardPage),
    canActivate: [authGuard]
  },

  {
    path: 'incorrect',
    loadComponent: () => import('./pages/incorrect/incorrect.page').then(m => m.IncorrectPage),
    canActivate: [authGuard]
  },

  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage)
    // add authGuard if needed
  },

  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.page').then(m => m.AdminPage),
    canActivate: [authGuard, adminGuard]
  },

  { path: '**', redirectTo: 'home' }
];
