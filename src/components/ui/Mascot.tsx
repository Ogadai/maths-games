/** "Divvy", the friendly bus who helps with division. */
export function Mascot({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {/* body */}
      <rect x="8" y="22" width="84" height="56" rx="16" fill="#FFC93C" stroke="#1E2A4A" strokeWidth="4" />
      {/* roof stripe */}
      <rect x="8" y="22" width="84" height="12" rx="6" fill="#FF6B6B" stroke="#1E2A4A" strokeWidth="4" />
      {/* windscreen eyes */}
      <rect x="18" y="40" width="26" height="20" rx="8" fill="#fff" stroke="#1E2A4A" strokeWidth="3" />
      <rect x="56" y="40" width="26" height="20" rx="8" fill="#fff" stroke="#1E2A4A" strokeWidth="3" />
      <circle cx="33" cy="51" r="5" fill="#1E2A4A" />
      <circle cx="69" cy="51" r="5" fill="#1E2A4A" />
      <circle cx="35" cy="49" r="1.6" fill="#fff" />
      <circle cx="71" cy="49" r="1.6" fill="#fff" />
      {/* smile */}
      <path d="M40 66 Q50 74 60 66" fill="none" stroke="#1E2A4A" strokeWidth="3.5" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="22" cy="66" r="4" fill="#FF8FCF" opacity="0.8" />
      <circle cx="78" cy="66" r="4" fill="#FF8FCF" opacity="0.8" />
      {/* wheels */}
      <circle cx="28" cy="80" r="9" fill="#1E2A4A" />
      <circle cx="72" cy="80" r="9" fill="#1E2A4A" />
      <circle cx="28" cy="80" r="3.5" fill="#E8F4FF" />
      <circle cx="72" cy="80" r="3.5" fill="#E8F4FF" />
    </svg>
  );
}

export function SpeechBubble({
  children,
  tone = "neutral",
  compact = false,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "oops";
  /** Smaller mascot and text, for tight layouts such as phones. */
  compact?: boolean;
}) {
  const toneClass = {
    neutral: "bg-cloud border-ink",
    success: "bg-mint/15 border-mint-dark",
    oops: "bg-coral/10 border-coral",
  }[tone];
  return (
    <div className={`flex items-end ${compact ? "gap-2" : "gap-3"}`}>
      <Mascot
        className={`shrink-0 animate-float ${compact ? "w-10 h-10 sm:w-14 sm:h-14" : "w-16 h-16"}`}
      />
      <div
        role="status"
        aria-live="polite"
        className={`relative rounded-3xl border-4 font-semibold ${toneClass} ${
          compact ? "px-3 py-1.5 text-base sm:px-4 sm:py-2 sm:text-lg leading-snug" : "px-5 py-3 text-lg"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
