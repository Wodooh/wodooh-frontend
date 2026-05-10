"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InstructorOnboardingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/onboarding?role=instructor");
  }, [router]);
  return null;
}
