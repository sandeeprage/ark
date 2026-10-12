import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { feedUrl, filterScope, type FeedFilters } from "@/modules/discovery/filters";
import type { CatalogItem } from "@/modules/discovery/queries";

export function FeedFiltersForm({
  filters,
  categories,
  technologies,
  pathname = "/explore",
}: {
  filters: FeedFilters;
  categories: CatalogItem[];
  technologies: CatalogItem[];
  pathname?: string;
}) {
  const selected = filters.category || filters.stack.length || filters.query;
  return (
    <div className="filter-area">
      <form key={filterScope(filters)} action={pathname} className="feed-filter-form">
        <input type="hidden" name="tab" value={filters.feed} />
        <label className="search-field">
          <Search size={18} strokeWidth={1.7} />
          <span className="sr-only">Search projects or makers</span>
          <input
            name="q"
            defaultValue={filters.query}
            placeholder="Search projects or makers…"
            maxLength={100}
          />
          <kbd aria-hidden="true">↵</kbd>
        </label>
        <div className="filter-controls">
          <label className="category-select">
            <span className="sr-only">Category</span>
            <select name="category" aria-label="Category" defaultValue={filters.category}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option value={category.slug} key={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <details className="stack-filter">
            <summary>
              <SlidersHorizontal size={15} />
              Tech stack
              {filters.stack.length > 0 && (
                <span className="count-pill">{filters.stack.length}</span>
              )}
            </summary>
            <fieldset className="stack-options">
              <legend>Match any selected technology</legend>
              {technologies.map((technology) => (
                <label key={technology.slug}>
                  <input
                    type="checkbox"
                    name="stack"
                    value={technology.slug}
                    defaultChecked={filters.stack.includes(technology.slug)}
                  />
                  {technology.name}
                </label>
              ))}
            </fieldset>
          </details>
          <button className="button button-outline apply-filters" type="submit">
            Apply filters
          </button>
        </div>
      </form>
      {Boolean(selected) && (
        <div className="selected-filters">
          {filters.category && (
            <span className="tag">
              {categories.find((c) => c.slug === filters.category)?.name || filters.category}
            </span>
          )}
          {filters.stack.map((stack) => (
            <span className="tag" key={stack}>
              {technologies.find((t) => t.slug === stack)?.name || stack}
            </span>
          ))}
          {filters.query && <span className="tag">“{filters.query}”</span>}
          <Link
            href={feedUrl(filters, { category: "", stack: [], query: "", cursor: null }, pathname)}
            className="clear-filters"
          >
            <X size={13} />
            Clear filters
          </Link>
        </div>
      )}
    </div>
  );
}
