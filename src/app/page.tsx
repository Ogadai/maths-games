import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";
import { TOPICS } from "@/lib/topics";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-8 pb-12">
      <section className="flex flex-col-reverse sm:flex-row items-center gap-6 py-8 sm:py-14">
        <div className="flex-1 text-center sm:text-left">
          <h1 className="font-display text-4xl sm:text-6xl font-bold leading-tight">
            Pick a <span className="text-grape">maths mission</span>!
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-ink-soft max-w-xl">
            Every mission teaches one big idea with pictures you can play with. Solve
            puzzles, earn points and collect medals along the way.
          </p>
          <Link
            href="/topics/bus-stop-division"
            className="mt-6 inline-block rounded-2xl bg-grape px-8 py-4 font-display text-xl font-semibold text-white shadow-[0_6px_0_var(--color-grape-dark)] transition active:translate-y-1 active:shadow-[0_2px_0_var(--color-grape-dark)] hover:brightness-110 focus-visible:outline-4 focus-visible:outline-sunny"
          >
            Start with Bus Stop Division 🚌
          </Link>
        </div>
        <Mascot className="w-40 h-40 sm:w-64 sm:h-64 animate-float drop-shadow-xl" />
      </section>

      <section aria-labelledby="missions-heading">
        <h2 id="missions-heading" className="font-display text-3xl font-semibold mb-4">
          Missions
        </h2>
        <ul className="grid gap-5 sm:grid-cols-2">
          {TOPICS.map((topic) => {
            const card = (
              <div
                className={`h-full rounded-3xl border-4 border-ink p-6 ${topic.colour} ${
                  topic.available
                    ? "shadow-[0_8px_0_var(--color-ink)] transition group-hover:-translate-y-1 group-hover:shadow-[0_12px_0_var(--color-ink)]"
                    : "opacity-60 grayscale-[40%]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-5xl" aria-hidden="true">
                    {topic.emoji}
                  </span>
                  {!topic.available && (
                    <span className="rounded-full bg-cloud px-3 py-1 text-sm font-bold">
                      Coming soon
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-2xl font-semibold">{topic.title}</h3>
                <p className="mt-1 text-ink/80 font-semibold">{topic.tagline}</p>
              </div>
            );
            return (
              <li key={topic.slug}>
                {topic.available ? (
                  <Link
                    href={`/topics/${topic.slug}`}
                    className="group block h-full rounded-3xl focus-visible:outline-4 focus-visible:outline-grape"
                  >
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
