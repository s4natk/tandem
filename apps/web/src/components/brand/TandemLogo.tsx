import { cn } from "@/lib/cn";
import { TandemMark } from "./TandemBike";

export function TandemLogo({
  className,
  textClassName,
}: {
  className?: string;
  textClassName?: string;
}): JSX.Element {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <TandemMark className="h-7" />
      <span
        className={cn("font-display text-lg font-bold tracking-tight text-white", textClassName)}
      >
        Tandem
      </span>
    </span>
  );
}
