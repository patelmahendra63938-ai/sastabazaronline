alter table public.products
  add column if not exists colour_selection_mode text not null default 'none',
  add column if not exists available_colours text[] not null default '{}';
