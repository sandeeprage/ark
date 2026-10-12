"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function NotificationRefresh() {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    function refresh() {
      if (document.visibilityState !== "visible" || Date.now() - last < 5000) return;
      last = Date.now();
      router.refresh();
    }
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  return null;
}
