create table if not exists users (
  id text primary key,
  provider text not null,
  provider_user_id text not null,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists users_provider_idx
  on users (provider, provider_user_id);

create table if not exists jobs (
  id text primary key,
  user_id text references users(id),
  status text not null,
  stage text not null,
  progress_pct integer not null default 0,
  paper_title text,
  paper_filename text,
  paper_blob_url text,
  paper_blob_path text,
  gemini_file_uri text,
  gemini_file_mime text,
  gemini_file_created_at timestamptz,
  result_json jsonb,
  result_blob_url text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  attempt_count integer not null default 0
);

create index if not exists jobs_status_idx on jobs (status);

create table if not exists sandbox_snapshots (
  id text primary key,
  language text not null unique,
  runtime text not null,
  snapshot_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists submissions (
  id text primary key,
  job_id text references jobs(id),
  user_id text references users(id),
  language text not null,
  runtime text not null,
  status text not null,
  stage text not null,
  progress_pct integer not null default 0,
  submission_filename text,
  submission_blob_url text,
  result_json jsonb,
  result_blob_url text,
  exit_code integer,
  duration_ms integer,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  attempt_count integer not null default 0
);

create index if not exists submissions_status_idx on submissions (status);
create index if not exists submissions_user_idx on submissions (user_id);
