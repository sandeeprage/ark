import Link from "./intent-link";
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  Compass,
  Github,
  Layers3,
  Plus,
  Search,
  Users,
  UserRound,
} from "lucide-react";
import { getViewer } from "@/modules/auth/session";
import { SidebarNav, MobileNavigation } from "./navigation";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const username = viewer?.profile?.username;
  const items = [
    { href: "/explore", label: "Explore", icon: "compass" },
    { href: "/following", label: "Following", icon: "users" },
    { href: "/collections", label: "Collections", icon: "bookmark" },
    { href: "/notifications", label: "Notifications", icon: "bell" },
  ];
  const bottomItems = [
    {
      href: username ? `/makers/${username}` : "/login?next=/settings",
      label: "Profile",
      icon: "user",
    },
    { href: "/settings", label: "Settings", icon: "settings" },
  ];
  const sidebar = (
    <>
      <Link href="/" prefetch={true} className="brand" aria-label="ARK home">
        <span className="brand-mark">
          <Layers3 size={24} strokeWidth={1.6} />
        </span>
        ARK<span className="brand-period">.</span>
      </Link>
      <div className="sidebar-main">
        <p className="nav-label">DISCOVER</p>
        <SidebarNav items={items} notifications={Boolean(viewer && viewer.status === "active")} />
        <Link href="/publish" className="button button-primary publish-nav">
          <Plus size={17} /> Publish a project
        </Link>
      </div>
      <div className="sidebar-bottom">
        <SidebarNav items={bottomItems} />
        {viewer ? (
          <Link href={username ? `/makers/${username}` : "/onboarding"} className="account-summary">
            <span className="avatar">
              {(viewer.profile?.display_name || "M").slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{viewer.profile?.display_name || "Your account"}</strong>
              <small>{username ? `@${username}` : "Complete your profile"}</small>
            </span>
            <ArrowUpRight size={14} />
          </Link>
        ) : (
          <div className="sidebar-signin">
            <p>Your work belongs here.</p>
            <Link href="/login" className="button button-outline">
              Sign in to ARK <ArrowUpRight size={15} />
            </Link>
          </div>
        )}
        <div className="sidebar-foot">
          <span className="status-dot" />
          Internal development<span>v0.1</span>
        </div>
      </div>
    </>
  );
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Main navigation">
        {sidebar}
      </aside>
      <header className="mobile-header">
        <Link href="/" prefetch={true} className="brand" aria-label="ARK home">
          <Layers3 size={23} strokeWidth={1.6} />
          ARK.
        </Link>
        <MobileNavigation>{sidebar}</MobileNavigation>
      </header>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-label">
            <Compass size={15} />
            <span>A home for shipped work</span>
          </div>
          <div className="topbar-actions">
            <Link href="/search" className="icon-button" aria-label="Search projects and makers">
              <Search size={18} />
            </Link>
            <span className="topbar-divider" />
            <Link href={viewer ? "/publish" : "/login"} className="topbar-link">
              {viewer ? "Publish project" : "Join the makers"}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="page-footer">
          <span>ARK — built for people who build.</span>
          <span>Ship something. Put it out there.</span>
        </footer>
      </div>
    </div>
  );
}

export { ArrowUpRight, Bell, Bookmark, Github, Search, Users, UserRound };
