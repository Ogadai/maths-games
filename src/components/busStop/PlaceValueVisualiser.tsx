"use client";

import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import {
  BLOCK_SIZE,
  LANE_COLOURS,
  PLACE_COLOURS,
  colX,
  laneY,
  type BlockKind,
  type BusStopScene,
  type SceneBlock,
  type SceneFrame,
} from "@/lib/maths/busStopScene";

const INK = "#1E2A4A";
const PLACE_LABEL: Record<BlockKind, string> = {
  thousands: "Thousands",
  hundreds: "Hundreds",
  tens: "Tens",
  ones: "Ones",
};

interface Props {
  scene: BusStopScene;
  frame: SceneFrame;
  /** Animation speed multiplier (2 = twice as fast). */
  speed?: number;
  /** Text description of what the picture shows, for screen readers. */
  label: string;
}

/**
 * Place-value blocks being shared between buses (the meaning of division).
 * Everything is drawn in one SVG that scales to fit its container, so it works
 * in a tall phone layout as well as beside the board on a wide screen.
 */
export function PlaceValueVisualiser({ scene, frame, speed = 1, label }: Props) {
  const reduce = useReducedMotion() ?? false;
  const { layout } = scene;
  const k = reduce ? 0 : 1 / speed;
  /** A transition scaled by speed (and instant when the user prefers reduced motion). */
  const t = (duration: number, delay = 0, extra: Transition = {}): Transition => ({
    duration: duration * k,
    delay: delay * k,
    ...extra,
  });

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full font-display"
      role="img"
      aria-label={label}
    >
      <Backdrop scene={scene} />

      {/* Highlight the column being worked on, like the board does. */}
      <motion.rect
        y={1}
        width={layout.colW - 4}
        height={layout.height - 2}
        rx={12}
        fill="#FFC93C"
        initial={false}
        animate={{
          x: colX(layout, frame.focusCol ?? 0) + 2,
          opacity: frame.focusCol === null ? 0 : 0.28,
        }}
        transition={t(0.5, 0, { ease: "easeInOut" })}
      />

      <Headers scene={scene} />
      <Lanes scene={scene} frame={frame} t={t} reduce={reduce} />

      {frame.ghosts.map((g) => (
        <motion.g
          key={`${frame.key}-${g.key}`}
          initial={{ ...centred(g.kind, g.x, g.y, g.scale), opacity: 0 }}
          animate={{ opacity: reduce ? 1 : [0, 1, 0.35, 1] }}
          transition={t(1.6, frame.duration - 0.6, reduce ? {} : { repeat: Infinity, repeatType: "reverse" })}
        >
          <motion.g style={{ scale: g.scale }}>
            <Ghost kind={g.kind} />
          </motion.g>
        </motion.g>
      ))}

      <AnimatePresence>
        {frame.blocks.map((b) => (
          <Block key={b.id} block={b} t={t} reduce={reduce} />
        ))}
      </AnimatePresence>

      {!reduce &&
        frame.bursts.map((p, i) => <Burst key={`${frame.key}-burst-${i}`} x={p.x} y={p.y} t={t} />)}

      {frame.badges.map(({ col, count }) => (
        <motion.g
          key={`badge-${col}-${count}`}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={t(0.35, Math.max(0, frame.duration - 0.5))}
        >
          <rect
            x={colX(layout, col) + layout.colW - 40}
            y={layout.pileTop + 3}
            width={34}
            height={16}
            rx={8}
            fill={INK}
          />
          <text
            x={colX(layout, col) + layout.colW - 23}
            y={layout.pileTop + 15}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill="#fff"
          >
            {count}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

type TFn = (duration: number, delay?: number, extra?: Transition) => Transition;

function Backdrop({ scene }: { scene: BusStopScene }) {
  const { layout } = scene;
  const left = layout.labelW - 2;
  const right = layout.width - 6;
  const signY = layout.pileTop + 8;
  return (
    <g>
      {/* The stop, where blocks wait to be shared */}
      <rect
        x={left}
        y={layout.pileTop}
        width={right - left}
        height={layout.pileH}
        rx={14}
        fill="#FFFFFF"
        stroke={INK}
        strokeOpacity={0.25}
        strokeWidth={2}
        strokeDasharray="6 5"
      />
      {/* Bus stop sign */}
      <line x1={30} x2={30} y1={signY + 20} y2={layout.pileTop + layout.pileH - 4} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <ellipse cx={30} cy={layout.pileTop + layout.pileH - 3} rx={10} ry={2.5} fill={INK} opacity={0.25} />
      <rect x={10} y={signY} width={40} height={26} rx={7} fill="#7B5CFF" stroke={INK} strokeWidth={2} />
      <text x={30} y={signY + 11} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#fff">
        BUS
      </text>
      <text x={30} y={signY + 21} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#fff">
        STOP
      </text>

      {/* Column dividers */}
      {Array.from({ length: layout.columns - 1 }, (_, c) => (
        <line
          key={c}
          x1={colX(layout, c + 1)}
          x2={colX(layout, c + 1)}
          y1={layout.pileTop + 6}
          y2={layout.height - 4}
          stroke={INK}
          strokeOpacity={0.15}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      ))}
    </g>
  );
}

function Headers({ scene }: { scene: BusStopScene }) {
  const { layout } = scene;
  return (
    <g>
      {layout.kinds.map((kind, c) => (
        <g key={c}>
          <rect x={colX(layout, c) + 8} y={1} width={layout.colW - 16} height={18} rx={9} fill={PLACE_COLOURS[kind]} opacity={0.25} />
          <text x={colX(layout, c) + layout.colW / 2} y={14.5} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={INK}>
            {PLACE_LABEL[kind]}
          </text>
        </g>
      ))}
    </g>
  );
}

function Lanes({
  scene,
  frame,
  t,
  reduce,
}: {
  scene: BusStopScene;
  frame: SceneFrame;
  t: TFn;
  reduce: boolean;
}) {
  const { layout } = scene;
  const h = layout.laneH;
  return (
    <g>
      {Array.from({ length: layout.lanes }, (_, lane) => {
        const y = laneY(layout, lane);
        const colour = LANE_COLOURS[lane % LANE_COLOURS.length];
        const hop = frame.hops?.[lane];
        const bodyH = h - 6;
        return (
          <g key={lane}>
            <rect x={4} y={y} width={layout.width - 10} height={h} rx={Math.min(12, h / 2)} fill={colour} fillOpacity={0.12} stroke={colour} strokeWidth={1.5} />
            <motion.g
              key={hop !== undefined && !reduce ? `${frame.key}-${lane}` : "still"}
              initial={false}
              animate={hop !== undefined && !reduce ? { y: [0, -7, 0, -3, 0] } : { y: 0 }}
              transition={t(0.55, hop ?? 0, frame.celebrate ? { repeat: 2, repeatDelay: 0.25 } : {})}
            >
              {/* A little bus, seen from the front */}
              <rect x={9} y={y + 3} width={42} height={bodyH} rx={7} fill={colour} stroke={INK} strokeWidth={1.5} />
              <rect x={13} y={y + 6} width={34} height={bodyH * 0.42} rx={3.5} fill="#fff" stroke={INK} strokeWidth={1} />
              <circle cx={23} cy={y + 6 + bodyH * 0.21} r={Math.max(1.6, bodyH * 0.08)} fill={INK} />
              <circle cx={37} cy={y + 6 + bodyH * 0.21} r={Math.max(1.6, bodyH * 0.08)} fill={INK} />
              <text x={30} y={y + 3 + bodyH - 3} textAnchor="middle" fontSize={Math.max(8, bodyH * 0.38)} fontWeight={700} fill="#fff" stroke={INK} strokeWidth={0.6}>
                {lane + 1}
              </text>
            </motion.g>
          </g>
        );
      })}
    </g>
  );
}

/**
 * Motion scales SVG groups about their own centre, so the outer group only moves
 * and the inner one scales. The outer position is nudged so that, once scaled,
 * the block's top-left corner lands exactly on (x, y).
 */
function centred(kind: BlockKind, x: number, y: number, scale: number) {
  const { w, h } = BLOCK_SIZE[kind];
  return { x: x - ((1 - scale) * w) / 2, y: y - ((1 - scale) * h) / 2 };
}

function Block({ block: b, t, reduce }: { block: SceneBlock; t: TFn; reduce: boolean }) {
  const start = b.from ?? { x: b.x, y: b.y };
  const s = b.scale;
  const pulse = b.leftover && !reduce;
  return (
    <motion.g
      initial={centred(b.kind, start.x, start.y, s)}
      animate={centred(b.kind, b.x, b.y, s)}
      exit={{ opacity: 0, transition: t(0.3, 0.1) }}
      transition={t(0.6, b.delay, { ease: [0.34, 1.35, 0.64, 1] })}
    >
      <motion.g
        initial={{ scale: b.from ? 0.3 * s : 0, opacity: 0 }}
        animate={{ scale: pulse ? [s, s * 1.18, s] : s, opacity: 1 }}
        transition={
          pulse
            ? { scale: t(1.1, 0.6, { repeat: Infinity }), opacity: t(0.3, b.delay) }
            : t(0.6, b.delay)
        }
      >
        <BlockShape kind={b.kind} glow={b.leftover} />
      </motion.g>
    </motion.g>
  );
}

/** Dienes-style blocks: thousand cube, hundred flat, ten rod, one cube. */
function BlockShape({ kind, glow }: { kind: BlockKind; glow: boolean }) {
  const c = PLACE_COLOURS[kind];
  const { w, h } = BLOCK_SIZE[kind];
  return (
    <g>
      {/* Always drawn (just invisible) so the group's size, and so its centre, never changes. */}
      <rect x={-3} y={-3} width={w + 6} height={h + 6} rx={4} fill="none" stroke="#FF6B6B" strokeWidth={2.2} opacity={glow ? 1 : 0} />
      {kind === "ones" && <rect width={w} height={h} rx={2} fill={c} stroke={INK} strokeWidth={1.2} />}
      {kind === "tens" && (
        <>
          <rect width={w} height={h} rx={1.5} fill={c} stroke={INK} strokeWidth={1.2} />
          <path d={Array.from({ length: 9 }, (_, i) => `M0 ${(i + 1) * 2.6}h${w}`).join("")} stroke={INK} strokeOpacity={0.45} strokeWidth={0.6} />
        </>
      )}
      {kind === "hundreds" && (
        <>
          <rect width={w} height={h} rx={2} fill={c} stroke={INK} strokeWidth={1.2} />
          <path
            d={Array.from({ length: 9 }, (_, i) => `M${(i + 1) * 2.2} 0v${h}M0 ${(i + 1) * 2.2}h${w}`).join("")}
            stroke={INK}
            strokeOpacity={0.3}
            strokeWidth={0.5}
          />
        </>
      )}
      {kind === "thousands" && (
        <>
          <rect y={5} width={17} height={17} fill={c} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
          <path d="M0 5 L5 0 H22 L17 5 Z" fill={c} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
          <path d="M0 5 L5 0 H22 L17 5 Z" fill="#fff" opacity={0.35} />
          <path d="M17 5 L22 0 V17 L17 22 Z" fill={c} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
          <path d="M17 5 L22 0 V17 L17 22 Z" fill={INK} opacity={0.25} />
          <path d="M5.7 5v17M11.3 5v17M0 10.7h17M0 16.3h17" stroke={INK} strokeOpacity={0.3} strokeWidth={0.6} />
        </>
      )}
    </g>
  );
}

function Ghost({ kind }: { kind: BlockKind }) {
  const { w, h } = BLOCK_SIZE[kind];
  return (
    <g>
      <rect width={w} height={h} rx={2} fill="#fff" stroke="#FF6B6B" strokeWidth={1.5} strokeDasharray="3 2" />
      <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontSize={Math.min(12, w + 4)} fontWeight={700} fill="#FF6B6B">
        ?
      </text>
    </g>
  );
}

/** A sparkle where a block breaks into ten smaller ones. */
function Burst({ x, y, t }: { x: number; y: number; t: TFn }) {
  const rays = 8;
  return (
    <g pointerEvents="none">
      <motion.circle
        cx={x}
        cy={y}
        fill="none"
        stroke="#FFC93C"
        strokeWidth={3}
        initial={{ r: 2, opacity: 1 }}
        animate={{ r: 20, opacity: 0 }}
        transition={t(0.6, 0.1)}
      />
      {Array.from({ length: rays }, (_, i) => {
        const a = (i / rays) * Math.PI * 2;
        return (
          <motion.path
            key={i}
            d="M0 -4 L1.2 -1.2 L4 0 L1.2 1.2 L0 4 L-1.2 1.2 L-4 0 L-1.2 -1.2 Z"
            fill={i % 2 ? "#FFC93C" : "#FF8FCF"}
            initial={{ x, y, scale: 0.4, opacity: 1 }}
            animate={{ x: x + Math.cos(a) * 22, y: y + Math.sin(a) * 22, scale: 1.2, opacity: 0, rotate: 90 }}
            transition={t(0.7, 0.1, { ease: "easeOut" })}
          />
        );
      })}
    </g>
  );
}
