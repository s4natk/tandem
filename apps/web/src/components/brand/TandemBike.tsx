import { useId, useLayoutEffect, useRef } from "react";
import {
  type MotionValue,
  useAnimationFrame,
  useMotionValue,
  useMotionValueEvent,
} from "framer-motion";
import { cn } from "@/lib/cn";

/** viewBox geometry. Everything below is in these units. */
const VIEW_W = 640;
const VIEW_H = 300;

const REAR = { x: 118, y: 206 };
const FRONT = { x: 522, y: 206 };
const STOKER_BB = { x: 228, y: 222 };
const CAPTAIN_BB = { x: 408, y: 222 };
const STOKER_SEAT = { x: 208, y: 110 };
const CAPTAIN_SEAT = { x: 390, y: 110 };
const HEAD_TOP = { x: 466, y: 104 };
const HEAD_BOTTOM = { x: 478, y: 146 };
const LABEL = { x: 308, y: 167 };
const SPEED_ANCHOR_X = 44;

const RING_RADIUS = 17;
/** Wheel turns per crank turn. */
const CRANK_RATIO = 2.4;
const SPOKE_ANGLES = Array.from({ length: 16 }, (_, i) => (i * Math.PI) / 8);

export const BIKE_ASPECT = VIEW_W / VIEW_H;
/** Outer tire radius in viewBox units. Rolling distance per turn is 2πr. */
export const TIRE_RADIUS = 78;
export const BIKE_VIEW_WIDTH = VIEW_W;

const WHITE = "#f4f2ff";
const SILVER = "#cfc9ff";

interface TandemBikeProps {
  /** Wheel rotation in degrees. Cranks and chain follow it. */
  wheelAngle?: MotionValue<number>;
  /** 0 hides the "Tandem" label on the frame, 1 shows it. */
  label?: MotionValue<number>;
  /** Speed-line length multiplier. 0 hides them. */
  speed?: MotionValue<number>;
  shadow?: boolean;
  className?: string;
}

export function TandemBike({
  wheelAngle,
  label,
  speed,
  shadow = true,
  className,
}: TandemBikeProps): JSX.Element {
  const uid = useId().replace(/:/g, "");
  const frameId = `frame-${uid}`;
  const speedId = `speed-${uid}`;
  const shadowId = `shadow-${uid}`;

  const zero = useMotionValue(0);
  const one = useMotionValue(1);
  const wheel = wheelAngle ?? zero;
  const labelMv = label ?? one;
  const speedMv = speed ?? one;

  const rearSpokes = useRef<SVGGElement>(null);
  const frontSpokes = useRef<SVGGElement>(null);
  const stokerCrank = useRef<SVGGElement>(null);
  const captainCrank = useRef<SVGGElement>(null);
  const chains = useRef<SVGPathElement[]>([]);
  const labelRef = useRef<SVGGElement>(null);
  const speedRef = useRef<SVGGElement>(null);

  // SVG transforms are written straight to the DOM so a running animation
  // never re-renders React.
  const applyWheel = (angle: number): void => {
    rearSpokes.current?.setAttribute("transform", `rotate(${angle} ${REAR.x} ${REAR.y})`);
    frontSpokes.current?.setAttribute("transform", `rotate(${angle} ${FRONT.x} ${FRONT.y})`);
    const crank = angle / CRANK_RATIO;
    stokerCrank.current?.setAttribute(
      "transform",
      `rotate(${crank} ${STOKER_BB.x} ${STOKER_BB.y})`,
    );
    captainCrank.current?.setAttribute(
      "transform",
      `rotate(${crank} ${CAPTAIN_BB.x} ${CAPTAIN_BB.y})`,
    );
    const offset = -((crank * Math.PI) / 180) * RING_RADIUS;
    for (const path of chains.current) path.style.strokeDashoffset = String(offset);
  };

  const applyLabel = (value: number): void => {
    const el = labelRef.current;
    if (!el) return;
    const v = Math.max(0, value);
    const scale = 0.65 + 0.35 * v;
    el.setAttribute("opacity", String(Math.min(1, v)));
    el.setAttribute(
      "transform",
      `translate(${LABEL.x} ${LABEL.y}) scale(${scale}) translate(${-LABEL.x} ${-LABEL.y})`,
    );
  };

  const applySpeed = (value: number): void => {
    const el = speedRef.current;
    if (!el) return;
    const v = Math.max(0, value);
    el.setAttribute("opacity", String(Math.min(1, v)));
    el.setAttribute(
      "transform",
      `translate(${SPEED_ANCHOR_X} 0) scale(${v} 1) translate(${-SPEED_ANCHOR_X} 0)`,
    );
  };

  useMotionValueEvent(wheel, "change", applyWheel);
  useMotionValueEvent(labelMv, "change", applyLabel);
  useMotionValueEvent(speedMv, "change", applySpeed);

  useLayoutEffect(() => {
    applyWheel(wheel.get());
    applyLabel(labelMv.get());
    applySpeed(speedMv.get());
  }, [wheel, labelMv, speedMv]);

  const chainRef = (index: number) => (el: SVGPathElement | null) => {
    if (el) chains.current[index] = el;
  };

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn("block h-auto w-full", className)}
      style={{ overflow: "visible" }}
      role="img"
      aria-label="Tandem bicycle"
    >
      <defs>
        <linearGradient id={frameId} gradientUnits="userSpaceOnUse" x1="60" y1="80" x2="600" y2="260">
          <stop offset="0" stopColor="#a194ff" />
          <stop offset="0.5" stopColor="#7262fb" />
          <stop offset="1" stopColor="#5640e6" />
        </linearGradient>
        <linearGradient
          id={speedId}
          gradientUnits="userSpaceOnUse"
          x1="-60"
          y1="0"
          x2={SPEED_ANCHOR_X}
          y2="0"
        >
          <stop offset="0" stopColor="#8d7cff" stopOpacity="0" />
          <stop offset="1" stopColor="#b3a7ff" />
        </linearGradient>
        <filter id={shadowId} x="-10%" y="-300%" width="120%" height="700%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {shadow && (
        <ellipse
          cx={320}
          cy={292}
          rx={262}
          ry={7}
          fill="#000"
          opacity={0.55}
          filter={`url(#${shadowId})`}
        />
      )}

      <g ref={speedRef} stroke={`url(#${speedId})`} strokeWidth={5.5} strokeLinecap="round">
        <line x1={6} y1={166} x2={SPEED_ANCHOR_X} y2={166} />
        <line x1={-8} y1={184} x2={SPEED_ANCHOR_X - 6} y2={184} />
        <line x1={10} y1={202} x2={SPEED_ANCHOR_X} y2={202} />
      </g>

      <Wheel cx={REAR.x} cy={REAR.y} spokesRef={rearSpokes} hubColor="#7262fb" />
      <Wheel cx={FRONT.x} cy={FRONT.y} spokesRef={frontSpokes} hubColor="#7262fb" />

      {/* Drive chain to the rear cog, then the timing chain between cranks. */}
      <g fill="none" stroke={SILVER} strokeOpacity={0.75} strokeWidth={2.4} strokeDasharray="5 4.5">
        <path ref={chainRef(0)} d={`M${REAR.x} ${REAR.y - 10} L${STOKER_BB.x} ${STOKER_BB.y - RING_RADIUS}`} />
        <path ref={chainRef(1)} d={`M${STOKER_BB.x} ${STOKER_BB.y + RING_RADIUS} L${REAR.x} ${REAR.y + 10}`} />
        <path
          ref={chainRef(2)}
          d={`M${STOKER_BB.x} ${STOKER_BB.y - RING_RADIUS} L${CAPTAIN_BB.x} ${CAPTAIN_BB.y - RING_RADIUS}`}
        />
        <path
          ref={chainRef(3)}
          d={`M${CAPTAIN_BB.x} ${CAPTAIN_BB.y + RING_RADIUS} L${STOKER_BB.x} ${STOKER_BB.y + RING_RADIUS}`}
        />
      </g>
      <circle cx={REAR.x} cy={REAR.y} r={10} fill="none" stroke={SILVER} strokeWidth={2.4} />

      <g stroke={`url(#${frameId})`} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path
          d={`M${STOKER_SEAT.x} ${STOKER_SEAT.y} L${REAR.x} ${REAR.y} L${STOKER_BB.x} ${STOKER_BB.y}`}
          strokeWidth={7.5}
        />
        <path d={`M${STOKER_SEAT.x} ${STOKER_SEAT.y} L${HEAD_TOP.x} ${HEAD_TOP.y}`} strokeWidth={11} />
        <path d={`M${STOKER_BB.x} ${STOKER_BB.y} L${STOKER_SEAT.x} ${STOKER_SEAT.y}`} strokeWidth={11} />
        <path d={`M${CAPTAIN_BB.x} ${CAPTAIN_BB.y} L${CAPTAIN_SEAT.x} ${CAPTAIN_SEAT.y}`} strokeWidth={11} />
        <path d={`M${STOKER_BB.x} ${STOKER_BB.y} L${CAPTAIN_BB.x} ${CAPTAIN_BB.y}`} strokeWidth={11} />
        <path d={`M${CAPTAIN_BB.x} ${CAPTAIN_BB.y} L${HEAD_BOTTOM.x} ${HEAD_BOTTOM.y}`} strokeWidth={11} />
        <path d={`M${HEAD_TOP.x} ${HEAD_TOP.y} L${HEAD_BOTTOM.x} ${HEAD_BOTTOM.y}`} strokeWidth={14} />
        <path
          d={`M${HEAD_BOTTOM.x} ${HEAD_BOTTOM.y} C 484 172, 500 196, ${FRONT.x} ${FRONT.y}`}
          strokeWidth={8}
        />
        {/* Captain stem and swept handlebar */}
        <path d={`M${HEAD_TOP.x} ${HEAD_TOP.y} L472 84`} strokeWidth={8} />
        <path d="M472 84 C 486 76, 506 76, 514 90" strokeWidth={7} />
      </g>

      {/* Seat posts, stoker bar, saddles, grips */}
      <g stroke={SILVER} strokeLinecap="round" fill="none">
        <path d={`M${STOKER_SEAT.x} ${STOKER_SEAT.y} L203 90`} strokeWidth={6} />
        <path d={`M${CAPTAIN_SEAT.x} ${CAPTAIN_SEAT.y} L385 90`} strokeWidth={6} />
        <path d="M387 99 L362 93" strokeWidth={5.5} />
      </g>
      <g stroke={WHITE} strokeLinecap="round" fill="none">
        <path d="M514 90 L510 104" strokeWidth={8.5} />
        <path d="M362 93 L352 93.5" strokeWidth={7.5} />
      </g>
      <Saddle x={203} y={88} />
      <Saddle x={385} y={88} />

      <Crank cx={STOKER_BB.x} cy={STOKER_BB.y} crankRef={stokerCrank} />
      <Crank cx={CAPTAIN_BB.x} cy={CAPTAIN_BB.y} crankRef={captainCrank} />

      <g ref={labelRef}>
        <text
          x={LABEL.x}
          y={LABEL.y + 14}
          textAnchor="middle"
          fontFamily="Outfit, Inter, ui-sans-serif, system-ui, sans-serif"
          fontWeight={700}
          fontSize={40}
          letterSpacing={-0.5}
          fill="#ffffff"
        >
          Tandem
        </text>
      </g>
    </svg>
  );
}

function Wheel({
  cx,
  cy,
  spokesRef,
  hubColor,
}: {
  cx: number;
  cy: number;
  spokesRef: React.Ref<SVGGElement>;
  hubColor: string;
}): JSX.Element {
  return (
    <g>
      <circle cx={cx} cy={cy} r={TIRE_RADIUS + 0.5} fill="none" stroke="rgba(178,168,255,0.28)" strokeWidth={1.4} />
      <circle cx={cx} cy={cy} r={72} fill="none" stroke="#15122f" strokeWidth={12} />
      <g ref={spokesRef}>
        {/* Tread mark so the roll reads at a glance. */}
        <path
          d={`M${cx - 18} ${cy - 69.7} A 72 72 0 0 1 ${cx + 18} ${cy - 69.7}`}
          fill="none"
          stroke="#2f2966"
          strokeWidth={12}
        />
        {SPOKE_ANGLES.map((a) => (
          <line
            key={a}
            x1={cx + Math.cos(a) * 9}
            y1={cy + Math.sin(a) * 9}
            x2={cx + Math.cos(a) * 62}
            y2={cy + Math.sin(a) * 62}
            stroke={SILVER}
            strokeOpacity={0.5}
            strokeWidth={1.2}
          />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={64} fill="none" stroke={WHITE} strokeWidth={2.6} />
      <circle cx={cx} cy={cy} r={8.5} fill={WHITE} />
      <circle cx={cx} cy={cy} r={3.4} fill={hubColor} />
    </g>
  );
}

function Crank({
  cx,
  cy,
  crankRef,
}: {
  cx: number;
  cy: number;
  crankRef: React.Ref<SVGGElement>;
}): JSX.Element {
  return (
    <g>
      <circle cx={cx} cy={cy} r={RING_RADIUS} fill="#100d27" stroke={WHITE} strokeWidth={3} />
      <g ref={crankRef}>
        <line x1={cx} y1={cy} x2={cx} y2={cy - 30} stroke="#4636c4" strokeWidth={6} strokeLinecap="round" />
        <rect x={cx - 7} y={cy - 34} width={14} height={6} rx={2} fill="#7a6ef0" />
        <line x1={cx} y1={cy} x2={cx} y2={cy + 30} stroke={SILVER} strokeWidth={6} strokeLinecap="round" />
        <rect x={cx - 8} y={cy + 27} width={16} height={7} rx={2} fill={WHITE} />
      </g>
      <circle cx={cx} cy={cy} r={4.5} fill={WHITE} />
    </g>
  );
}

function Saddle({ x, y }: { x: number; y: number }): JSX.Element {
  // Wide back on the left, nose pointing forward (right).
  return (
    <path
      d={`M${x - 22} ${y - 4}
          C ${x - 14} ${y - 11}, ${x + 2} ${y - 10}, ${x + 12} ${y - 6}
          L ${x + 21} ${y - 4}
          C ${x + 24} ${y - 1}, ${x + 21} ${y + 2}, ${x + 16} ${y + 2}
          L ${x - 14} ${y + 3}
          C ${x - 21} ${y + 3}, ${x - 25} ${y}, ${x - 22} ${y - 4} Z`}
      fill={WHITE}
    />
  );
}

/**
 * Keeps wheels turning at `degreesPerSecond`. Animate the speed value to
 * speed up, slow down, or stop without the wheel position jumping.
 */
export function useCruise(
  wheel: MotionValue<number>,
  degreesPerSecond: MotionValue<number>,
): void {
  useAnimationFrame((_, delta) => {
    const speed = degreesPerSecond.get();
    if (speed !== 0) wheel.set(wheel.get() + (speed * Math.min(delta, 64)) / 1000);
  });
}

/** Self-contained cruising bike for decorative use. */
export function CruisingBike({
  degreesPerSecond = 160,
  className,
}: {
  degreesPerSecond?: number;
  className?: string;
}): JSX.Element {
  const wheel = useMotionValue(0);
  const speed = useMotionValue(degreesPerSecond);
  useLayoutEffect(() => {
    speed.set(degreesPerSecond);
  }, [degreesPerSecond, speed]);
  useCruise(wheel, speed);
  return <TandemBike wheelAngle={wheel} className={className} />;
}

/** Compact mark for navs, sidebars, and buttons. */
export function TandemMark({ className }: { className?: string }): JSX.Element {
  const uid = useId().replace(/:/g, "");
  const gradientId = `mark-${uid}`;
  return (
    <svg viewBox="0 0 48 30" className={cn("block h-7 w-auto", className)} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="6" y1="6" x2="44" y2="26">
          <stop offset="0" stopColor="#a194ff" />
          <stop offset="1" stopColor="#5f49f0" />
        </linearGradient>
      </defs>
      <circle cx="9" cy="21" r="7" fill="none" stroke={WHITE} strokeWidth="2" />
      <circle cx="39" cy="21" r="7" fill="none" stroke={WHITE} strokeWidth="2" />
      <g
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15.5 11 L34 10.4 L35.2 14.6 L28.5 22 L17 22 Z" />
        <path d="M17 22 L15.5 11 M28.5 22 L27 11 M15.5 11 L9 21 L17 22 M35.2 14.6 L39 21" />
        <path d="M34 10.4 L35 7.4 C 36.6 6.6, 38.4 6.8, 39.2 8.2" />
      </g>
      <g stroke={WHITE} strokeWidth="2.2" strokeLinecap="round">
        <path d="M12.6 8.4 H17.2" />
        <path d="M24.2 8.4 H28.8" />
      </g>
    </svg>
  );
}
