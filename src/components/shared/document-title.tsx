import { SCHOOL_NAME } from "@/lib/brand";

/**
 * Declares the browser tab title for a page. React 19 hoists a <title>
 * rendered anywhere in the tree into <head> and keeps it in sync on every
 * commit, so the title survives both SSR and hydration (WCAG 2.4.2).
 * Rendered inside PageHeader so every page that declares a heading also
 * announces itself in the document title.
 */
export function DocumentTitle({ title }: { title: string }) {
  return <title>{`${title} · ${SCHOOL_NAME}`}</title>;
}
