import type { Metadata } from "next";
import { TrophyCabinet } from "@/components/rewards/TrophyCabinet";

export const metadata: Metadata = {
  title: "Trophy Cabinet · SumCraft",
  description: "Your points, medals and badges.",
};

export default function TrophiesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-8 pb-12">
      <h1 className="font-display text-4xl sm:text-5xl font-bold text-center py-6">
        Trophy <span className="text-grape">Cabinet</span> 🏆
      </h1>
      <TrophyCabinet />
    </div>
  );
}
