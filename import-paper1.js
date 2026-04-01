const fs = require('fs');
const { createClient } = require('C:/Users/Client/Desktop/Quiz/backend/node_modules/@supabase/supabase-js');

const textPath = 'C:/Users/Client/Desktop/Quiz/paper1.txt';
const envPath = 'C:/Users/Client/Desktop/Quiz/backend/.env';

const START_MARKER = 'General Medicine and Pediatrics';

function loadEnv(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    env[key] = val;
  }
  return env;
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeLines(lines) {
  const cleaned = [];
  let lastBlank = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (!lastBlank) cleaned.push('');
      lastBlank = true;
      continue;
    }
    cleaned.push(normalizeWhitespace(trimmed));
    lastBlank = false;
  }
  return cleaned.join('\n').trim();
}

function parseQuestions(text) {
  const lines = text.split(/\r?\n/);
  const questions = [];
  let current = null;
  let currentOption = null;
  let started = false;

  const questionStart = /^(\d+)\.\s+(.*)$/;
  const optionStart = /^([a-dA-D])\.\s*(.*)$/;
  const marksLine = /^\(\+?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\)$/;
  const pageMarker = /^--\s*\d+\s+of\s+\d+\s*--$/;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, '');
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (pageMarker.test(trimmed)) continue;
    if (trimmed === 'Answers') break;
    if (trimmed === START_MARKER) {
      started = true;
      continue;
    }
    if (!started) continue;
    if (marksLine.test(trimmed)) continue;

    const qMatch = trimmed.match(questionStart);
    if (qMatch) {
      if (current) {
        current.question = current.questionLines.join('\n').trim();
        delete current.questionLines;
        questions.push(current);
      }
      current = {
        number: Number(qMatch[1]),
        questionLines: [qMatch[2].trim()],
        options: {}
      };
      currentOption = null;
      continue;
    }

    if (!current) continue;

    const oMatch = trimmed.match(optionStart);
    if (oMatch) {
      const letter = oMatch[1].toLowerCase();
      currentOption = letter;
      current.options[letter] = oMatch[2].trim();
      continue;
    }

    if (currentOption) {
      current.options[currentOption] = normalizeWhitespace(`${current.options[currentOption]} ${trimmed}`);
    } else {
      current.questionLines.push(trimmed);
    }
  }

  if (current) {
    current.question = current.questionLines.join('\n').trim();
    delete current.questionLines;
    questions.push(current);
  }

  return questions;
}

function parseAnswers(text) {
  const lines = text.split(/\r?\n/);
  const answers = new Map();
  let currentNum = null;
  let currentAnswer = null;
  let currentLines = [];

  const answerStart = /^(\d+)\.\s*Answer:\s*([a-dA-D])\b/;
  const pageMarker = /^--\s*\d+\s+of\s+\d+\s*--$/;

  function finalize() {
    if (currentNum === null) return;
    answers.set(currentNum, {
      answer: currentAnswer,
      explanation: normalizeLines(currentLines)
    });
  }

  let inAnswers = false;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, '');
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentNum !== null) currentLines.push('');
      continue;
    }
    if (pageMarker.test(trimmed)) continue;

    if (!inAnswers) {
      if (trimmed === 'Answers') {
        inAnswers = true;
      }
      continue;
    }

    const aMatch = trimmed.match(answerStart);
    if (aMatch) {
      finalize();
      currentNum = Number(aMatch[1]);
      currentAnswer = aMatch[2].toLowerCase();
      currentLines = [];
      continue;
    }

    if (!currentNum) continue;

    if (/^Explanation:/i.test(trimmed)) {
      const rest = trimmed.replace(/^Explanation:\s*/i, '').trim();
      if (rest) currentLines.push(rest);
      continue;
    }

    if (/^Final Answer$/i.test(trimmed)) continue;

    currentLines.push(trimmed);
  }

  finalize();
  return answers;
}

async function main() {
  const env = loadEnv(envPath);
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in backend/.env');
  }

  const text = fs.readFileSync(textPath, 'utf8');
  const questions = parseQuestions(text);
  const answers = parseAnswers(text);

  if (questions.length === 0) throw new Error('No questions parsed');

  const merged = questions.map((q) => {
    const answerEntry = answers.get(q.number);
    return {
      number: q.number,
      question: q.question,
      option_a: normalizeWhitespace(q.options.a || ''),
      option_b: normalizeWhitespace(q.options.b || ''),
      option_c: normalizeWhitespace(q.options.c || ''),
      option_d: normalizeWhitespace(q.options.d || ''),
      correct_answer: answerEntry?.answer || '',
      explanation: answerEntry?.explanation || ''
    };
  });

  const uniqueNums = new Set(merged.map(m => m.number));
  if (uniqueNums.size !== 120) {
    throw new Error(`Expected 120 unique questions, got ${uniqueNums.size}`);
  }

  const missingAnswers = merged.filter(m => !m.correct_answer).map(m => m.number);
  const missingOptions = merged.filter(m => !m.option_a || !m.option_b || !m.option_c || !m.option_d).map(m => m.number);

  console.log(`Parsed questions: ${merged.length}`);
  console.log(`Missing answers: ${missingAnswers.length}`);
  console.log(`Missing options: ${missingOptions.length}`);

  if (missingOptions.length) {
    console.log('Missing options for:', missingOptions.slice(0, 10).join(', '));
    throw new Error('Some questions are missing options');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // Truncate quiz-related tables (keep users)
  const tables = ['attempt_answers', 'attempts', 'results', 'quizzes', 'exams'];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', 0);
    if (error) throw error;
  }

  // Create exam
  const examPayload = {
    name: 'CMS 2025 Paper 1',
    slug: 'cms-2025-paper-1',
    description: 'UPSC CMS 2025 General Medicine and Pediatrics',
    is_active: true,
    duration_seconds: 7200,
    question_limit: merged.length,
    marks_per_question: 2.08,
    negative_mark_ratio: 0.333333
  };

  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert(examPayload)
    .select()
    .single();

  if (examError) throw examError;

  const rows = merged.map((item) => ({
    exam_id: exam.id,
    question: item.question,
    option_a: item.option_a,
    option_b: item.option_b,
    option_c: item.option_c,
    option_d: item.option_d,
    correct_answer: item.correct_answer,
    explanation: item.explanation,
    difficulty: 'medium',
    is_active: true
  }));

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('quizzes').insert(batch);
    if (error) throw error;
  }

  console.log('Import completed.');
}

main().catch((err) => {
  console.error('Import failed:', err.message || err);
  process.exit(1);
});
