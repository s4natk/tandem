/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Violet-indigo taken from the Tandem bike frame.
        brand: {
          50: "#f1efff",
          100: "#e5e1ff",
          200: "#cdc6ff",
          300: "#ada1ff",
          400: "#8d7cff",
          500: "#7262fb",
          600: "#5f49f0",
          700: "#4f39d4",
          800: "#412fab",
          900: "#382a87",
          950: "#21184f",
        },
        // Navy used behind the logo and on the marketing pages.
        ink: {
          950: "#05040f",
          900: "#0a0920",
          850: "#0e0c28",
          800: "#131033",
          700: "#1b1745",
          600: "#26205c",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: ["Outfit", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        elevated:
          "0 10px 30px -10px rgba(15, 23, 42, 0.15), 0 4px 12px -4px rgba(15, 23, 42, 0.08)",
        glow: "0 10px 40px -10px rgba(114, 98, 251, 0.75)",
        "glow-lg": "0 20px 70px -15px rgba(114, 98, 251, 0.9)",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        aurora: "aurora 24s ease-in-out infinite",
        blob: "blob 20s ease-in-out infinite",
        wander: "wander 12s ease-in-out infinite",
        "wander-rev": "wanderRev 14s ease-in-out infinite",
        "ring-morph": "ringMorph 18s linear infinite",
        marquee: "marquee 38s linear infinite",
        "marquee-rev": "marquee 44s linear infinite reverse",
        pedal: "pedal 1.4s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
        "pulse-ring": "pulseRing 2.6s cubic-bezier(0.2, 0.6, 0.4, 1) infinite",
        "float-slow": "floatSlow 6s ease-in-out infinite",
        chain: "chain 1.4s linear infinite",
        typing: "typing 1.1s ease-in-out infinite",
        bob: "bob 2s ease-in-out infinite",
        sheen: "sheen 3.4s ease-in-out infinite",
        "flow-x": "flowX 2.2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        aurora: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(-4%, 3%, 0) scale(1.08)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(40px, -60px) scale(1.12)" },
          "66%": { transform: "translate(-30px, 30px) scale(0.92)" },
        },
        wander: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "25%": { transform: "translate(14px, -22px)" },
          "50%": { transform: "translate(-10px, -36px)" },
          "75%": { transform: "translate(-18px, -12px)" },
        },
        wanderRev: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "25%": { transform: "translate(-16px, 18px)" },
          "50%": { transform: "translate(12px, 30px)" },
          "75%": { transform: "translate(20px, 8px)" },
        },
        ringMorph: {
          "0%": { borderRadius: "50%", transform: "rotate(0deg) scale(1)" },
          "50%": {
            borderRadius: "42% 58% 60% 40% / 55% 40% 60% 45%",
            transform: "rotate(180deg) scale(1.12)",
          },
          "100%": { borderRadius: "50%", transform: "rotate(360deg) scale(1)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        pedal: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-0.07em)" },
        },
        shimmer: {
          from: { backgroundPosition: "0% 50%" },
          to: { backgroundPosition: "200% 50%" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(1.9)", opacity: "0" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        chain: {
          to: { strokeDashoffset: "-24" },
        },
        typing: {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.35" },
          "30%": { transform: "translateY(-3px)", opacity: "1" },
        },
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(6px)" },
        },
        sheen: {
          "0%": { transform: "translateX(-140%) skewX(-20deg)" },
          "55%, 100%": { transform: "translateX(260%) skewX(-20deg)" },
        },
        flowX: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(400%)" },
        },
      },
    },
  },
  plugins: [],
};
