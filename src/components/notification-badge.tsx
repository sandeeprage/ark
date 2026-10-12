"use client";
import { useEffect, useState } from "react";
export function NotificationBadge() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    let busy = false;
    const controller = new AbortController();
    async function check() {
      if (document.visibilityState !== "visible" || busy) return;
      busy = true;
      try {
        const response = await fetch("/api/notifications/status", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          if (active && Number.isInteger(data.unread)) setCount(data.unread);
        }
      } catch {
        /* Keep the last confirmed count during an outage. */
      } finally {
        busy = false;
      }
    }
    void check();
    const timer = setInterval(check, 60000);
    window.addEventListener("focus", check);
    window.addEventListener("ark:notifications-changed", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("ark:notifications-changed", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return count ? (
    <span className="notification-badge" aria-label={`${count} unread notifications`}>
      {count > 99 ? "99+" : count}
    </span>
  ) : null;
}
