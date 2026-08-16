import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase URL 또는 Anon Key 환경 변수가 누락되었습니다. .env.local 파일을 확인하세요."
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}