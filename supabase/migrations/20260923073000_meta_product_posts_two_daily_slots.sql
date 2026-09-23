-- Keep existing Facebook 7 AM and Instagram 7 PM approvals at their original times.
alter table public.meta_product_posts
  add column if not exists slot smallint not null default 1;

alter table public.meta_product_posts
  add constraint meta_product_posts_slot_check check (slot in (1, 2));

update public.meta_product_posts set slot = 2 where channel = 'instagram';

alter table public.meta_product_posts
  drop constraint if exists meta_product_posts_channel_publish_date_key;

alter table public.meta_product_posts
  add constraint meta_product_posts_channel_publish_date_slot_key
  unique (channel, publish_date, slot);
