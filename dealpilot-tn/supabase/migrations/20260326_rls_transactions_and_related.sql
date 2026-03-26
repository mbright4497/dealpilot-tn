-- Enable strict per-user RLS on transactions and related tables.
-- Uses column-aware policy generation so mixed schema versions do not fail.

alter table if exists public.transactions enable row level security;

do $$
begin
  if to_regclass('public.transactions') is not null then
    execute 'drop policy if exists "Users can only see their own transactions" on public.transactions';

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'transactions'
        and column_name = 'user_id'
    ) then
      execute 'create policy "Users can only see their own transactions" on public.transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid())';
    elsif exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'transactions'
        and column_name = 'owner_id'
    ) then
      execute 'create policy "Users can only see their own transactions" on public.transactions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())';
    end if;
  end if;
end $$;

do $$
declare
  t text;
  policy_name text;
begin
  foreach t in array array['deadlines', 'deal_contacts', 'communications', 'deal_documents', 'deal_milestones']
  loop
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);
    policy_name := format('Users can only see their own %s', t);
    execute format(
      'drop policy if exists "Users can only see their own %s" on public.%I',
      t, t
    );

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = t
        and column_name = 'user_id'
    ) then
      execute format(
        'create policy %L on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
        policy_name, t
      );
    elsif exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = t
        and column_name = 'transaction_id'
    ) then
      execute format(
        'create policy %L on public.%I for all using (transaction_id in (select id from public.transactions where user_id = auth.uid()))',
        policy_name, t
      );
    elsif exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = t
        and column_name = 'deal_id'
    ) then
      execute format(
        'create policy %L on public.%I for all using (deal_id in (select id from public.transactions where user_id = auth.uid()))',
        policy_name, t
      );
    end if;
  end loop;
end $$;
