import Link from "next/link";
import { ArrowRight, Box, Search, WifiOff } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
  kind = "empty",
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
  kind?: "empty" | "search" | "error";
}) {
  const Icon = kind === "search" ? Search : kind === "error" ? WifiOff : Box;
  return (
    <div className="empty-state">
      <div className="empty-art" aria-hidden="true">
        <div className="empty-art-back" />
        <div className="empty-art-mid" />
        <div className="empty-art-front">
          <Icon size={32} strokeWidth={1.2} />
          <span />
          <span />
        </div>
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && (
        <Link href={action.href} className="button button-primary">
          {action.label}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
