import { motion, useTransform } from "framer-motion";
import { TandemBike } from "@/components/brand/TandemBike";
import { cn } from "@/lib/cn";
import type { RideIntro } from "./useRideIntro";

export function HeroBike({ intro }: { intro: RideIntro }): JSX.Element {
  const { hero, slotRef, replay, setHover, phase, busy } = intro;
  const ringScale = useTransform(hero.glow, [0, 1], [0.55, 1.7]);
  const ringOpacity = useTransform(hero.glow, [0, 0.12, 1], [0, 0.8, 0]);
  const interactive = phase === "done" && !busy;

  return (
    <div ref={slotRef} className="group relative mx-auto aspect-[640/300] w-[min(540px,84vw)]">
      <div className="absolute inset-x-[6%] bottom-[-6%] top-[22%] rounded-[50%] bg-brand-500/25 blur-3xl" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[150%] rounded-full border border-brand-300/50"
        style={{ x: "-50%", y: "-50%", scale: ringScale, opacity: ringOpacity }}
      />

      <motion.button
        type="button"
        onClick={replay}
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        aria-label="Take the Tandem bike for another lap"
        className={cn(
          "absolute inset-0 rounded-3xl outline-none will-change-transform focus-visible:ring-2 focus-visible:ring-brand-300/70",
          interactive ? "cursor-pointer" : "cursor-default",
        )}
        style={{
          x: hero.x,
          y: hero.y,
          rotateY: hero.turn,
          rotate: hero.lean,
          transformPerspective: 1400,
        }}
      >
        <TandemBike wheelAngle={hero.wheel} label={hero.label} speed={hero.speed} />
      </motion.button>

      <span
        className={cn(
          "pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.3em] text-white/0 transition-colors duration-300",
          interactive && "text-white/35 group-hover:text-white/60",
        )}
      >
        Click to take it for a lap
      </span>
    </div>
  );
}
