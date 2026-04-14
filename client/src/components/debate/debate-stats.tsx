import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DebateStats as DebateStatsType } from "@/types/debate";
import { FallacyAnalysisResult, DetectedFallacy } from "@/hooks/useDebateStream";
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  Brain,
  ChevronRight,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DebateStatsProps {
  stats: DebateStatsType;
  recentFallacies?: DetectedFallacy[];
  latestAnalysis?: FallacyAnalysisResult | null;
  onViewAllFallacies?: () => void;
}

function ProgressBar({
  value,
  max = 10,
  color = "primary"
}: {
  value: number;
  max?: number;
  color?: "primary" | "green" | "amber" | "red";
}) {
  const percentage = Math.min(100, (value / max) * 100);
  const colorClasses = {
    primary: "bg-primary",
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500"
  };

  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          colorClasses[color]
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function getStrengthColor(value: number): "green" | "amber" | "red" {
  if (value >= 7) return "green";
  if (value >= 4) return "amber";
  return "red";
}

function getStrengthLabel(value: number): string {
  if (value >= 8) return "Excellent";
  if (value >= 6) return "Good";
  if (value >= 4) return "Fair";
  return "Needs Work";
}

export function DebateStats({
  stats,
  recentFallacies = [],
  latestAnalysis,
  onViewAllFallacies
}: DebateStatsProps) {
  const fallacyCount = stats.fallaciesDetected;
  const argumentStrength = latestAnalysis?.argumentStrength ?? stats.argumentStrength;
  const logicalSoundness = latestAnalysis?.logicalSoundness ?? (stats.logicalScore || 5);

  return (
    <div className="space-y-4">
      {/* Argument Strength */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Argument Strength
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    Based on clarity, evidence, and persuasiveness of your arguments
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-3xl font-bold">{argumentStrength}</div>
            <span className={cn(
              "text-sm font-medium",
              argumentStrength >= 7 ? "text-green-600" :
              argumentStrength >= 4 ? "text-amber-600" : "text-red-600"
            )}>
              {getStrengthLabel(argumentStrength)}
            </span>
          </div>
          <ProgressBar
            value={argumentStrength}
            color={getStrengthColor(argumentStrength)}
          />
        </CardContent>
      </Card>

      {/* Logical Soundness */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            Logical Soundness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-3xl font-bold">{logicalSoundness}</div>
            <span className={cn(
              "text-sm font-medium",
              logicalSoundness >= 7 ? "text-green-600" :
              logicalSoundness >= 4 ? "text-amber-600" : "text-red-600"
            )}>
              /10
            </span>
          </div>
          <ProgressBar
            value={logicalSoundness}
            color={getStrengthColor(logicalSoundness)}
          />
        </CardContent>
      </Card>

      {/* Fallacies Detected */}
      <Card className={cn(
        fallacyCount > 0 && "border-amber-200 dark:border-amber-800"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className={cn(
              "h-4 w-4",
              fallacyCount > 0 ? "text-amber-500" : "text-muted-foreground"
            )} />
            Logical Fallacies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div className={cn(
              "text-3xl font-bold",
              fallacyCount > 0 ? "text-amber-600" : "text-green-600"
            )}>
              {fallacyCount}
            </div>
            {fallacyCount === 0 ? (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Clean slate!
              </span>
            ) : (
              <span className="text-xs text-amber-600">
                detected in your arguments
              </span>
            )}
          </div>

          {/* Recent Fallacies */}
          {recentFallacies.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-muted-foreground font-medium">Recent:</div>
              {recentFallacies.slice(0, 3).map((fallacy, index) => (
                <div
                  key={index}
                  className={cn(
                    "text-xs p-2 rounded flex items-start gap-2",
                    fallacy.severity === "major" ? "bg-red-50 dark:bg-red-950/50" :
                    fallacy.severity === "moderate" ? "bg-amber-50 dark:bg-amber-950/50" :
                    "bg-blue-50 dark:bg-blue-950/50"
                  )}
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                    fallacy.severity === "major" ? "bg-red-500" :
                    fallacy.severity === "moderate" ? "bg-amber-500" :
                    "bg-blue-500"
                  )} />
                  <span className="font-medium">{fallacy.name}</span>
                </div>
              ))}
              {recentFallacies.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={onViewAllFallacies}
                >
                  View all {recentFallacies.length} fallacies
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debate Duration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Debate Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.duration} min</div>
          <p className="text-xs text-muted-foreground mt-1">Time spent debating</p>
        </CardContent>
      </Card>

      {/* Latest Feedback */}
      {latestAnalysis?.overallFeedback && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Latest Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{latestAnalysis.overallFeedback}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
