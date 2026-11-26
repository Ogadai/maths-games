import type { Metadata } from "next";
import { PracticePanel } from "@/components/fractions/PracticePanel";
import { WatchPanel } from "@/components/fractions/WatchPanel";
import { TopicIntro } from "@/components/ui/TopicIntro";

export const metadata: Metadata = {
  title: "Adding Fractions · SumCraft",
  description: "Add and take away fractions by cutting traybakes into matching pieces.",
};

export default function FractionsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-8 pb-12">
      <TopicIntro
        topic="fractions"
        title="Adding Fractions"
        emoji="🍰"
        summary={
          <>
            You can only add or take away pieces that are the same size. So cut one tray the
            other way and the other tray the other way: the crossing cuts make both trays match!
            Then count the pieces, and glue them back into bigger pieces if you can. Press{" "}
            <strong>Play</strong> to watch!
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
