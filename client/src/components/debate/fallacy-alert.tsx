import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FallacyAnalysisResult, DetectedFallacy } from "@/hooks/useDebateStream";

interface FallacyAlertProps {
  analysis: FallacyAnalysisResult;
  onDismiss?: () => void;
  className?: string;
}

const severityConfig = {
  minor: {
    icon: Info,
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    borderColor: "border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-500",
    label: "Minor Issue",
  },
  moderate: {
    icon: AlertCircle,
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    borderColor: "border-amber-200 dark:border-amber-800",
    iconColor: "text-amber-500",
    label: "Moderate Issue",
  },
  major: {
    icon: AlertTriangle,
    bgColor: "bg-red-50 dark:bg-red-950/50",
    borderColor: "border-red-200 dark:border-red-800",
    iconColor: "text-red-500",
    label: "Major Issue",
  },
};

function FallacyItem({ fallacy }: { fallacy: DetectedFallacy }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = severityConfig[fallacy.severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all duration-200",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{fallacy.name}</span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                fallacy.severity === "minor" && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                fallacy.severity === "moderate" && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                fallacy.severity === "major" && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              )}>
                {config.label}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-1">{fallacy.description}</p>

          {isExpanded && (
            <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
              {fallacy.quote && (
                <div className="bg-background/50 rounded p-2 text-sm">
                  <span className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Your argument:</span>
                  <p className="mt-1 italic">"{fallacy.quote}"</p>
                </div>
              )}
              {fallacy.suggestion && (
                <div className="flex items-start gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p>{fallacy.suggestion}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FallacyAlert({ analysis, onDismiss, className }: FallacyAlertProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!analysis.hasFallacies && analysis.fallacies.length === 0) {
    // Show positive feedback for good arguments
    if (analysis.argumentStrength >= 7) {
      return (
        <div
          className={cn(
            "rounded-lg border p-4 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800 animate-in slide-in-from-top-2 duration-300",
            className
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <span className="text-lg">💪</span>
              </div>
              <div>
                <p className="font-semibold text-green-700 dark:text-green-300">Strong Argument!</p>
                <p className="text-sm text-green-600 dark:text-green-400">{analysis.overallFeedback}</p>
              </div>
            </div>
            {onDismiss && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onDismiss}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Strength:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{analysis.argumentStrength}/10</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Logic:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{analysis.logicalSoundness}/10</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 animate-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="font-semibold">
            {analysis.fallacies.length} Logical Fallac{analysis.fallacies.length === 1 ? "y" : "ies"} Detected
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          {onDismiss && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-3 space-y-3">
          {/* Scores */}
          <div className="flex gap-4 text-sm pb-2 border-b border-amber-200/50 dark:border-amber-800/50">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Argument Strength:</span>
              <div className="flex items-center gap-1">
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      analysis.argumentStrength >= 7 ? "bg-green-500" :
                      analysis.argumentStrength >= 4 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${analysis.argumentStrength * 10}%` }}
                  />
                </div>
                <span className="font-semibold">{analysis.argumentStrength}/10</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Logic:</span>
              <div className="flex items-center gap-1">
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      analysis.logicalSoundness >= 7 ? "bg-green-500" :
                      analysis.logicalSoundness >= 4 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${analysis.logicalSoundness * 10}%` }}
                  />
                </div>
                <span className="font-semibold">{analysis.logicalSoundness}/10</span>
              </div>
            </div>
          </div>

          {/* Fallacies List */}
          <div className="space-y-2">
            {analysis.fallacies.map((fallacy, index) => (
              <FallacyItem key={index} fallacy={fallacy} />
            ))}
          </div>

          {/* Overall Feedback */}
          {analysis.overallFeedback && (
            <div className="bg-background/50 rounded-lg p-3 flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">{analysis.overallFeedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for inline display next to messages
interface FallacyBadgeProps {
  count: number;
  severity: "minor" | "moderate" | "major";
  onClick?: () => void;
}

export function FallacyBadge({ count, severity, onClick }: FallacyBadgeProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all hover:scale-105",
        config.bgColor,
        config.borderColor,
        "border cursor-pointer"
      )}
    >
      <Icon className={cn("h-3 w-3", config.iconColor)} />
      <span>{count}</span>
    </button>
  );
}
