export interface LevelInfo<L extends number> {
  level: L;
  name: string;
  emoji: string;
  description: string;
}

/** Big level cards before a practice session starts. */
export function LevelCards<L extends number>({
  levels,
  onPick,
}: {
  levels: LevelInfo<L>[];
  onPick: (level: L) => void;
}) {
  return (
    <fieldset className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
      <legend className="sr-only">Choose a level to start</legend>
      {levels.map((l) => (
        <button
          key={l.level}
          type="button"
          aria-pressed={false}
          onClick={() => onPick(l.level)}
          className="rounded-2xl border-4 border-ink/20 bg-cloud px-4 py-2 text-left transition hover:border-grape focus-visible:outline-4 focus-visible:outline-grape"
        >
          <span className="font-display text-lg font-semibold">
            {l.emoji} {l.name}
          </span>
          <span className="block text-sm text-ink-soft">{l.description}</span>
        </button>
      ))}
    </fieldset>
  );
}

/** Compact level chips shown above the workspace during practice. */
export function LevelChips<L extends number>({
  levels,
  selected,
  onPick,
}: {
  levels: LevelInfo<L>[];
  selected: L;
  onPick: (level: L) => void;
}) {
  return (
    <fieldset className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full">
      <legend className="sr-only">Level</legend>
      {levels.map((l) => {
        const isSelected = l.level === selected;
        return (
          <button
            key={l.level}
            type="button"
            aria-pressed={isSelected}
            title={l.description}
            onClick={() => onPick(l.level)}
            className={`min-h-11 rounded-2xl border-4 px-1 py-1 font-display text-sm sm:text-lg font-semibold leading-tight flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 focus-visible:outline-4 focus-visible:outline-grape ${
              isSelected
                ? "border-grape bg-grape text-white shadow-[0_3px_0_var(--color-grape-dark)]"
                : "border-ink/15 bg-cloud hover:border-grape"
            }`}
          >
            <span aria-hidden="true">{l.emoji}</span>
            <span>{l.name}</span>
          </button>
        );
      })}
    </fieldset>
  );
}
