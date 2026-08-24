-- Accounting registers. Apply only after reviewing in the Supabase SQL editor.
create table if not exists public.supplier_tax_invoices (
  id uuid primary key default gen_random_uuid(), supplier_name text not null,
  supplier_gstin text, invoice_number text not null, invoice_date date not null,
  taxable_amount numeric(12,2) not null check (taxable_amount >= 0),
  cgst numeric(12,2) not null default 0, sgst numeric(12,2) not null default 0,
  igst numeric(12,2) not null default 0, total_amount numeric(12,2) not null check (total_amount >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  notes text, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  unique (supplier_name, invoice_number)
);

create table if not exists public.cod_settlements (
  id uuid primary key default gen_random_uuid(), partner_name text not null,
  settlement_reference text not null unique, settlement_date date not null,
  order_count integer not null default 0 check (order_count >= 0),
  cod_collected numeric(12,2) not null check (cod_collected >= 0),
  courier_charge numeric(12,2) not null default 0, cod_charge numeric(12,2) not null default 0,
  rto_charge numeric(12,2) not null default 0, other_deduction numeric(12,2) not null default 0,
  net_bank_credit numeric(12,2) generated always as
    (cod_collected-courier_charge-cod_charge-rto_charge-other_deduction) stored,
  bank_utr text, status text not null default 'PENDING' check (status in ('PENDING','CREDITED')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.credit_notes (
  id uuid primary key default gen_random_uuid(), credit_note_number text not null unique,
  order_id uuid references public.orders(id), issue_date date not null,
  reason text not null, taxable_amount numeric(12,2) not null check (taxable_amount >= 0),
  cgst numeric(12,2) not null default 0, sgst numeric(12,2) not null default 0,
  igst numeric(12,2) not null default 0, total_amount numeric(12,2) not null check (total_amount >= 0),
  refund_reference text, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);

alter table public.supplier_tax_invoices enable row level security;
alter table public.cod_settlements enable row level security;
alter table public.credit_notes enable row level security;

create or replace function public.is_accounts_staff() returns boolean language sql stable security definer
set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin','staff'));
$$;

drop policy if exists "accounts staff supplier invoices" on public.supplier_tax_invoices;
create policy "accounts staff supplier invoices" on public.supplier_tax_invoices for all to authenticated
using (public.is_accounts_staff()) with check (public.is_accounts_staff());
drop policy if exists "accounts staff cod settlements" on public.cod_settlements;
create policy "accounts staff cod settlements" on public.cod_settlements for all to authenticated
using (public.is_accounts_staff()) with check (public.is_accounts_staff());
drop policy if exists "accounts staff credit notes" on public.credit_notes;
create policy "accounts staff credit notes" on public.credit_notes for all to authenticated
using (public.is_accounts_staff()) with check (public.is_accounts_staff());
