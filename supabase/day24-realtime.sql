-- SyncSpace 24일 차: Realtime + 태그 + 댓글 스키마
-- Supabase Dashboard > SQL Editor 에 붙여 넣고 실행하세요.

-- 1) 태스크 태그 컬럼
alter table public.tasks
  add column if not exists tags text[] not null default '{}'::text[];

-- 2) 태스크 댓글 테이블
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_comments_task_id_idx
  on public.task_comments (task_id, created_at);

create index if not exists task_comments_workspace_id_idx
  on public.task_comments (workspace_id);

alter table public.task_comments enable row level security;

-- 3) 댓글 RLS: 워크스페이스 멤버만 조회/작성, 작성자만 삭제
drop policy if exists "members can read task comments" on public.task_comments;
create policy "members can read task comments"
on public.task_comments
for select
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = task_comments.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "members can insert task comments" on public.task_comments;
create policy "members can insert task comments"
on public.task_comments
for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = task_comments.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "authors can delete own comments" on public.task_comments;
create policy "authors can delete own comments"
on public.task_comments
for delete
using (author_id = auth.uid());

-- 4) Realtime: UPDATE/DELETE 페이로드에 전체 행이 포함되도록 설정
alter table public.tasks replica identity full;
alter table public.boards replica identity full;
alter table public.task_comments replica identity full;

-- 5) Realtime publication 등록 (이미 등록되어 있으면 무시)
do $$
begin
  begin
    alter publication supabase_realtime add table public.tasks;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.boards;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.task_comments;
  exception
    when duplicate_object then null;
  end;
end $$;
