import type { MedalTier } from "@/lib/rewards/rules";

const TIER_COLOURS: Record<MedalTier, { face: string; rim: string }> = {
  bronze: { face: "#E8A06A", rim: "#A85F2C" },
  silver: { face: "#E4EAF2", rim: "#8E9AAD" },
  gold: { face: "#FFD95A", rim: "#E0A800" },
  badge: { face: "#C9B8FF", rim: "#7B5CFF" },
};

/** A round medal on a ribbon, with the medal's emoji in the middle. */
export function MedalIcon({
  tier,
  emoji,
  locked = false,
  className = "",
}: {
  tier: MedalTier;
  emoji: string;
  locked?: boolean;
  className?: string;
}) {
  const { face, rim } = locked ? { face: "#E6E9F0", rim: "#B5BCCB" } : TIER_COLOURS[tier];
  return (
    <svg viewBox="0 0 100 120" className={className} aria-hidden="true">
      {/* ribbon */}
      <path d="M30 0 L50 40 L70 0 Z" fill={locked ? "#C5CAD6" : "#FF6B6B"} />
      <path d="M30 0 L42 0 L58 36 L50 40 Z" fill={locked ? "#B5BCCB" : "#7B5CFF"} />
      <path d="M70 0 L58 0 L42 36 L50 40 Z" fill={locked ? "#D5D9E2" : "#2EC4B6"} />
      {/* medal */}
      <circle cx="50" cy="75" r="40" fill={rim} stroke="#1E2A4A" strokeWidth="4" />
      <circle cx="50" cy="75" r="31" fill={face} />
      <text
        x="50"
        y="78"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="42"
        opacity={locked ? 0.35 : 1}
        style={locked ? { filter: "grayscale(1)" } : undefined}
      >
        {locked ? "🔒" : emoji}
      </text>
    </svg>
  );
}
