alter table favorites
  add column if not exists comment_title text not null default '';
