import React from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "회원가입 | SyncSpace",
  description: "SyncSpace에 가입하고 실시간 협업 워크스페이스를 생성하세요.",
};

export default function SignUpPage(): React.JSX.Element {
  return <AuthForm type="signup" />;
}