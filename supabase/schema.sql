  create table if not exists public.users (
    id uuid primary key references auth.users (id) on delete cascade,
    email text unique not null,
    username text,
    phone text,
    age integer,
    avatar_url text,
    score numeric(10,2) not null default 0,
    rank integer not null default 0,
    status text not null default 'active',
    is_admin boolean not null default false,
    created_at timestamptz not null default now()
  );
  alter table public.users add column if not exists username text;
  alter table public.users add column if not exists phone text;
  alter table public.users add column if not exists age integer;
  alter table public.users add column if not exists avatar_url text;
  alter table public.users add column if not exists status text not null default 'active';
  alter table public.users add column if not exists is_admin boolean not null default false;
  alter table public.users add column if not exists created_at timestamptz not null default now();

  create table if not exists public.exams (
    id bigserial primary key,
    name text not null,
    slug text unique not null,
    description text,
    is_active boolean not null default true,
    duration_seconds integer not null default 1200,
    question_limit integer not null default 10,
    marks_per_question numeric(10,2) not null default 3,
    negative_mark_ratio numeric(10,6) not null default 0.333333,
    created_at timestamptz not null default now()
  );

  create table if not exists public.quizzes (
    id bigserial primary key,
    exam_id bigint references public.exams (id) on delete cascade,
    question text not null,
    option_a text not null,
    option_b text not null,
    option_c text not null,
    option_d text not null,
    correct_answer text not null,
    difficulty text not null default 'medium',
    is_active boolean not null default true,
    explanation text
  );
  alter table public.quizzes add column if not exists exam_id bigint references public.exams (id) on delete cascade;
  alter table public.quizzes add column if not exists difficulty text not null default 'medium';
  alter table public.quizzes add column if not exists is_active boolean not null default true;
  alter table public.quizzes add column if not exists explanation text;

  alter table public.exams add column if not exists marks_per_question numeric(10,2) not null default 3;
  alter table public.exams add column if not exists negative_mark_ratio numeric(10,6) not null default 0.333333;

  alter table public.users alter column score type numeric(10,2) using score::numeric;
  alter table public.results alter column score type numeric(10,2) using score::numeric;
  alter table public.attempts alter column score type numeric(10,2) using score::numeric;

  create table if not exists public.results (
    id bigserial primary key,
    user_id uuid not null references public.users (id) on delete cascade,
    score numeric(10,2) not null,
    created_at timestamptz not null default now()
  );

  create table if not exists public.attempts (
    id bigserial primary key,
    user_id uuid not null references public.users (id) on delete cascade,
    exam_id bigint references public.exams (id) on delete set null,
    score numeric(10,2) not null default 0,
    correct_count integer not null default 0,
    total_count integer not null default 0,
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    created_at timestamptz not null default now()
  );

  create table if not exists public.attempt_answers (
    id bigserial primary key,
    attempt_id bigint not null references public.attempts (id) on delete cascade,
    question_id bigint references public.quizzes (id) on delete set null,
    answer text not null,
    is_correct boolean not null default false
  );

  create index if not exists quizzes_exam_id_idx on public.quizzes(exam_id);
  create index if not exists results_user_id_idx on public.results(user_id);
  create index if not exists attempts_user_id_idx on public.attempts(user_id);
  create index if not exists attempts_exam_id_idx on public.attempts(exam_id);
  create index if not exists attempt_answers_attempt_id_idx on public.attempt_answers(attempt_id);

  alter table public.users enable row level security;
  alter table public.results enable row level security;
  alter table public.attempts enable row level security;
  alter table public.attempt_answers enable row level security;
  alter table public.exams enable row level security;

  create policy "Users can view their profile" on public.users
    for select using (auth.uid() = id);

  create policy "Users can update their profile" on public.users
    for update using (auth.uid() = id);

  create policy "Users can view their results" on public.results
    for select using (auth.uid() = user_id);

  create policy "Users can insert results" on public.results
    for insert with check (auth.uid() = user_id);

  create policy "Users can view their attempts" on public.attempts
    for select using (auth.uid() = user_id);

  create policy "Users can insert attempts" on public.attempts
    for insert with check (auth.uid() = user_id);

  create policy "Users can view their attempt answers" on public.attempt_answers
    for select using (exists (
      select 1 from public.attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    ));

  create policy "Public can view active exams" on public.exams
    for select using (is_active = true);

  create or replace function public.increment_user_score(p_user_id uuid, p_delta numeric)
  returns public.users
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare updated public.users;
  begin
    update public.users
    set score = round((score + coalesce(p_delta, 0))::numeric, 2)
    where id = p_user_id
    returning * into updated;
    return updated;
  end;
  $$;

  create or replace function public.recalc_ranks()
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    with ranked as (
      select id, row_number() over (order by score desc, created_at asc) as r
      from public.users
    )
    update public.users u
    set rank = ranked.r
    from ranked
    where u.id = ranked.id;
  end;
  $$;
