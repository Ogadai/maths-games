"use client";

import { useId, type ReactNode } from "react";
import { usePersistentFlag } from "@/lib/usePersistentFlag";

interface Props {
  /** Topic slug, used to remember the folded state per topic. */
  topic: string;
  title: string;
  emoji: string;
  /** One-paragraph explanation shown at the top of "How it works". */
  summary: ReactNode;
  /** The worked example. */
  children: ReactNode;
}

/**
 * Topic title plus a "How it works" panel that students can fold away with
 * "Got it!". When folded, the panel disappears entirely and a small
 * "Show how it works" button sits next to the title instead. The choice is
 * remembered per topic in localStorage.
 */
export function TopicIntro({ topic, title, emoji, summary, children }: Props) {
  const [collapsed, setCollapsed] = usePersistentFlag(`sumcraft:how-it-works-collapsed:${topic}`, false);
  const panelId = useId();

  return (
    <>
      <header className="py-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="text-4xl sm:text-6xl" aria-hidden="true">
            {emoji}
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-bold">{title}</h1>
        </div>
        {collapsed && (
          <button
            type="button"
            aria-expanded={false}
            onClick={() => setCollapsed(false)}
            className="rounded-2xl border-4 border-grape px-4 py-1.5 font-display text-lg font-semibold text-grape hover:bg-grape hover:text-white focus-visible:outline-4 focus-visible:outline-sunny"
          >
            Show how it works 👀
          </button>
        )}
      </header>

      {!collapsed && (
        <section
          id={panelId}
          aria-labelledby={`${panelId}-heading`}
          className="rounded-3xl border-4 border-ink/10 bg-cloud/80 p-5 sm:p-6 mb-6"
        >
          <h2 id={`${panelId}-heading`} className="font-display text-2xl sm:text-3xl font-semibold">
            How it works
          </h2>
          <p className="mt-1 text-lg text-ink-soft">{summary}</p>
          <div className="mt-4">{children}</div>
          <div className="mt-4 flex justify-center sm:justify-end">
            <button
              type="button"
              aria-expanded={true}
              aria-controls={panelId}
              onClick={() => setCollapsed(true)}
              className="rounded-2xl bg-mint px-6 py-3 font-display text-xl font-semibold text-white shadow-[0_4px_0_var(--color-mint-dark)] hover:brightness-110 active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-grape"
            >
              Got it! 👍
            </button>
          </div>
        </section>
      )}
    </>
  );
}
