import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ScoreBadge({ score, size = "md", showLabel = true }: ScoreBadgeProps) {
  const rounded = Math.round(score);
  const color =
    rounded >= 75 ? "text-score-high bg-score-high/10 border-score-high/30" :
    rounded >= 50 ? "text-score-medium bg-score-medium/10 border-score-medium/30" :
    "text-score-low bg-score-low/10 border-score-low/30";

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5 font-semibold",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full border font-medium font-heading", color, sizeClasses[size])}>
      {rounded}%{showLabel && <span className="ml-1 opacity-70 text-[0.85em]">match</span>}
    </span>
  );
}
