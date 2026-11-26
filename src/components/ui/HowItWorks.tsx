"use client";

import { useId, type ReactNode } from "react";
import { usePersistentFlag } from "@/lib/usePersistentFlag";

/**
 * A "How it works" explainer that students can fold away with "Got it!".
 * The choice is remembered per topic in localStorage.
 */
export function HowItWorks({ topic, children }: { topic: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = usePersistentFlag(`sumcraft:how-it-works-collapsed:${topic}`, false);
  const contentId = useId();

  return (
    <section
      aria-labelledby={`${contentId}-heading`}
      className="rounded-3xl border-4 border-ink/10 bg-cloud/80 p-6 sm:p-8 mb-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${contentId}-heading`} className="font-display text-2xl sm:text-3xl font-semibold">
          How it works
        </h2>
        {collapsed && (
          <button
            type="button"
            aria-expanded={false}
            aria-controls={contentId}
            onClick={() => setCollapsed(false)}
            className="rounded-2xl border-4 border-grape px-4 py-1.5 font-display text-lg font-semibold text-grape hover:bg-grape hover:text-white focus-visible:outline-4 focus-visible:outline-sunny"
          >
            Show me again 👀
          </button>
        )}
      </div>

      <div id={contentId} hidden={collapsed}>
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex justify-center sm:justify-end">
          <button
            type="button"
            aria-expanded={true}
            aria-controls={contentId}
            onClick={() => setCollapsed(true)}
            className="rounded-2xl bg-mint px-6 py-3 font-display text-xl font-semibold text-white shadow-[0_4px_0_var(--color-mint-dark)] hover:brightness-110 active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-grape"
          >
            Got it! 👍
          </button>
        </div>
      </div>
    </section>
  );
}
