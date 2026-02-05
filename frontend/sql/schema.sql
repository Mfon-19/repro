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
