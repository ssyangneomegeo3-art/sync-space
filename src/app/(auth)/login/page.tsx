import React from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "로그인 | SyncSpace",
  description: "SyncSpace 계정으로 로그인하여 팀 협업을 시작하세요.",
};

export default function LoginPage(): React.JSX.Element {
  return <AuthForm type="login" />;
}