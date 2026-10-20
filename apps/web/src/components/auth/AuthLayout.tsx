import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/brand/AuroraBackground";
import { CruisingBike } from "@/components/brand/TandemBike";
import { TandemLogo } from "@/components/brand/TandemLogo";

const POINTS = [
  "Boards update for everyone the moment a card moves",
  "See who is in the room and what they are looking at",
  "Version checks stop teammates overwriting each other",
];

export function AuthLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="dark relative min-h-full overflow-x-clip bg-ink-900 text-white">
      <AuroraBackground />
      <div className="relative grid min-h-full lg:grid-cols-[1.05fr_1fr]">
        <aside className="relative hidden flex-col justify-between border-r border-white/[0.06] p-10 lg:flex xl:p-14">
          <Link to="/" className="w-fit rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
            <TandemLogo />
          </Link>

          <div className="max-w-lg">
            <div className="relative w-[min(440px,100%)]">
              <div className="absolute inset-x-[8%] bottom-0 top-[25%] rounded-[50%] bg-brand-500/25 blur-3xl" />
              <CruisingBike degreesPerSecond={190} className="relative" />
            </div>
            <h2 className="mt-10 font-display text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              Work in <span className="gradient-text motion-safe:animate-shimmer">tandem</span>.
            </h2>
            <ul className="mt-6 space-y-3">
              {POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-[15px] text-white/60">
                  <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-400/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-300" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/35">Real-time collaborative boards · TypeScript, WebSockets, Postgres, Redis</p>
        </aside>

        <main className="relative flex items-center justify-center px-4 py-12 sm:px-8">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              to="/"
              className="mb-8 inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-300 lg:hidden"
            >
              <TandemLogo />
            </Link>
            <div className="glass rounded-3xl px-6 py-8 shadow-[0_30px_80px_-30px_rgba(114,98,251,0.45)] sm:px-8">
              {children}
            </div>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/45 transition hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
              Back to home
            </Link>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
