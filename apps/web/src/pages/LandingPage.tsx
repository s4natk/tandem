import { Link } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion";
import { AuroraBackground } from "@/components/brand/AuroraBackground";
import { HeroBike } from "@/components/landing/HeroBike";
import { IntroCurtain } from "@/components/landing/IntroCurtain";
import { LandingNav } from "@/components/landing/LandingNav";
import { LiveBoardPreview } from "@/components/landing/LiveBoardPreview";
import {
  ArrowRight,
  FeatureGrid,
  HowItWorks,
  SectionHeading,
  SiteFooter,
} from "@/components/landing/Sections";
import { useRideIntro } from "@/components/landing/useRideIntro";
import { useAuthStore } from "@/store/auth";

const heroCopy: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

export function LandingPage(): JSX.Element {
  return (
    <MotionConfig reducedMotion="never">
      <LandingContent />
    </MotionConfig>
  );
}

function LandingContent(): JSX.Element {
  const intro = useRideIntro();
  const authed = useAuthStore((s) => s.status === "authenticated");

  return (
    <div className="dark relative min-h-full overflow-x-clip bg-ink-900 text-white">
      <AuroraBackground />
      <LandingNav authed={authed} />

      <main className="relative">
        <section
          id="top"
          className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 pb-20 pt-28 text-center"
        >
          <HeroBike intro={intro} />

          <motion.div
            className="mt-10 flex flex-col items-center"
            variants={heroCopy}
            initial="hidden"
            animate={intro.revealed ? "show" : "hidden"}
          >
            <motion.h1
              variants={heroItem}
              className="font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
            >
              Work in <PedalWord word="tandem" />
            </motion.h1>
            <motion.p
              variants={heroItem}
              className="mt-5 whitespace-nowrap text-[13px] text-white/60 sm:text-base lg:text-lg"
            >
              Shared Kanban boards that move the moment a teammate drags a card.
            </motion.p>

            <motion.div
              variants={heroItem}
              className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
            >
              {authed ? (
                <Link to="/app" className="btn-glow group px-7 py-3.5 text-base">
                  Open your boards
                  <ArrowRight />
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="btn-glow group px-7 py-3.5 text-base">
                    Sign up free
                    <ArrowRight />
                  </Link>
                  <Link to="/login" className="btn-outline-dark px-7 py-3.5 text-base">
                    Log in
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>
        </section>

        <section id="preview" className="relative scroll-mt-24 px-6 py-24 sm:py-32">
          <SectionHeading
            eyebrow="See it live"
            title="Two cursors. One board. Zero overwrites."
            subtitle="This preview plays the same flow the app runs: live moves, a teammate typing, and a stale write being rejected instead of clobbering someone’s work."
          />
          <LiveBoardPreview />
        </section>

        <HowItWorks />
        <FeatureGrid />
      </main>

      <SiteFooter />

      <AnimatePresence>
        {intro.phase === "curtain" && (
          <IntroCurtain
            key="curtain"
            x={intro.curtain.x}
            wheel={intro.curtain.wheel}
            speed={intro.curtain.speed}
            width={intro.curtainWidth}
            onSkip={intro.skip}
          />
        )}
      </AnimatePresence>

      {intro.phase === "arriving" && (
        <button
          type="button"
          onClick={intro.skip}
          className="fixed bottom-6 left-6 z-[70] rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur transition hover:border-white/30 hover:text-white"
        >
          Skip intro
          <span className="ml-2 text-white/35">Esc</span>
        </button>
      )}
    </div>
  );
}

/** Letters bob in alternation, like two riders pedalling out of phase. */
function PedalWord({ word }: { word: string }): JSX.Element {
  const letters = word.split("");
  return (
    <span className="inline-flex">
      <span className="sr-only">{word}</span>
      {letters.map((letter, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="gradient-text inline-block animate-pedal"
          style={{
            animationDelay: i % 2 === 0 ? "0s" : "-0.7s",
            backgroundSize: `${letters.length * 100}% 100%`,
            backgroundPosition: `${(i / (letters.length - 1)) * 100}% 50%`,
          }}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}
