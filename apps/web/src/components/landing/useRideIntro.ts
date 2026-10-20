import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  type AnimationPlaybackControls,
  type MotionValue,
  type ValueAnimationTransition,
  useMotionValue,
} from "framer-motion";
import { BIKE_VIEW_WIDTH, TIRE_RADIUS, useCruise } from "@/components/brand/TandemBike";

const SEEN_KEY = "tandem.intro.seen";
const CRUISE_SPEED = 150;
const HOVER_SPEED = 560;

type Ease = [number, number, number, number];
const EASE_PASS: Ease = [0.7, 0, 0.3, 1];
const EASE_BRAKE: Ease = [0.16, 1, 0.3, 1];
const EASE_LAUNCH: Ease = [0.55, 0, 0.85, 0.3];
const EASE_TURN: Ease = [0.65, 0, 0.35, 1];

/** curtain: big pass across the screen. arriving: hero bike riding back in. */
export type IntroPhase = "curtain" | "arriving" | "done";

export interface RideIntro {
  phase: IntroPhase;
  /** Hero copy and buttons are visible. */
  revealed: boolean;
  /** A replay lap is in progress. */
  busy: boolean;
  curtainWidth: number;
  curtain: {
    x: MotionValue<number>;
    wheel: MotionValue<number>;
    speed: MotionValue<number>;
  };
  hero: {
    x: MotionValue<number>;
    y: MotionValue<number>;
    /** rotateY in degrees. 180 faces left. */
    turn: MotionValue<number>;
    lean: MotionValue<number>;
    wheel: MotionValue<number>;
    label: MotionValue<number>;
    speed: MotionValue<number>;
    glow: MotionValue<number>;
  };
  slotRef: React.RefObject<HTMLDivElement>;
  skip: () => void;
  replay: () => void;
  setHover: (hovering: boolean) => void;
}

function hasSeenIntro(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markIntroSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Storage can be blocked; the intro simply plays again next visit.
  }
}

/** Dominates a desktop screen and still overflows a phone. */
function curtainBikeWidth(vw: number, vh: number): number {
  return Math.min(1500, Math.max(Math.min(vw * 0.92, vh * 1.45), Math.min(vw * 1.5, 560)));
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function useRideIntro(): RideIntro {
  const [autoplay] = useState(() => !hasSeenIntro());
  const [phase, setPhase] = useState<IntroPhase>(autoplay ? "curtain" : "done");
  const [revealed, setRevealed] = useState(!autoplay);
  const [busy, setBusy] = useState(false);
  const [curtainWidth, setCurtainWidth] = useState(() =>
    curtainBikeWidth(window.innerWidth, window.innerHeight),
  );

  const curtainX = useMotionValue(-curtainWidth);
  const curtainWheel = useMotionValue(0);
  const curtainSpeed = useMotionValue(2.6);

  const heroX = useMotionValue(autoplay ? window.innerWidth * 2 : 0);
  const heroY = useMotionValue(0);
  const heroTurn = useMotionValue(autoplay ? 180 : 0);
  const heroLean = useMotionValue(0);
  const heroWheel = useMotionValue(0);
  const label = useMotionValue(autoplay ? 0 : 1);
  const speedLines = useMotionValue(1);
  const glow = useMotionValue(0);
  const cruise = useMotionValue(0);
  useCruise(heroWheel, cruise);

  const slotRef = useRef<HTMLDivElement>(null);
  const runId = useRef(0);
  const active = useRef<AnimationPlaybackControls[]>([]);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const busyRef = useRef(false);

  const go = useCallback(
    (
      value: MotionValue<number>,
      to: number | number[],
      options: ValueAnimationTransition<number>,
    ): AnimationPlaybackControls => {
      const controls = animate(value, to, options);
      active.current.push(controls);
      void controls.then(() => {
        active.current = active.current.filter((c) => c !== controls);
      });
      return controls;
    },
    [],
  );

  const stopAll = useCallback(() => {
    for (const controls of active.current) controls.stop();
    active.current = [];
  }, []);

  /** Moves a bike and turns its wheels by exactly the distance travelled. */
  const ride = useCallback(
    (
      x: MotionValue<number>,
      wheel: MotionValue<number>,
      to: number,
      options: { duration: number; ease: Ease; facing: 1 | -1; radiusPx: number },
    ) => {
      const distance = to - x.get();
      const degrees = (options.facing * distance * 360) / (2 * Math.PI * options.radiusPx);
      const timing = { duration: options.duration, ease: options.ease };
      return Promise.all([go(x, to, timing), go(wheel, wheel.get() + degrees, timing)]);
    },
    [go],
  );

  const finish = useCallback(() => {
    setPhase("done");
    setRevealed(true);
    busyRef.current = false;
    setBusy(false);
    markIntroSeen();
    go(cruise, CRUISE_SPEED, { duration: 1.4, ease: "easeInOut" });
  }, [cruise, go]);

  const settle = useCallback(() => {
    runId.current++;
    stopAll();
    heroX.set(0);
    heroY.set(0);
    heroTurn.set(0);
    heroLean.set(0);
    label.set(1);
    speedLines.set(1);
    glow.set(0);
    finish();
  }, [finish, glow, heroLean, heroTurn, heroX, heroY, label, speedLines, stopAll]);

  /** Rides in from the right edge, brakes in the slot, turns to face right. */
  const arrive = useCallback(
    async (id: number) => {
      const alive = (): boolean => runId.current === id;
      const slot = slotRef.current;
      if (!slot) {
        settle();
        return;
      }
      const rect = slot.getBoundingClientRect();
      const radiusPx = (TIRE_RADIUS * rect.width) / BIKE_VIEW_WIDTH;

      cruise.set(0);
      heroTurn.set(180);
      heroY.set(0);
      heroLean.set(0);
      label.set(0);
      speedLines.set(1.8);
      heroX.set(window.innerWidth - rect.left + 32);
      if (phaseRef.current === "curtain") setPhase("arriving");

      await ride(heroX, heroWheel, 0, {
        duration: 1.35,
        ease: EASE_BRAKE,
        facing: -1,
        radiusPx,
      });
      if (!alive()) return;

      go(speedLines, 0, { duration: 0.25 });
      await Promise.all([
        go(heroTurn, 0, { duration: 0.65, ease: EASE_TURN }),
        go(heroY, [0, -18, 0], { duration: 0.65, times: [0, 0.45, 1], ease: "easeInOut" }),
      ]);
      if (!alive()) return;

      go(label, 1, { type: "spring", stiffness: 240, damping: 15 });
      go(speedLines, 1, { duration: 0.6, delay: 0.15, ease: "easeOut" });
      go(glow, [0, 1], { duration: 1.2, ease: "easeOut" });
      setRevealed(true);
      await sleep(450);
      if (!alive()) return;
      finish();
    },
    [cruise, finish, glow, go, heroTurn, heroWheel, heroLean, heroX, heroY, label, ride, settle, speedLines],
  );

  useEffect(() => {
    if (!autoplay) {
      cruise.set(CRUISE_SPEED);
      return;
    }
    const id = ++runId.current;
    const alive = (): boolean => runId.current === id;
    window.scrollTo(0, 0);

    void (async () => {
      const vw = window.innerWidth;
      const width = curtainBikeWidth(vw, window.innerHeight);
      setCurtainWidth(width);
      curtainX.set(-width);
      await sleep(350);
      if (!alive()) return;
      // Past the edge far enough that the trailing speed lines leave too.
      await ride(curtainX, curtainWheel, vw + width * 0.2 + 24, {
        duration: 1.85,
        ease: EASE_PASS,
        facing: 1,
        radiusPx: (TIRE_RADIUS * width) / BIKE_VIEW_WIDTH,
      });
      if (!alive()) return;
      await sleep(120);
      if (!alive()) return;
      await arrive(id);
    })();

    return () => {
      runId.current++;
      stopAll();
    };
    // Runs once per mount; the motion values and callbacks are stable.
  }, []);

  useEffect(() => {
    if (phase === "done") return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") settle();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, settle]);

  const replay = useCallback(() => {
    if (phaseRef.current !== "done" || busyRef.current) return;
    const slot = slotRef.current;
    if (!slot) return;
    busyRef.current = true;
    setBusy(true);
    const id = ++runId.current;
    const rect = slot.getBoundingClientRect();
    const radiusPx = (TIRE_RADIUS * rect.width) / BIKE_VIEW_WIDTH;

    void (async () => {
      cruise.set(0);
      go(label, 0, { duration: 0.2 });
      go(speedLines, 2, { duration: 0.35 });
      go(heroLean, -4, { duration: 0.3 });
      await ride(heroX, heroWheel, window.innerWidth - rect.left + 32, {
        duration: 0.9,
        ease: EASE_LAUNCH,
        facing: 1,
        radiusPx,
      });
      if (runId.current !== id) return;
      await sleep(220);
      if (runId.current !== id) return;
      await arrive(id);
    })();
  }, [arrive, cruise, go, heroLean, heroWheel, heroX, label, ride, speedLines]);

  const setHover = useCallback(
    (hovering: boolean) => {
      if (phaseRef.current !== "done" || busyRef.current) return;
      go(cruise, hovering ? HOVER_SPEED : CRUISE_SPEED, { duration: 0.7, ease: "easeOut" });
      go(heroLean, hovering ? -2.5 : 0, { type: "spring", stiffness: 220, damping: 18 });
      go(speedLines, hovering ? 1.7 : 1, { duration: 0.45, ease: "easeOut" });
    },
    [cruise, go, heroLean, speedLines],
  );

  return {
    phase,
    revealed,
    busy,
    curtainWidth,
    curtain: { x: curtainX, wheel: curtainWheel, speed: curtainSpeed },
    hero: {
      x: heroX,
      y: heroY,
      turn: heroTurn,
      lean: heroLean,
      wheel: heroWheel,
      label,
      speed: speedLines,
      glow,
    },
    slotRef,
    skip: settle,
    replay,
    setHover,
  };
}
