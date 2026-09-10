alter table quotes add column if not exists slug text not null default '';

create index if not exists quotes_slug_idx on quotes (slug);
