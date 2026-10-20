import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CruisingBike, TandemMark } from "@/components/brand/TandemBike";
import { cn } from "@/lib/cn";

export const GITHUB_URL = "https://github.com/s4natk/tandem";

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}): JSX.Element {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
}): JSX.Element {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-200">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
        {eyebrow}
      </span>
      <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-white/55 sm:text-lg">{subtitle}</p>
    </Reveal>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Create",
    body: "Start a workspace and a board. Three columns are ready before you finish naming it.",
    tile: "bg-brand-400/15 text-brand-200",
  },
  {
    n: "02",
    title: "Share",
    body: "Send the eight-character room code. Teammates join with one paste.",
    tile: "bg-pink-400/15 text-pink-200",
  },
  {
    n: "03",
    title: "Ride together",
    body: "Drag, edit, and assign cards. Everyone in the room sees it land live.",
    tile: "bg-cyan-400/15 text-cyan-200",
  },
  {
    n: "04",
    title: "Stay in sync",
    body: "Version checks reject stale writes, so nobody overwrites a teammate.",
    tile: "bg-amber-400/15 text-amber-200",
  },
];

export function HowItWorks(): JSX.Element {
  return (
    <section id="how" className="relative scroll-mt-24 px-6 py-24 sm:py-32">
      <SectionHeading
        eyebrow="How it works"
        title="From blank board to shared plan"
        subtitle="Four steps, about a minute, no refresh button anywhere."
      />
      <div className="relative mx-auto max-w-5xl">
        <svg
          aria-hidden="true"
          className="absolute left-[12.5%] right-[12.5%] top-8 hidden h-2 w-[75%] lg:block"
          preserveAspectRatio="none"
          viewBox="0 0 100 2"
        >
          <line
            x1="0"
            y1="1"
            x2="100"
            y2="1"
            stroke="rgba(173,161,255,0.35)"
            strokeWidth="2"
            strokeDasharray="6 6"
            vectorEffect="non-scaling-stroke"
            className="motion-safe:animate-chain"
          />
        </svg>
        <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.n}
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <span
                className={cn(
                  "relative flex h-16 w-16 items-center justify-center rounded-2xl font-display text-xl font-bold ring-1 ring-white/10 backdrop-blur",
                  step.tile,
                )}
              >
                {step.n}
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold text-white">{step.title}</h3>
              <p className="mt-2 max-w-[15rem] text-sm leading-relaxed text-white/55">{step.body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function SpotlightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
      }}
      className={cn(
        "spotlight glass group h-full rounded-3xl p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

function FeatureCopy({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <div className="relative mt-6">
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/55">{body}</p>
    </div>
  );
}

function PresenceArt(): JSX.Element {
  const people = [
    { initial: "M", color: "#f472b6" },
    { initial: "L", color: "#22d3ee" },
    { initial: "A", color: "#fbbf24" },
  ];
  return (
    <div className="flex h-28 flex-col items-center justify-center gap-3">
      <div className="flex -space-x-3">
        {people.map((p, i) => (
          <span key={p.initial} className="relative">
            {i === 0 && (
              <span
                className="absolute inset-0 rounded-full motion-safe:animate-pulse-ring"
                style={{ backgroundColor: p.color }}
              />
            )}
            <span
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-ink-900 ring-4 ring-ink-850"
              style={{ backgroundColor: p.color }}
            >
              {p.initial}
            </span>
          </span>
        ))}
      </div>
      <span className="rounded-full border border-white/10 bg-ink-800/90 px-3 py-1 text-[11px] text-white/70">
        <span className="font-semibold text-pink-300">Maya</span> is viewing “Ship v1”
      </span>
    </div>
  );
}

function VersionArt(): JSX.Element {
  return (
    <div className="flex h-28 flex-col justify-center gap-2.5 font-mono text-[11px]">
      <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-200">
        <span className="shrink-0 whitespace-nowrap rounded bg-emerald-400/20 px-1.5">v3 → v4</span>
        Maya’s move saved
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-rose-200">
        <span className="shrink-0 whitespace-nowrap rounded bg-rose-400/20 px-1.5">v3 ✕</span>
        Leo’s stale write rejected
      </div>
    </div>
  );
}

function FeedArt(): JSX.Element {
  const rows = [
    { color: "bg-pink-400", text: "Maya moved “Auth” to Done", fresh: true },
    { color: "bg-cyan-300", text: "Leo renamed “Launch post”", fresh: false },
    { color: "bg-amber-300", text: "Ava joined the room", fresh: false },
  ];
  return (
    <ul className="flex h-28 flex-col justify-center gap-2 text-[12px] text-white/65">
      {rows.map((row) => (
        <li
          key={row.text}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1",
            row.fresh && "bg-white/[0.05] motion-safe:animate-pulse",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", row.color)} />
          {row.text}
        </li>
      ))}
    </ul>
  );
}

function RolesArt(): JSX.Element {
  return (
    <div className="flex h-28 flex-wrap content-center items-center justify-center gap-2 text-[12px] font-semibold">
      <span className="rounded-full bg-brand-400/20 px-3 py-1.5 text-brand-100">Owner</span>
      <span className="rounded-full bg-cyan-400/15 px-3 py-1.5 text-cyan-100">Editor</span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-white/60">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 018 0v4" />
        </svg>
        Viewer
      </span>
    </div>
  );
}

function ScaleArt(): JSX.Element {
  return (
    <div className="relative flex h-28 items-center justify-between px-2 text-[11px] font-semibold">
      <span className="z-10 rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-white/75">API A</span>
      <span className="z-10 rounded-xl border border-rose-300/25 bg-rose-500/15 px-3 py-2 text-rose-100">Redis</span>
      <span className="z-10 rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-white/75">API B</span>
      <div className="absolute inset-x-10 top-1/2 h-px overflow-hidden bg-white/10">
        <span className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-brand-300 to-transparent motion-safe:animate-flow-x" />
      </div>
    </div>
  );
}

function CodeArt(): JSX.Element {
  return (
    <div className="flex h-28 flex-col items-center justify-center gap-3">
      <div className="flex gap-1.5 font-mono text-lg font-semibold text-white">
        {"k7m2x4qp".split("").map((ch, i) => (
          <span
            key={i}
            className="inline-flex h-10 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]"
          >
            {ch}
          </span>
        ))}
      </div>
      <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200">
        Copied, send it to a teammate
      </span>
    </div>
  );
}

const FEATURES = [
  {
    title: "Live presence",
    body: "See who is in the room and which card each person has open, updated over WebSockets.",
    art: <PresenceArt />,
    span: "lg:col-span-2",
  },
  {
    title: "Conflict-safe edits",
    body: "Every card carries a version. A stale write is rejected and the client re-syncs instead of clobbering.",
    art: <VersionArt />,
    span: "",
  },
  {
    title: "Activity feed",
    body: "Every move and edit is written to Postgres and streamed to the room as it happens.",
    art: <FeedArt />,
    span: "",
  },
  {
    title: "Roles that hold",
    body: "Owners manage members, editors move work, viewers watch. The server enforces it, not just the UI.",
    art: <RolesArt />,
    span: "",
  },
  {
    title: "Scales out",
    body: "Redis pub/sub fans room events across API instances, so two servers behave like one.",
    art: <ScaleArt />,
    span: "",
  },
  {
    title: "Join with a code",
    body: "No invite emails to wait on. Share a short room code and you are riding together.",
    art: <CodeArt />,
    span: "lg:col-span-2",
  },
];

export function FeatureGrid(): JSX.Element {
  return (
    <section id="features" className="relative scroll-mt-24 px-6 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Features"
        title={
          <>
            Built like a <span className="gradient-text motion-safe:animate-shimmer">real product</span>
          </>
        }
        subtitle="Everything on this page runs in the codebase, from presence to version checks."
      />
      <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature, i) => (
          <Reveal key={feature.title} delay={(i % 3) * 0.06} className={feature.span}>
            <SpotlightCard>
              {feature.art}
              <FeatureCopy title={feature.title} body={feature.body} />
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STACK_TOP = ["TypeScript", "React", "Vite", "Tailwind CSS", "Framer Motion", "Zustand", "React Query", "dnd-kit"];
const STACK_BOTTOM = ["Node.js", "Fastify", "Socket.IO", "PostgreSQL", "Prisma", "Redis", "Docker", "Zod"];

function MarqueeRow({ items, reverse }: { items: string[]; reverse?: boolean }): JSX.Element {
  const doubled = [...items, ...items];
  return (
    <div className="group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
      <div
        className={cn(
          "flex shrink-0 gap-3 pr-3 group-hover:[animation-play-state:paused]",
          reverse ? "motion-safe:animate-marquee-rev" : "motion-safe:animate-marquee",
        )}
      >
        {doubled.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/75"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-300 to-fuchsia-300" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TechMarquee(): JSX.Element {
  return (
    <section className="relative px-0 py-16">
      <Reveal className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
        Under the hood
      </Reveal>
      <div className="space-y-3">
        <MarqueeRow items={STACK_TOP} />
        <MarqueeRow items={STACK_BOTTOM} reverse />
      </div>
    </section>
  );
}

export function FinalCta({ authed }: { authed: boolean }): JSX.Element {
  return (
    <section className="relative px-6 py-24 sm:py-32">
      <Reveal className="relative mx-auto max-w-4xl">
        <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-r from-brand-400/50 via-fuchsia-400/30 to-cyan-300/40 blur-[1px]" />
        <div className="relative overflow-hidden rounded-[2rem] bg-ink-850/95 px-6 py-14 text-center sm:px-14">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(114,98,251,0.35),transparent_70%)]" />
          <div className="relative mx-auto w-[min(300px,70vw)]">
            <CruisingBike degreesPerSecond={220} />
          </div>
          <h2 className="relative mt-8 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Ready to ride together?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-base text-white/55 sm:text-lg">
            Make a board, share the code, and watch your team’s plan move in real time.
          </p>
          <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {authed ? (
              <Link to="/app" className="btn-glow group">
                Open your boards
                <ArrowRight />
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn-glow group">
                  Create your free board
                  <ArrowRight />
                </Link>
                <Link to="/login?demo=1" className="btn-outline-dark">
                  Try the demo account
                </Link>
              </>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function SiteFooter(): JSX.Element {
  return (
    <footer className="relative border-t border-white/[0.06] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-white/45 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <TandemMark className="h-5" />
          <span>© {new Date().getFullYear()} Tandem · Real-time boards for teams</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#how" className="transition hover:text-white">
            How it works
          </a>
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="transition hover:text-white">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

export function ArrowRight(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-0.5">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function GitHubIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 00-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 015.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.27 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0012 .5z" />
    </svg>
  );
}
