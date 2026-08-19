alter table public.categories
  add column if not exists show_on_homepage boolean not null default true,
  add column if not exists homepage_display_order integer not null default 0,
  add column if not exists homepage_featured boolean not null default false,
  add column if not exists homepage_image_url text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.categories'::regclass
      and conname = 'categories_homepage_display_order_nonnegative'
  ) then
    alter table public.categories
      add constraint categories_homepage_display_order_nonnegative
      check (homepage_display_order >= 0);
  end if;
end
$$;
