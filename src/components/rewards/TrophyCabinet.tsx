"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { MedalIcon } from "@/components/ui/MedalIcon";
import { TOPICS } from "@/lib/topics";
import {
  BADGES,
  MEDALS,
  type Medal,
  type Progress,
} from "@/lib/rewards/rules";
import { activeProfile, useRewards, type Profile } from "@/lib/rewards/store";

const displayName = (profile: Profile, index: number) => profile.nickname || `Player ${index + 1}`;

const button = {
  primary:
    "min-h-11 rounded-2xl bg-grape px-5 py-1.5 font-display text-lg font-semibold text-white shadow-[0_4px_0_var(--color-grape-dark)] active:translate-y-1 active:shadow-none disabled:opacity-40 focus-visible:outline-4 focus-visible:outline-sunny",
  plain:
    "min-h-11 rounded-2xl border-4 border-ink/15 bg-cloud px-4 py-1 font-display text-lg font-semibold hover:border-grape focus-visible:outline-4 focus-visible:outline-grape",
  danger:
    "min-h-11 rounded-2xl border-4 border-coral bg-cloud px-4 py-1 font-display text-lg font-semibold text-ink hover:bg-coral/10 focus-visible:outline-4 focus-visible:outline-grape",
};

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const id = `panel-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section
      aria-labelledby={id}
      className="rounded-3xl border-4 border-ink bg-cloud p-4 sm:p-6 shadow-[0_6px_0_var(--color-ink)]"
    >
      <h2 id={id} className="font-display text-2xl sm:text-3xl font-semibold mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MedalTile({ medal, progress }: { medal: Medal; progress: Progress }) {
  const earned = progress.medals.includes(medal.id);
  // The "3 / 5" label under locked medals (one-off medals have no counter).
  const counter = medal.progress?.(progress);
  return (
    <li
      aria-label={`${medal.name}: ${earned ? "earned" : "locked"}. ${medal.description}.`}
      className={`flex flex-col items-center rounded-2xl p-3 text-center ${
        earned ? "bg-sunny/25" : "bg-sky/70"
      }`}
    >
      <MedalIcon
        tier={medal.tier}
        emoji={medal.emoji}
        locked={!earned}
        className={`w-16 h-20 sm:w-20 sm:h-24 ${earned ? "drop-shadow-md" : ""}`}
      />
      <p className="mt-1 font-display text-lg font-semibold leading-tight">{medal.name}</p>
      <p className="text-sm text-ink-soft font-semibold">{medal.description}</p>
      {!earned && counter && (
        <p className="mt-1 text-sm font-bold text-grape-dark">
          {counter.have} / {counter.need}
        </p>
      )}
      {earned && <p className="mt-1 text-sm font-bold text-mint-dark">Earned! ✔</p>}
    </li>
  );
}

function Players() {
  const profiles = useRewards((s) => s.profiles);
  const activeId = useRewards((s) => s.activeId);
  const switchProfile = useRewards((s) => s.switchProfile);
  const addProfile = useRewards((s) => s.addProfile);
  const setNickname = useRewards((s) => s.setNickname);
  const active = useRewards(activeProfile);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [draft, setDraft] = useState<{ id: string; name: string } | null>(null);
  const editing = draft?.id === active.id ? draft.name : active.nickname;

  const saveNickname = (e: FormEvent) => {
    e.preventDefault();
    setNickname(editing.trim().slice(0, 20));
    setDraft(null);
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim().slice(0, 20);
    if (!name) return;
    addProfile(name);
    setNewName("");
    setAdding(false);
    setDraft(null);
  };

  return (
    <Panel title="Who's playing?">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Players">
        {profiles.map((profile, i) => (
          <button
            key={profile.id}
            type="button"
            aria-pressed={profile.id === activeId}
            onClick={() => {
              switchProfile(profile.id);
              setDraft(null);
            }}
            className={`min-h-11 rounded-2xl border-4 px-4 py-1 font-display text-lg font-semibold focus-visible:outline-4 focus-visible:outline-grape ${
              profile.id === activeId
                ? "border-grape bg-grape text-white shadow-[0_3px_0_var(--color-grape-dark)]"
                : "border-ink/15 bg-cloud hover:border-grape"
            }`}
          >
            {displayName(profile, i)} · ⭐ {profile.progress.points}
          </button>
        ))}
        {!adding && (
          <button type="button" className={button.plain} onClick={() => setAdding(true)}>
            + Add player
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={add} className="mt-3 flex flex-wrap items-center gap-2">
          <label className="font-semibold" htmlFor="new-player">
            New player&apos;s nickname
          </label>
          <input
            id="new-player"
            autoFocus
            maxLength={20}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="min-h-11 rounded-xl border-4 border-ink/20 px-3 font-semibold focus:border-grape outline-none"
          />
          <button type="submit" className={button.primary} disabled={!newName.trim()}>
            Add
          </button>
          <button type="button" className={button.plain} onClick={() => setAdding(false)}>
            Cancel
          </button>
        </form>
      )}

      <form onSubmit={saveNickname} className="mt-4 flex flex-wrap items-center gap-2">
        <label className="font-semibold" htmlFor="nickname">
          Nickname <span className="text-ink-soft">(optional)</span>
        </label>
        <input
          id="nickname"
          maxLength={20}
          placeholder="e.g. Maths Wizard"
          value={editing}
          onChange={(e) => setDraft({ id: active.id, name: e.target.value })}
          className="min-h-11 rounded-xl border-4 border-ink/20 px-3 font-semibold focus:border-grape outline-none"
        />
        <button
          type="submit"
          className={button.primary}
          disabled={editing.trim() === active.nickname}
        >
          Save
        </button>
      </form>
    </Panel>
  );
}

function Stats({ progress }: { progress: Progress }) {
  const solved = Object.values(progress.topics).reduce((sum, t) => sum + t.solved, 0);
  const stats = [
    { label: "Points", value: progress.points, emoji: "⭐" },
    { label: "Problems solved", value: solved, emoji: "✅" },
    { label: "Streak now", value: progress.streak, emoji: "🔥" },
    { label: "Best streak", value: progress.bestStreak, emoji: "🚀" },
    { label: "Medals", value: `${progress.medals.length} / ${MEDALS.length}`, emoji: "🏅" },
  ];
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`rounded-2xl border-4 border-ink/10 bg-cloud p-3 text-center ${
            i === stats.length - 1 ? "col-span-2 sm:col-span-1" : ""
          }`}
        >
          <dt className="text-sm font-semibold text-ink-soft">
            <span aria-hidden="true">{s.emoji} </span>
            {s.label}
          </dt>
          <dd className="font-display text-3xl font-bold">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DangerZone({ name }: { name: string }) {
  const profiles = useRewards((s) => s.profiles);
  const activeId = useRewards((s) => s.activeId);
  const resetProgress = useRewards((s) => s.resetProgress);
  const removeProfile = useRewards((s) => s.removeProfile);
  const [confirming, setConfirming] = useState<"reset" | "remove" | null>(null);

  return (
    <Panel title="Start again">
      {confirming ? (
        <div role="alertdialog" aria-label="Are you sure?" className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">
            {confirming === "reset"
              ? `Wipe all of ${name}'s points, medals and streaks? This can't be undone.`
              : `Remove ${name} and all their progress? This can't be undone.`}
          </p>
          <button
            type="button"
            className={button.danger}
            onClick={() => {
              if (confirming === "reset") resetProgress();
              else removeProfile(activeId);
              setConfirming(null);
            }}
          >
            {confirming === "reset" ? "Yes, reset" : "Yes, remove"}
          </button>
          <button type="button" autoFocus className={button.plain} onClick={() => setConfirming(null)}>
            No, keep it
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button.danger} onClick={() => setConfirming("reset")}>
            Reset progress
          </button>
          {profiles.length > 1 && (
            <button type="button" className={button.danger} onClick={() => setConfirming("remove")}>
              Remove {name}
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}

export function TrophyCabinet() {
  const hydrated = useRewards((s) => s.hydrated);
  const profiles = useRewards((s) => s.profiles);
  const active = useRewards(activeProfile);

  if (!hydrated) {
    return <p className="text-center text-lg text-ink-soft font-semibold">Opening the cabinet… 🔑</p>;
  }

  const { progress } = active;
  const name = displayName(active, profiles.indexOf(active));
  const topics = TOPICS.filter((t) => t.available);

  return (
    <div className="flex flex-col gap-6">
      <Players />
      <Stats progress={progress} />

      {topics.map((topic) => (
        <Panel key={topic.slug} title={`${topic.emoji} ${topic.title} medals`}>
          <ul className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3">
            {MEDALS.filter((m) => m.topic === topic.slug).map((medal) => (
              <MedalTile key={medal.id} medal={medal} progress={progress} />
            ))}
          </ul>
          <Link
            href={`/topics/${topic.slug}`}
            className="mt-3 inline-block font-display text-lg font-semibold text-grape-dark underline underline-offset-4 hover:text-grape"
          >
            Go and earn more ➜
          </Link>
        </Panel>
      ))}

      <Panel title="🎖️ Fun badges">
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BADGES.map((medal) => (
            <MedalTile key={medal.id} medal={medal} progress={progress} />
          ))}
        </ul>
      </Panel>

      <DangerZone name={name} />
    </div>
  );
}
