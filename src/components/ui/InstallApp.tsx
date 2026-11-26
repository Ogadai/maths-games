"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Mascot } from "./Mascot";
import { promptInstall, useInstallMode, type InstallMode } from "@/lib/install";
import { useCoarsePointer } from "@/lib/useMediaQuery";
import { usePersistentFlag } from "@/lib/usePersistentFlag";

/** Set once the player has answered the install question, so we never ask again. */
const ASKED_KEY = "sumcraft:install-asked";
/** Give the page a moment to settle before asking. */
const ASK_DELAY_MS = 2500;

const primaryButton =
  "rounded-2xl bg-grape px-6 py-2 font-display text-xl font-semibold text-white shadow-[0_4px_0_var(--color-grape-dark)] active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-sunny";
const secondaryButton =
  "rounded-2xl border-4 border-ink/20 bg-cloud px-5 py-1.5 font-display text-lg font-semibold text-ink-soft hover:border-grape focus-visible:outline-4 focus-visible:outline-grape";

/**
 * On phones and tablets, asks once whether to add SumCraft to the home screen.
 * "Yes" opens the browser's install sheet where it can (Android/Chromium); on iPhone/iPad,
 * where websites can't install themselves, it shows the two taps needed instead.
 */
export function InstallPrompt() {
  const touch = useCoarsePointer();
  const mode = useInstallMode();
  const [asked, setAsked] = usePersistentFlag(ASKED_KEY, false);
  const [ready, setReady] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), ASK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Only ask when we know installing will work: the browser offered it, or it's iOS.
  const canAsk = touch && (mode === "native" || mode === "ios");
  const asking = ready && canAsk && !asked;

  const accept = async () => {
    setAsked(true);
    if (mode === "native") {
      await promptInstall(); // If they cancel, the header button lets them try again.
    } else {
      setShowHelp(true);
    }
  };

  if (showHelp) {
    return <InstallHelpDialog mode={mode} onClose={() => setShowHelp(false)} />;
  }
  if (!asking) return null;

  return (
    <InstallDialog labelId="install-title" onClose={() => setAsked(true)}>
      <Mascot className="mx-auto w-24 h-24 animate-float" />
      <h2 id="install-title" className="mt-2 font-display text-3xl font-bold">
        Add SumCraft to your home screen?
      </h2>
      <p className="mt-2 text-ink-soft font-semibold">
        Jump straight into your maths missions with one tap, full screen like a real app.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button type="button" autoFocus onClick={accept} className={primaryButton}>
          Yes, add it!
        </button>
        <button type="button" onClick={() => setAsked(true)} className={secondaryButton}>
          No thanks
        </button>
      </div>
    </InstallDialog>
  );
}

/**
 * Small header button, shown on phones and tablets once the player has answered the
 * install question but hasn't installed yet - so they can change their mind quickly.
 */
export function InstallButton() {
  const touch = useCoarsePointer();
  const mode = useInstallMode();
  const [asked] = usePersistentFlag(ASKED_KEY, false);
  const [showHelp, setShowHelp] = useState(false);

  if (!touch || !asked || mode === "installed") return null;

  const install = async () => {
    if (mode === "native") {
      const result = await promptInstall();
      if (result !== "unavailable") return;
    }
    setShowHelp(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={install}
        aria-label="Install SumCraft"
        title="Install SumCraft"
        className="inline-flex items-center gap-1.5 rounded-2xl border-4 border-grape/30 bg-cloud px-2.5 py-1.5 font-display text-lg font-semibold text-grape-dark hover:border-grape active:translate-y-0.5 focus-visible:outline-4 focus-visible:outline-grape"
      >
        <InstallIcon className="w-6 h-6" />
        <span aria-hidden="true" className="hidden sm:inline">
          Install
        </span>
      </button>
      {showHelp && <InstallHelpDialog mode={mode} onClose={() => setShowHelp(false)} />}
    </>
  );
}

/** Step-by-step for devices where we can't open an install sheet ourselves. */
function InstallHelpDialog({ mode, onClose }: { mode: InstallMode; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <InstallDialog labelId="install-help-title" onClose={onClose} dialogRef={dialogRef}>
      <InstallIcon className="mx-auto w-14 h-14 text-grape" />
      <h2 id="install-help-title" className="mt-2 font-display text-3xl font-bold">
        Add SumCraft in two taps
      </h2>
      {mode === "ios" ? (
        <ol className="mt-3 space-y-3 text-left text-lg font-semibold">
          <li className="flex items-center gap-3">
            <Step n={1} />
            <span>
              Tap the <strong>Share</strong> button{" "}
              <ShareIcon className="inline w-6 h-6 -mt-1 text-grape" />
              <span className="sr-only"> (a square with an arrow pointing up)</span> in your browser
              bar.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <Step n={2} />
            <span>
              Choose <strong>Add to Home Screen</strong> ➕
            </span>
          </li>
        </ol>
      ) : (
        <ol className="mt-3 space-y-3 text-left text-lg font-semibold">
          <li className="flex items-center gap-3">
            <Step n={1} />
            <span>
              Open your browser&apos;s <strong>menu</strong>{" "}
              <span aria-hidden="true" className="font-display text-grape">
                ⋮
              </span>
            </span>
          </li>
          <li className="flex items-center gap-3">
            <Step n={2} />
            <span>
              Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>
            </span>
          </li>
        </ol>
      )}
      <div className="mt-5">
        <button
          type="button"
          autoFocus
          onClick={() => dialogRef.current?.close()}
          className={primaryButton}
        >
          Got it!
        </button>
      </div>
    </InstallDialog>
  );
}

/** A modal <dialog>, opened as soon as it mounts. Escape or close() calls onClose. */
function InstallDialog({
  labelId,
  onClose,
  dialogRef,
  children,
}: {
  labelId: string;
  onClose: () => void;
  dialogRef?: RefObject<HTMLDialogElement | null>;
  children: ReactNode;
}) {
  const ownRef = useRef<HTMLDialogElement>(null);
  const ref = dialogRef ?? ownRef;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, [ref]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelId}
      onClose={onClose}
      className="m-auto w-[min(92vw,420px)] rounded-3xl border-4 border-ink bg-cloud p-6 text-center text-ink shadow-[0_10px_0_var(--color-ink)] backdrop:bg-ink/60"
    >
      {children}
    </dialog>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid w-9 h-9 shrink-0 place-items-center rounded-full bg-sunny font-display text-xl"
    >
      {n}
    </span>
  );
}

/** A phone with a down arrow: "put this on my device". */
function InstallIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="5.5" y="2" width="13" height="20" rx="3" />
      <path d="M12 6.5v7.5M8.8 11l3.2 3.2 3.2-3.2" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

/** Apple's share symbol: a box with an arrow coming out of the top. */
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" />
    </svg>
  );
}
