import { useState } from "react";
import { cn } from "@/lib/utils";
import { Message } from "@/types/debate";
import { FallacyAnalysisResult } from "@/hooks/useDebateStream";
import { FallacyBadge } from "./fallacy-alert";
import {
  ThumbsUp,
  Flag,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DebateBubbleProps {
  message: Message;
  isLast?: boolean;
  fallacyAnalysis?: FallacyAnalysisResult;
  onGoodArgument?: (messageId: string) => void;
  onFlagIssue?: (messageId: string) => void;
  onShowFallacies?: () => void;
}

export function DebateBubble({
  message,
  isLast,
  fallacyAnalysis,
  onGoodArgument,
  onFlagIssue,
  onShowFallacies
}: DebateBubbleProps) {
  const isAi = message.role === "ai";
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [flagged, setFlagged] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoodArgument = () => {
    setLiked(true);
    onGoodArgument?.(message.id);
  };

  const handleFlagIssue = () => {
    setFlagged(true);
    onFlagIssue?.(message.id);
    setTimeout(() => setFlagged(false), 3000);
  };

  // Determine the highest severity fallacy for the badge
  const getHighestSeverity = (): "minor" | "moderate" | "major" | null => {
    if (!fallacyAnalysis?.fallacies?.length) return null;
    const severities = fallacyAnalysis.fallacies.map(f => f.severity);
    if (severities.includes("major")) return "major";
    if (severities.includes("moderate")) return "moderate";
    return "minor";
  };

  const highestSeverity = getHighestSeverity();

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div
      className={cn(
        "debate-bubble group relative",
        isAi ? "debate-bubble-ai" : "debate-bubble-human"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-medium",
            isAi ? "text-debate-ai" : "text-debate-human"
          )}>
            {isAi ? "AI Opponent" : "You"}
          </span>

          {/* Timestamp */}
          {message.timestamp && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimestamp(new Date(message.timestamp))}
            </span>
          )}
        </div>

        {/* Fallacy Badge for user messages */}
        {!isAi && fallacyAnalysis && highestSeverity && (
          <FallacyBadge
            count={fallacyAnalysis.fallacies.length}
            severity={highestSeverity}
            onClick={onShowFallacies}
          />
        )}

        {/* Argument strength badge for user messages */}
        {!isAi && fallacyAnalysis && !fallacyAnalysis.hasFallacies && fallacyAnalysis.argumentStrength >= 7 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border border-green-200 dark:border-green-800">
            <Sparkles className="h-3 w-3" />
            Strong
          </span>
        )}
      </div>

      {/* Message Content */}
      <div className="text-foreground whitespace-pre-wrap">{message.content}</div>

      {/* Action Buttons */}
      <div className={cn(
        "flex items-center justify-between mt-3 pt-2 border-t border-border/50",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        isLast && "opacity-100" // Always show for last message
      )}>
        <div className="flex items-center gap-2">
          {isAi ? (
            // AI message actions
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 px-2 text-xs",
                        liked && "text-green-600 bg-green-50 dark:bg-green-950"
                      )}
                      onClick={handleGoodArgument}
                    >
                      <ThumbsUp className={cn("h-3.5 w-3.5 mr-1", liked && "fill-current")} />
                      {liked ? "Acknowledged" : "Good Point"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Acknowledge this as a strong argument</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 px-2 text-xs",
                        flagged && "text-amber-600 bg-amber-50 dark:bg-amber-950"
                      )}
                      onClick={handleFlagIssue}
                    >
                      <Flag className={cn("h-3.5 w-3.5 mr-1", flagged && "fill-current")} />
                      {flagged ? "Flagged" : "Flag Issue"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Request clarification or challenge this point</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            // User message actions
            <>
              {fallacyAnalysis && fallacyAnalysis.fallacies.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-amber-600"
                        onClick={onShowFallacies}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                        View Feedback
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>See detailed feedback on your argument</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          )}
        </div>

        {/* Copy button for all messages */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{copied ? "Copied!" : "Copy message"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
