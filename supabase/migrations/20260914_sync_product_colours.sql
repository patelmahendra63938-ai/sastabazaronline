create schema if not exists private;

create or replace function private.sync_product_colours_from_description()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
declare
  mode_text text;
  colours_text text;
  parsed_colours text[];
begin
  if new.description is not null then
    mode_text := substring(new.description from '• Colour Mode: ([^\n\r]+)');
    colours_text := substring(new.description from '• Available Colours: ([^\n\r]+)');

    if mode_text is not null then
      new.colour_selection_mode := case
        when lower(mode_text) like '%customer selects%' then 'customer'
        when lower(mode_text) like '%assorted%' or lower(mode_text) like '%mixed%' then 'assorted'
        else 'none'
      end;
    end if;

    if colours_text is not null then
      select coalesce(array_agg(trim(x)) filter (where trim(x) <> ''), '{}')
      into parsed_colours
      from unnest(string_to_array(colours_text, ',')) as x;
      new.available_colours := coalesce(parsed_colours, '{}');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_product_colours_from_description on public.products;
create trigger trg_sync_product_colours_from_description
before insert or update of description on public.products
for each row execute function private.sync_product_colours_from_description();

update public.products
set description = description
where description is not null
  and (description like '%Colour Mode:%' or description like '%Available Colours:%');
