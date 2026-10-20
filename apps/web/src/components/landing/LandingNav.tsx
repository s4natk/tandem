import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TandemLogo } from "@/components/brand/TandemLogo";
import { cn } from "@/lib/cn";
import { GITHUB_URL, GitHubIcon } from "./Sections";

const LINKS = [
  { href: "#preview", label: "Live preview" },
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
];

export function LandingNav({ authed }: { authed: boolean }): JSX.Element {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "border-b border-white/[0.06] bg-ink-900/70 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <a href="#top" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
          <TandemLogo />
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-1.5 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Tandem on GitHub"
            className="hidden rounded-full p-2 text-white/55 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex"
          >
            <GitHubIcon />
          </a>
          {authed ? (
            <Link to="/app" className="btn-glow px-4 py-2">
              Open app
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full px-3.5 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/[0.06] hover:text-white"
              >
                Log in
              </Link>
              <Link to="/signup" className="btn-glow px-4 py-2">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
