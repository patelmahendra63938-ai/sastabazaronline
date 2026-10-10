create table public.whatsapp_messages (
 id uuid primary key default gen_random_uuid(),
 meta_id text unique,
 phone_number_id text not null,
 wa_id text not null check (wa_id ~ '^[0-9]{7,15}$'),
 contact_name text,
 direction text not null check (direction in ('inbound','outbound')),
 message_type text not null default 'text',
 body text not null,
 message_at timestamptz not null default now(),
 status text not null check (status in ('received','pending','accepted','unknown','sent','delivered','read','failed')),
 error_code text,
 error_message text,
 sent_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index whatsapp_messages_contact_time on public.whatsapp_messages(phone_number_id,wa_id,message_at desc);
alter table public.whatsapp_messages enable row level security;
revoke all on public.whatsapp_messages from anon, authenticated;
grant select,insert,update on public.whatsapp_messages to service_role;
create function public.whatsapp_inbox_contacts()
returns table(wa_id text,contact_name text,body text,message_at timestamptz,last_inbound timestamptz)
language sql stable security invoker set search_path=public
as $$
 select distinct on (m.wa_id) m.wa_id,
 (select n.contact_name from public.whatsapp_messages n where n.wa_id=m.wa_id and n.phone_number_id=m.phone_number_id and n.contact_name is not null order by n.message_at desc limit 1),
 m.body,m.message_at,
 (select max(i.message_at) from public.whatsapp_messages i where i.wa_id=m.wa_id and i.phone_number_id=m.phone_number_id and i.direction='inbound')
 from public.whatsapp_messages m where m.phone_number_id='1345111615361404'
 order by m.wa_id,m.message_at desc
$$;
revoke all on function public.whatsapp_inbox_contacts() from public,anon,authenticated;
grant execute on function public.whatsapp_inbox_contacts() to service_role;
