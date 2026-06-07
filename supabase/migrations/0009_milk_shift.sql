do $$ begin
  create type milk_shift as enum ('morning', 'evening');
exception when duplicate_object then null;
end $$;

alter table public.supplies
  add column if not exists milk_shift milk_shift default 'morning';

update public.supplies
set milk_shift = 'morning'
where milk_shift is null;
