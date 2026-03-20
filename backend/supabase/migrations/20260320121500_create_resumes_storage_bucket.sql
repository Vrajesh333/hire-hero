insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do update
set public = excluded.public;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read resumes'
  ) then
    create policy "Public read resumes"
      on storage.objects
      for select
      using (bucket_id = 'resumes');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public upload resumes'
  ) then
    create policy "Public upload resumes"
      on storage.objects
      for insert
      with check (bucket_id = 'resumes');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public update resumes'
  ) then
    create policy "Public update resumes"
      on storage.objects
      for update
      using (bucket_id = 'resumes')
      with check (bucket_id = 'resumes');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public delete resumes'
  ) then
    create policy "Public delete resumes"
      on storage.objects
      for delete
      using (bucket_id = 'resumes');
  end if;
end
$$;