"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Bell, Bookmark, Compass, Menu, Settings2, UserRound, Users, X } from "lucide-react";
import { NotificationBadge } from "./notification-badge";

const icons = {
  compass: Compass,
  users: Users,
  bookmark: Bookmark,
  bell: Bell,
  user: UserRound,
  settings: Settings2,
};
export function SidebarNav({
  items,
  notifications = false,
}: {
  items: { href: string; label: string; icon: string }[];
  notifications?: boolean;
}) {
  const path = usePathname();
  return (
    <nav>
      <ul className="nav-list">
        {items.map((item) => {
          const Icon = icons[item.icon as keyof typeof icons];
          const active = path === item.href || (item.label === "Explore" && path === "/search");
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                prefetch={true}
                className={`nav-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.6} />
                {item.label}
                {notifications && item.href === "/notifications" && <NotificationBadge />}
                {active && <span className="nav-active-dot" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileNavigation({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="icon-button" aria-label="Open navigation">
          <Menu size={22} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="mobile-drawer" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">ARK navigation</Dialog.Title>
          <Dialog.Close asChild>
            <button className="icon-button drawer-close" aria-label="Close navigation">
              <X size={20} />
            </button>
          </Dialog.Close>
          <div
            className="drawer-inner"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
