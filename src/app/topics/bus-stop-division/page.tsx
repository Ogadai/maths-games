import type { Metadata } from "next";
import { BusStopBoard } from "@/components/busStop/BusStopBoard";
import { PracticePanel } from "@/components/busStop/PracticePanel";
import { TopicIntro } from "@/components/ui/TopicIntro";
import { solveBusStop } from "@/lib/maths/busStop";

export const metadata: Metadata = {
  title: "Bus Stop Division · SumCraft",
  description: "Learn short division one column at a time.",
};

const example = solveBusStop(852, 4);

const exampleSteps = [
  { text: "How many 4s fit into 8? Exactly 2. Write 2 on the roof.", colour: "bg-sunny/40" },
  { text: "How many 4s fit into 5? Just 1, with 1 left over.", colour: "bg-mint/30" },
  { text: "Carry the leftover 1 next to the 2 to make 12.", colour: "bg-coral/20" },
  { text: "How many 4s fit into 12? Exactly 3. So 852 ÷ 4 = 213!", colour: "bg-grape/20" },
];

export default function BusStopDivisionPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-8 pb-12">
      <TopicIntro
        topic="bus-stop-division"
        title="Bus Stop Division"
        emoji="🚌"
        summary={
          <>
            The big number waits under the bus stop. The number outside is how many groups we
            share it into. We go one column at a time, from left to right.
          </>
        }
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          <BusStopBoard
            solution={example}
            quotient={example.steps.map((s) => s.quotientDigit)}
            carries={example.steps.map((s) => (s.carriedIn > 0 ? s.carriedIn : null))}
            size="md"
          />
          <ol className="flex-1 space-y-2">
            {exampleSteps.map((step, i) => (
              <li key={i} className={`flex gap-3 rounded-2xl px-4 py-2 font-semibold ${step.colour}`}>
                <span className="font-display text-xl">{i + 1}.</span>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
        </div>
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
