import { motion, type MotionValue, useMotionValue, useTransform } from "framer-motion";
import { BIKE_ASPECT, TandemBike } from "@/components/brand/TandemBike";

interface Props {
  x: MotionValue<number>;
  wheel: MotionValue<number>;
  speed: MotionValue<number>;
  width: number;
  onSkip: () => void;
}

/** Share of the bike width where the reveal edge sits: the rear hub. */
const REVEAL_AT = 0.185;
/** Tire bottom as a share of bike height, used for the road line. */
const GROUND_AT = 0.947;

export function IntroCurtain({ x, wheel, speed, width, onSkip }: Props): JSX.Element {
  const hiddenLabel = useMotionValue(0);
  const height = width / BIKE_ASPECT;
  const edge = useTransform(x, (v) => v + width * REVEAL_AT);
  const clipPath = useTransform(edge, (e) => `inset(0px 0px 0px ${Math.max(0, e)}px)`);
  const percent = useTransform(edge, (e) => {
    const share = Math.min(1, Math.max(0, e / window.innerWidth));
    return String(Math.round(share * 100)).padStart(2, "0");
  });

  return (
    <motion.div
      className="fixed inset-0 z-[70]"
      exit={{ opacity: 0, transition: { duration: 0.35, ease: "easeOut" } }}
    >
      <motion.div className="absolute inset-0 bg-ink-950" style={{ clipPath }}>
        <div className="bg-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black,transparent)]" />
        <div
          className="absolute inset-x-0 border-t border-dashed border-white/10"
          style={{ top: `calc(50% + ${height * (GROUND_AT - 0.5)}px)` }}
        />
        <div className="absolute left-6 top-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
          Tandem
        </div>
        <div className="absolute bottom-6 right-6 text-right">
          <div className="font-display text-6xl font-bold tabular-nums text-white/90 sm:text-7xl">
            <motion.span>{percent}</motion.span>
            <span className="text-brand-400">%</span>
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">
            Rolling in
          </div>
        </div>
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-transparent via-brand-300 to-transparent shadow-[0_0_32px_8px_rgba(141,124,255,0.55)]"
        style={{ x: edge }}
      />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-1/2 will-change-transform"
        style={{ x, y: "-50%", width }}
      >
        <div className="absolute inset-x-[12%] bottom-[8%] top-[35%] rounded-[50%] bg-brand-500/35 blur-3xl" />
        <TandemBike wheelAngle={wheel} label={hiddenLabel} speed={speed} className="relative" />
      </motion.div>

      <button
        type="button"
        onClick={onSkip}
        className="absolute bottom-6 left-6 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur transition hover:border-white/30 hover:text-white"
      >
        Skip intro
        <span className="ml-2 text-white/35">Esc</span>
      </button>
    </motion.div>
  );
}
