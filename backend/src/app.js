import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import examRoutes from './routes/exam.routes.js';
import adminRoutes from './routes/admin.routes.js';
import attemptRoutes from './routes/attempt.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const isProd = process.env.NODE_ENV === 'production';
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 204
};

app.disable('etag');
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '7mb' }));
app.use(express.urlencoded({ extended: false, limit: '7mb' }));
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
// Back-compat / common typo route
app.use('/api/quizz', quizRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/attempts', attemptRoutes);

if (isProd) {
  const staticPath = path.join(__dirname, '../../frontend/dist/quiz-mobile-app');
  app.use(express.static(staticPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.sendFile(path.join(staticPath, 'index.html'));
  });
}

app.use(errorHandler);

export default app;
