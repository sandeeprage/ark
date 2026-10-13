import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { searchMakers } from "@/modules/discovery/queries";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Makers" };

export default async function Makers({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100).trim() : "";
  const { makers, error } = await searchMakers(query);
  return (
    <div className="page directory-page">
      <p className="eyebrow">THE PEOPLE BEHIND THE WORK</p>
      <h1>Meet the makers.</h1>
      <p className="page-description">Discover the people building and sharing on ARK.</p>
      <form key={query} className="maker-search" action="/makers">
        <Search size={18} aria-hidden="true" />
        <input
          name="q"
          type="search"
          aria-label="Search makers"
          placeholder="Search by name or username"
          defaultValue={query}
          maxLength={100}
        />
        <button className="button button-primary" type="submit">
          Search
        </button>
      </form>
      {error ? (
        <EmptyState
          kind="error"
          title="Makers couldn’t be loaded."
          description="Please try again in a moment."
          action={{ label: "Try again", href: `/makers?q=${encodeURIComponent(query)}` }}
        />
      ) : makers.length ? (
        <div className="makers-grid">
          {makers.map((maker) => (
            <Link
              href={`/makers/${maker.username}`}
              className="maker-directory-card"
              key={maker.id}
            >
              <div className="maker-directory-top">
                <span className="avatar">{maker.display_name.slice(0, 1).toUpperCase()}</span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </div>
              <h2>{maker.display_name}</h2>
              <span className="username">@{maker.username}</span>
              <p>{maker.bio || "A maker sharing their work on ARK."}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          kind="search"
          title={query ? "No makers found." : "The community is just getting started."}
          description={
            query
              ? "Try another name or username."
              : "Create your profile and share what you’ve made."
          }
          action={{
            label: query ? "Browse makers" : "Join ARK",
            href: query ? "/makers" : "/login",
          }}
        />
      )}
    </div>
  );
}
