create table if not exists quotes (
  id serial primary key,
  user_id text not null,
  gospel_date text not null,
  edition text not null default 'adult',
  book text not null default '',
  reference text not null,
  mode text not null,
  body text not null,
  verse_start integer not null default 0,
  verse_end integer not null default 0,
  chapter_start integer not null default 0,
  chapter_end integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quotes_user_created_idx on quotes (user_id, created_at desc);
