import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/cn";

const BLOBS = [
  { className: "-top-40 left-[calc(50%-280px)] h-[560px] w-[560px] bg-brand-500/30", duration: "22s" },
  { className: "-left-32 top-1/3 h-[420px] w-[420px] bg-fuchsia-500/[0.14]", duration: "26s" },
  { className: "-right-24 top-1/4 h-[380px] w-[380px] bg-cyan-400/[0.12]", duration: "19s" },
  { className: "bottom-[-10rem] right-1/4 h-[460px] w-[460px] bg-indigo-500/20", duration: "24s" },
];

const PARTICLES = [
  { top: "14%", left: "9%", size: 6, color: "bg-brand-300/40", duration: "9s", reverse: false },
  { top: "24%", left: "21%", size: 4, color: "bg-fuchsia-300/40", duration: "11s", reverse: true },
  { top: "18%", left: "36%", size: 5, color: "bg-cyan-300/40", duration: "13s", reverse: false },
  { top: "36%", left: "7%", size: 4, color: "bg-brand-200/30", duration: "10s", reverse: true },
  { top: "48%", left: "15%", size: 7, color: "bg-fuchsia-300/25", duration: "14s", reverse: false },
  { top: "12%", left: "84%", size: 5, color: "bg-cyan-300/40", duration: "12s", reverse: true },
  { top: "30%", left: "91%", size: 4, color: "bg-brand-300/40", duration: "9s", reverse: false },
  { top: "22%", left: "74%", size: 6, color: "bg-fuchsia-300/30", duration: "13s", reverse: true },
  { top: "42%", left: "86%", size: 4, color: "bg-cyan-200/30", duration: "11s", reverse: false },
  { top: "68%", left: "12%", size: 5, color: "bg-brand-300/35", duration: "10s", reverse: false },
  { top: "78%", left: "26%", size: 4, color: "bg-cyan-300/30", duration: "14s", reverse: true },
  { top: "64%", left: "5%", size: 6, color: "bg-fuchsia-200/25", duration: "12s", reverse: false },
  { top: "74%", left: "89%", size: 6, color: "bg-brand-200/30", duration: "11s", reverse: true },
  { top: "60%", left: "79%", size: 4, color: "bg-cyan-300/35", duration: "9s", reverse: false },
  { top: "86%", left: "68%", size: 5, color: "bg-fuchsia-300/30", duration: "13s", reverse: true },
];

const RINGS = [
  { top: "17%", left: "17%", size: 64, color: "border-brand-300/15", duration: "18s" },
  { top: "60%", left: "8%", size: 48, color: "border-cyan-300/15", duration: "22s" },
  { top: "28%", left: "88%", size: 80, color: "border-fuchsia-300/10", duration: "16s" },
  { top: "72%", left: "82%", size: 56, color: "border-brand-300/10", duration: "24s" },
  { top: "44%", left: "22%", size: 40, color: "border-brand-200/10", duration: "20s" },
];

interface Props {
  className?: string;
  /** Shift blobs and particles a little with the pointer. */
  parallax?: boolean;
}

export function AuroraBackground({ className, parallax = true }: Props): JSX.Element {
  const px = useSpring(0, { stiffness: 40, damping: 18 });
  const py = useSpring(0, { stiffness: 40, damping: 18 });
  const particlesX = useTransform(px, (v) => v * -0.6);
  const particlesY = useTransform(py, (v) => v * -0.6);

  useEffect(() => {
    if (!parallax) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent): void => {
      px.set((e.clientX / window.innerWidth - 0.5) * 36);
      py.set((e.clientY / window.innerHeight - 0.5) * 28);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [parallax, px, py]);

  return (
    <div
      aria-hidden="true"
      className={cn("noise pointer-events-none fixed inset-0 overflow-hidden bg-ink-900", className)}
    >
      <div className="absolute inset-0 motion-safe:animate-aurora bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(114,98,251,0.34),transparent_60%),radial-gradient(ellipse_45%_40%_at_100%_100%,rgba(217,70,239,0.12),transparent_60%),radial-gradient(ellipse_45%_45%_at_0%_85%,rgba(34,211,238,0.09),transparent_60%)]" />
      <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_30%,black,transparent)]" />

      <motion.div className="absolute inset-0" style={{ x: px, y: py }}>
        {BLOBS.map((blob) => (
          <div
            key={blob.className}
            className={cn("absolute rounded-full blur-3xl will-change-transform motion-safe:animate-blob", blob.className)}
            style={{ animationDuration: blob.duration }}
          />
        ))}
      </motion.div>

      <motion.div className="absolute inset-0" style={{ x: particlesX, y: particlesY }}>
        {PARTICLES.map((p) => (
          <span
            key={`${p.top}-${p.left}`}
            className={cn(
              "absolute rounded-full",
              p.color,
              p.reverse ? "motion-safe:animate-wander-rev" : "motion-safe:animate-wander",
            )}
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
            }}
          />
        ))}
        {RINGS.map((ring) => (
          <span
            key={`${ring.top}-${ring.left}`}
            className={cn("absolute border motion-safe:animate-ring-morph", ring.color)}
            style={{
              top: ring.top,
              left: ring.left,
              width: ring.size,
              height: ring.size,
              borderRadius: "50%",
              animationDuration: ring.duration,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
