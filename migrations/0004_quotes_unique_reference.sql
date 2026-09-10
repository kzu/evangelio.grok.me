-- One saved citation per user + gospel verse-range reference.
delete from quotes a
where exists (
  select 1 from quotes b
  where b.user_id = a.user_id
    and b.reference = a.reference
    and b.id > a.id
);

create unique index if not exists quotes_user_reference_key
  on quotes (user_id, reference);
