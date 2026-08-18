# SyncSpace

팀 칸반을 **실시간으로 같이 보는** 협업 웹앱입니다.  
Next.js 15 App Router와 Supabase(Auth, PostgreSQL, Realtime, Storage)로 만들었습니다.

- GitHub: [ssyangneomegeo3-art/sync-space](https://github.com/ssyangneomegeo3-art/sync-space)
- 배포: Vercel (`main` 브랜치 push 시 자동 배포)

---

## 기능

- **인증**: 이메일 회원가입 / 로그인, 미들웨어 세션 보호
- **워크스페이스**: 생성, 슬러그 중복 검사, 팀원 초대, owner / member 권한
- **칸반**: 컬럼 추가·이름 변경·삭제, 카드 추가·수정·삭제
- **드래그 앤 드롭**: `@dnd-kit` + 낙관적 업데이트 (UI가 먼저 움직이고 서버에 저장)
- **실시간**: 같은 보드를 연 팀원 화면에 카드 이동·댓글이 새로고침 없이 반영
- **접속자**: 지금 보드를 보고 있는 사람 표시 (Presence)
- **카드 상세**: 담당자, 마감일, 마크다운 설명, 태그, 댓글
- **파일 첨부**: Supabase Storage (`task-files` 버킷, 5MB, signed URL)
- **검색/필터**: 제목·태그, 우선순위, 내 담당, 기한
- **다크모드**: Zustand + localStorage

---

## 기술 스택

| 구분 | 사용 |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v3 |
| Backend | Supabase Auth, PostgreSQL, RLS, Realtime, Storage |
| UX | `@dnd-kit`, `react-markdown`, Zustand |
| Deploy | Vercel |

---

## 로컬 실행

```powershell
git clone https://github.com/ssyangneomegeo3-art/sync-space.git
cd sync-space
npm install
```

프로젝트 루트에 `.env.local`을 만들고 값을 넣습니다.

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Supabase SQL Editor에서 아래를 **순서대로** 실행합니다.

1. `supabase/day24-realtime.sql` — 태그, 댓글, Realtime
2. `supabase/day27-storage.sql` — 파일 버킷, 첨부 테이블, Storage 권한

워크스페이스·칸반 기본 테이블(profiles, workspaces, boards, tasks, members)은 프로젝트 초기에 이미 만들어진 상태여야 합니다.

```powershell
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

---

## 배포

GitHub `main`에 push하면 Vercel이 프로덕션을 다시 빌드합니다.

Vercel 프로젝트에는 로컬과 같은 환경 변수가 필요합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Storage·Realtime SQL은 배포 서버가 아니라 **Supabase 대시보드**에서 한 번 실행하면 됩니다.

---

## 폴더 구조

```text
src/
  app/(auth)/              로그인·회원가입
  app/(dashboard)/         워크스페이스·칸반 Server Actions
  components/kanban/       보드, 카드, 상세 모달, 첨부
  lib/supabase/            브라우저·서버·미들웨어 클라이언트
  store/                   다크모드 (Zustand)
  types/database.ts        DB 타입
supabase/                  Realtime·Storage SQL
```
