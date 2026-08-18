-- SyncSpace 27일 차: 태스크 파일 첨부 (Supabase Storage)
-- Supabase Dashboard > SQL Editor 에 붙여 넣고 Run 하세요.

-- 1) 파일 버킷 (비공개: 로그인한 워크스페이스 멤버만 접근)
insert into storage.buckets (id, name, public, file_size_limit)
values ('task-files', 'task-files', false, 5242880)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit;

-- 2) 첨부 메타데이터 테이블
create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  file_size integer not null default 0,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists task_attachments_task_id_idx
  on public.task_attachments (task_id, created_at);

alter table public.task_attachments enable row level security;

drop policy if exists "members can read attachments" on public.task_attachments;
create policy "members can read attachments"
on public.task_attachments
for select
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = task_attachments.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "members can insert attachments" on public.task_attachments;
create policy "members can insert attachments"
on public.task_attachments
for insert
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = task_attachments.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "members can delete attachments" on public.task_attachments;
create policy "members can delete attachments"
on public.task_attachments
for delete
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = task_attachments.workspace_id
      and wm.user_id = auth.uid()
  )
);

-- 3) Storage 객체 권한: 경로 첫 폴더가 workspace_id
drop policy if exists "members can read task files" on storage.objects;
create policy "members can read task files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'task-files'
  and exists (
    select 1 from public.workspace_members wm
    where wm.user_id = auth.uid()
      and wm.workspace_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "members can upload task files" on storage.objects;
create policy "members can upload task files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'task-files'
  and exists (
    select 1 from public.workspace_members wm
    where wm.user_id = auth.uid()
      and wm.workspace_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "members can delete task files" on storage.objects;
create policy "members can delete task files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'task-files'
  and exists (
    select 1 from public.workspace_members wm
    where wm.user_id = auth.uid()
      and wm.workspace_id::text = (storage.foldername(name))[1]
  )
);

alter table public.task_attachments replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.task_attachments;
  exception
    when duplicate_object then null;
  end;
end $$;
