import type { Metadata } from "next";
import { PracticePanel } from "@/components/busStop/PracticePanel";
import { WatchPanel } from "@/components/busStop/WatchPanel";
import { TopicIntro } from "@/components/ui/TopicIntro";

export const metadata: Metadata = {
  title: "Bus Stop Division · SumCraft",
  description: "Learn short division one column at a time.",
};

export default function BusStopDivisionPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-8 pb-12">
      <TopicIntro
        topic="bus-stop-division"
        title="Bus Stop Division"
        emoji="🚌"
        summary={
          <>
            The big number waits under the bus stop. The number outside is how many buses we
            share it between. We go one column at a time, from left to right. Press{" "}
            <strong>Play</strong> to watch the blocks get shared!
          </>
        }
      >
        <WatchPanel />
      </TopicIntro>

      <section aria-labelledby="practice-heading">
        <h2
          id="practice-heading"
          className="font-display text-2xl sm:text-3xl font-semibold mb-3 text-center"
        >
          Your turn - choose a level
        </h2>
        <PracticePanel />
      </section>
    </div>
  );
}
