export interface Topic {
  slug: string;
  title: string;
  tagline: string;
  emoji: string;
  /** Tailwind background class for the card. */
  colour: string;
  available: boolean;
}

/** Every concept gets one page. Add an entry here and an app/topics/<slug> folder. */
export const TOPICS: Topic[] = [
  {
    slug: "bus-stop-division",
    title: "Bus Stop Division",
    tagline: "Share big numbers fairly, one column at a time.",
    emoji: "🚌",
    colour: "bg-sunny",
    available: true,
  },
  {
    slug: "times-tables",
    title: "Times Tables",
    tagline: "Race the clock and master your tables.",
    emoji: "✖️",
    colour: "bg-mint",
    available: false,
  },
  {
    slug: "fractions",
    title: "Fractions",
    tagline: "Slice pizzas and compare pieces.",
    emoji: "🍕",
    colour: "bg-coral",
    available: false,
  },
  {
    slug: "long-multiplication",
    title: "Long Multiplication",
    tagline: "Build big answers in neat columns.",
    emoji: "🧮",
    colour: "bg-bubblegum",
    available: false,
  },
];
