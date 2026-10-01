import { cn } from "@/lib/cn";

interface Props {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  title?: string;
}

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
} as const;

export function Avatar({
  name,
  color = "#6366f1",
  size = "md",
  className,
  title,
}: Props): JSX.Element {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "?";

  return (
    <span
      title={title ?? name}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  );
}
