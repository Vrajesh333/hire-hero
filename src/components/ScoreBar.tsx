interface ScoreBarProps {
  label: string;
  score: number;
}

export function ScoreBar({ label, score }: ScoreBarProps) {
  const rounded = Math.round(score);
  const barColor =
    rounded >= 75 ? "bg-score-high" :
    rounded >= 50 ? "bg-score-medium" :
    "bg-score-low";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{rounded}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${rounded}%` }}
        />
      </div>
    </div>
  );
}
