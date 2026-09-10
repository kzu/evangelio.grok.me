create table if not exists favorites (
  user_id text not null,
  gospel_date text not null,
  edition text not null default 'adult',
  citation text not null default '',
  liturgical_day text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, gospel_date, edition)
);

create index if not exists favorites_user_created_idx on favorites (user_id, created_at desc);
