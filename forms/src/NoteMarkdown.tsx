import * as React from "react";
import Markdown, { type MarkdownToJSX } from "markdown-to-jsx";

/**
 * A resource note rendered as Markdown (GFM tables included).
 *
 * Styled element by element through `overrides` rather than a `prose` class:
 * consumers don't all carry `@tailwindcss/typography`, but every one scans
 * `@bcl32/*` for classes, so these strings are always generated. Raw HTML is
 * shown as text — a note is typed by a person, and this component is shared.
 */
const OVERRIDES: MarkdownToJSX.Overrides = {
  h1: { props: { className: "text-base font-semibold text-foreground mt-3 first:mt-0" } },
  h2: { props: { className: "text-base font-semibold text-foreground mt-3 first:mt-0" } },
  h3: { props: { className: "text-sm font-semibold text-foreground mt-3 first:mt-0" } },
  h4: { props: { className: "text-sm font-semibold text-foreground mt-2 first:mt-0" } },
  p: { props: { className: "mt-2 first:mt-0" } },
  ul: { props: { className: "mt-2 first:mt-0 list-disc pl-5 space-y-0.5" } },
  ol: { props: { className: "mt-2 first:mt-0 list-decimal pl-5 space-y-0.5" } },
  a: {
    props: {
      className: "text-primary hover:underline",
      target: "_blank",
      rel: "noopener noreferrer",
    },
  },
  strong: { props: { className: "font-semibold text-foreground" } },
  code: { props: { className: "rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]" } },
  pre: {
    props: {
      className:
        "mt-2 first:mt-0 overflow-x-auto rounded bg-muted p-2 font-mono text-xs [&>code]:bg-transparent [&>code]:p-0",
    },
  },
  blockquote: { props: { className: "mt-2 first:mt-0 border-l-2 pl-3 italic" } },
  hr: { props: { className: "my-3 border-border" } },
  table: {
    component: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
      <div className="mt-2 first:mt-0 overflow-x-auto">
        <table {...props} className="w-auto border-collapse text-sm">
          {children}
        </table>
      </div>
    ),
  },
  th: { props: { className: "border-b px-2 py-1 text-left font-semibold text-foreground" } },
  td: { props: { className: "border-b border-border/50 px-2 py-1 tabular-nums" } },
};

const OPTIONS: MarkdownToJSX.Options = {
  overrides: OVERRIDES,
  disableParsingRawHTML: true,
  forceWrapper: true,
  wrapper: "div",
};

export function NoteMarkdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <Markdown options={OPTIONS}>{children}</Markdown>
    </div>
  );
}

/** A note long enough to deserve the whole row rather than one grid cell. */
export function isLongNote(note: string): boolean {
  return note.length > 280 || /\n\s*\n|^\s*\|/m.test(note);
}
