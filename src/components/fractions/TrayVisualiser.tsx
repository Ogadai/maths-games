"use client";

import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { gcd } from "@/lib/maths/fractions";
import {
  TOPPING_COLOURS,
  type FractionScene,
  type Point,
  type SceneFrame,
  type ScenePiece,
  type SceneTray,
  type TrayLabel,
} from "@/lib/maths/fractionScene";

const INK = "#1E2A4A";
const TIN = "#E6E1D8";
const SPONGE = "#F3D9A4";

interface Props {
  scene: FractionScene;
  frame: SceneFrame;
  /** Animation speed multiplier (2 = twice as fast). */
  speed?: number;
  /** Text description of what the picture shows, for screen readers. */
  label: string;
}

type TFn = (duration: number, delay?: number, extra?: Transition) => Transition;

/**
 * Traybakes cut into pieces. Trays are cut both ways so the pieces match,
 * pieces move into the answer tray, and glued pieces merge into bigger ones.
 */
export function TrayVisualiser({ scene, frame, speed = 1, label }: Props) {
  const reduce = useReducedMotion() ?? false;
  const { layout } = scene;
  const k = reduce ? 0 : 1 / speed;
  const t: TFn = (duration, delay = 0, extra = {}) => ({ duration: duration * k, delay: delay * k, ...extra });

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full font-display"
      role="img"
      aria-label={label}
    >
      {layout.signs.map((s) => (
        <text key={s.key} x={s.x} y={s.y + 9} textAnchor="middle" fontSize={28} fontWeight={700} fill={INK}>
          {s.text}
        </text>
      ))}

      {frame.trays.map((tray) => (
        <Tin key={tray.id} tray={tray} t={t} reduce={reduce} celebrate={frame.celebrate} />
      ))}

      <AnimatePresence>
        {frame.pieces.map((p) => (
          <Piece key={p.id} piece={p} t={t} reduce={reduce} />
        ))}
      </AnimatePresence>

      {frame.trays.map((tray) => (
        <KnifeLines key={tray.id} tray={tray} t={t} />
      ))}

      {frame.ghosts.map((g, i) => (
        <motion.rect
          key={`${frame.key}-ghost-${i}`}
          x={g.x + 1.5}
          y={g.y + 1.5}
          width={g.w - 3}
          height={g.h - 3}
          rx={3}
          fill="#fff"
          fillOpacity={0.6}
          stroke="#FF6B6B"
          strokeWidth={2}
          strokeDasharray="4 3"
          initial={{ opacity: 0 }}
          animate={{ opacity: reduce ? 1 : [0, 1, 0.4, 1] }}
          transition={t(1.6, 0.2, reduce ? {} : { repeat: Infinity, repeatType: "reverse" })}
        />
      ))}

      {!reduce && frame.bursts.map((p, i) => <Crumbs key={`${frame.key}-crumbs-${i}`} at={p} t={t} />)}

      {frame.trays.map((tray) => (
        <Label key={tray.id} tray={tray} t={t} />
      ))}
    </svg>
  );
}

function Tin({ tray, t, reduce, celebrate }: { tray: SceneTray; t: TFn; reduce: boolean; celebrate: boolean }) {
  return (
    <motion.g
      key={celebrate && !reduce ? "hop" : "still"}
      initial={false}
      animate={celebrate && !reduce ? { y: [0, -6, 0, -3, 0] } : { y: 0 }}
      transition={t(0.6, tray.id === "A" ? 0 : tray.id === "B" ? 0.1 : 0.2, { repeat: celebrate ? 1 : 0 })}
    >
      <rect
        x={tray.x - 5}
        y={tray.y - 5}
        width={tray.w + 10}
        height={tray.h + 10}
        rx={9}
        fill="#B9B2A6"
        stroke={INK}
        strokeWidth={2}
      />
      <rect x={tray.x} y={tray.y} width={tray.w} height={tray.h} rx={3} fill={TIN} />
      <motion.rect
        x={tray.x - 8}
        y={tray.y - 8}
        width={tray.w + 16}
        height={tray.h + 16}
        rx={12}
        fill="none"
        stroke="#FFC93C"
        strokeWidth={4}
        initial={false}
        animate={{ opacity: tray.whole ? (reduce ? 1 : [0.4, 1, 0.4]) : 0 }}
        transition={tray.whole && !reduce ? t(1.4, 0, { repeat: Infinity }) : t(0.3)}
      />
    </motion.g>
  );
}

function Piece({ piece: p, t, reduce }: { piece: ScenePiece; t: TFn; reduce: boolean }) {
  const colour = TOPPING_COLOURS[p.topping];
  const sponge = Math.min(p.h * 0.28, 7);
  return (
    <motion.g
      initial={{ x: p.x, y: p.y, opacity: 0, scale: 0.6 }}
      animate={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.2, transition: t(0.4, 0.15) }}
      transition={{
        x: t(0.7, p.delay, { ease: [0.34, 1.2, 0.64, 1] }),
        y: t(0.7, p.delay, { ease: [0.34, 1.2, 0.64, 1] }),
        opacity: t(0.4, p.delay),
        scale: t(0.4, p.delay),
      }}
    >
      {/* A cut piece shows its sponge and a shine, so it reads as a slice of cake.
          Uncut or glued pieces are plain topping, so neighbours merge into one piece. */}
      {/* A hair bigger than the cell, so neighbouring pieces meet without anti-aliased seams. */}
      <rect x={-0.4} y={-0.4} width={p.w + 0.8} height={p.h + 0.8} fill={colour} />
      <motion.g initial={false} animate={{ opacity: p.outline ? 1 : 0 }} transition={t(0.4)}>
        <rect y={p.h - sponge} width={p.w} height={sponge} fill={SPONGE} />
        <rect x={p.w * 0.15} y={(p.h - sponge) * 0.25} width={p.w * 0.3} height={Math.min(2, p.h * 0.06)} rx={1} fill="#fff" opacity={0.55} />
      </motion.g>
      <motion.rect
        x={0.6}
        y={0.6}
        width={p.w - 1.2}
        height={p.h - 1.2}
        rx={1.5}
        fill="none"
        stroke={INK}
        strokeWidth={1.1}
        initial={false}
        animate={{ opacity: p.outline ? 0.8 : 0 }}
        transition={t(0.4)}
      />
      <motion.rect
        x={1.5}
        y={1.5}
        width={p.w - 3}
        height={p.h - 3}
        rx={2}
        fill="none"
        stroke="#7B5CFF"
        strokeWidth={2.5}
        initial={false}
        animate={{ opacity: p.glow ? (reduce ? 1 : [0.3, 1, 0.3]) : 0 }}
        transition={p.glow && !reduce ? t(1.1, 0, { repeat: Infinity }) : t(0.2)}
      />
      {p.badge !== undefined && (
        <motion.text
          key={`badge-${p.badge}`}
          x={p.w / 2}
          y={p.h / 2 + Math.min(p.h, p.w) * 0.17}
          textAnchor="middle"
          fontSize={Math.min(p.h, p.w) * 0.5}
          fontWeight={700}
          fill={INK}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={t(0.25, p.delay)}
        >
          {p.badge}
        </motion.text>
      )}
    </motion.g>
  );
}

/** One key per line position, so lines that stay put keep still and new cuts sweep in. */
function linePositions(count: number): { key: string; at: number }[] {
  return Array.from({ length: count - 1 }, (_, i) => {
    const g = gcd(i + 1, count);
    return { key: `${(i + 1) / g}/${count / g}`, at: (i + 1) / count };
  });
}

function KnifeLines({ tray, t }: { tray: SceneTray; t: TFn }) {
  const lines = [
    ...linePositions(tray.cols).map(({ key, at }) => ({
      key: `v${key}`,
      d: `M${tray.x + at * tray.w} ${tray.y} V${tray.y + tray.h}`,
    })),
    ...linePositions(tray.rows).map(({ key, at }) => ({
      key: `h${key}`,
      d: `M${tray.x} ${tray.y + at * tray.h} H${tray.x + tray.w}`,
    })),
  ];
  return (
    <g pointerEvents="none">
      <AnimatePresence initial={false}>
        {lines.map((l, i) => (
          <motion.path
            key={l.key}
            d={l.d}
            stroke={INK}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 1 }}
            animate={{ pathLength: 1, opacity: 0.85 }}
            exit={{ opacity: 0, transition: t(0.5, 0.6) }}
            transition={t(0.45, 0.1 + i * 0.08)}
          />
        ))}
      </AnimatePresence>
    </g>
  );
}

function Label({ tray, t }: { tray: SceneTray; t: TFn }) {
  const cx = tray.x + tray.w / 2;
  const top = tray.y + tray.h + 8;
  const label = tray.label;
  return (
    <AnimatePresence mode="wait">
      {label && (
        <motion.g
          key={labelKey(label)}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: t(0.15) }}
          transition={t(0.35)}
        >
          {label.kind === "text" ? (
            <text x={cx} y={top + 24} textAnchor="middle" fontSize={20} fontWeight={700} fill={INK}>
              {label.text}
            </text>
          ) : (
            <>
              <text x={cx} y={top + 15} textAnchor="middle" fontSize={17} fontWeight={700} fill={INK}>
                {label.n}
              </text>
              <line x1={cx - 13} x2={cx + 13} y1={top + 20} y2={top + 20} stroke={INK} strokeWidth={2} strokeLinecap="round" />
              <text x={cx} y={top + 36} textAnchor="middle" fontSize={17} fontWeight={700} fill={INK}>
                {label.d}
              </text>
            </>
          )}
        </motion.g>
      )}
    </AnimatePresence>
  );
}

const labelKey = (l: TrayLabel) => (l.kind === "text" ? l.text : `${l.n}/${l.d}`);

/** Crumbs flying off where a piece gets eaten. */
function Crumbs({ at, t }: { at: Point; t: TFn }) {
  const bits = 7;
  return (
    <g pointerEvents="none">
      {Array.from({ length: bits }, (_, i) => {
        const a = (i / bits) * Math.PI * 2 + 0.4;
        return (
          <motion.circle
            key={i}
            r={1.8 + (i % 3) * 0.6}
            fill={i % 2 ? SPONGE : "#FF6B6B"}
            initial={{ cx: at.x, cy: at.y, opacity: 1 }}
            animate={{ cx: at.x + Math.cos(a) * 16, cy: at.y + Math.sin(a) * 16 + 6, opacity: 0 }}
            transition={t(0.7, 0.05, { ease: "easeOut" })}
          />
        );
      })}
    </g>
  );
}
