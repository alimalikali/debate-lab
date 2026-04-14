import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DebateBubble } from "@/components/debate/debate-bubble";
import { DebateInput } from "@/components/debate/debate-input";
import { DebateStats } from "@/components/debate/debate-stats";
import { FallacyAlert } from "@/components/debate/fallacy-alert";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { debatesApi } from "@/lib/api";
import { useDebateStream, FallacyAnalysisResult, DetectedFallacy } from "@/hooks/useDebateStream";
import { Message, DebateStats as DebateStatsType } from "@/types/debate";
import { Loader2, Flag, Trophy, AlertTriangle, BookOpen, X } from "lucide-react";

interface Debate {
  id: string;
  topic: { title: string; description: string } | null;
  customTopic: { title: string; description: string } | null;
  userPosition: string;
  difficulty: string;
  debateStyle: string;
  status: string;
  aiProvider: string;
  aiModel: string;
}

interface DebateSummary {
  overallPerformance: string;
  argumentStrength: number;
  logicalScore: number;
  persuasiveScore: number;
  userStrengths: string[];
  areasForImprovement: string[];
  fallaciesDetected: { type: string; description: string }[];
  recommendation: string;
}

// Detailed fallacy from database (real-time detected during debate)
interface DetailedFallacy {
  id: string;
  messageId: string;
  fallacyType: string;
  fallacyName: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  quote: string;
  suggestion: string;
  messageContent: string;
  argumentStrength: number;
  logicalSoundness: number;
  createdAt: string;
}

const DebateRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [debate, setDebate] = useState<Debate | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<DebateStatsType>({
    argumentStrength: 5,
    fallaciesDetected: 0,
    duration: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summary, setSummary] = useState<DebateSummary | null>(null);
  const [detailedFallacies, setDetailedFallacies] = useState<DetailedFallacy[]>([]);

  // Fallacy tracking state
  const [fallacyAnalyses, setFallacyAnalyses] = useState<Map<string, FallacyAnalysisResult>>(new Map());
  const [latestFallacyAnalysis, setLatestFallacyAnalysis] = useState<FallacyAnalysisResult | null>(null);
  const [showFallacyAlert, setShowFallacyAlert] = useState(false);
  const [allDetectedFallacies, setAllDetectedFallacies] = useState<DetectedFallacy[]>([]);
  const [selectedMessageForFallacy, setSelectedMessageForFallacy] = useState<string | null>(null);

  // Handle fallacy analysis from stream
  const handleFallacyAnalysis = useCallback((analysis: FallacyAnalysisResult) => {
    setLatestFallacyAnalysis(analysis);

    // Store analysis by message ID
    if (analysis.messageId) {
      setFallacyAnalyses(prev => new Map(prev).set(analysis.messageId!, analysis));
    }

    // Collect all fallacies
    if (analysis.fallacies.length > 0) {
      setAllDetectedFallacies(prev => [...prev, ...analysis.fallacies]);
      setShowFallacyAlert(true);

      // Update stats
      setStats(prev => ({
        ...prev,
        fallaciesDetected: prev.fallaciesDetected + analysis.fallacies.length,
        argumentStrength: analysis.argumentStrength,
      }));

      // Show toast for major fallacies
      const majorFallacies = analysis.fallacies.filter(f => f.severity === 'major');
      if (majorFallacies.length > 0) {
        toast({
          title: "Logical Fallacy Detected",
          description: `${majorFallacies[0].name}: ${majorFallacies[0].description}`,
          variant: "destructive",
        });
      }
    } else if (analysis.argumentStrength >= 7) {
      // Good argument feedback
      setStats(prev => ({
        ...prev,
        argumentStrength: analysis.argumentStrength,
      }));
      setShowFallacyAlert(true);
    }
  }, [toast]);

  // Streaming hook
  const { sendMessage, isStreaming, streamingContent } = useDebateStream({
    debateId: id!,
    onMessage: (message) => {
      setMessages((prev) => [...prev, message as any]);
    },
    onFallacyAnalysis: handleFallacyAnalysis,
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load debate and messages
  useEffect(() => {
    const loadDebate = async () => {
      if (!id) return;

      try {
        const [debateResponse, messagesResponse] = await Promise.all([
          debatesApi.get(id),
          debatesApi.getMessages(id),
        ]);

        setDebate(debateResponse.data);
        setMessages(
          messagesResponse.data.map((m: any) => ({
            id: m.id,
            content: m.content,
            role: m.role,
            timestamp: new Date(m.createdAt),
          }))
        );

        // Load stats if available
        try {
          const statsResponse = await debatesApi.getStats(id);
          if (statsResponse.data) {
            setStats({
              argumentStrength: statsResponse.data.argumentStrength || 5,
              fallaciesDetected: statsResponse.data.fallaciesDetected || 0,
              duration: statsResponse.data.durationMinutes || 0,
            });
          }
        } catch {
          // Stats may not exist yet
        }
      } catch (error: any) {
        toast({
          title: "Failed to load debate",
          description: error.response?.data?.error?.message || "Please try again",
          variant: "destructive",
        });
        navigate("/debates");
      } finally {
        setIsLoading(false);
      }
    };

    loadDebate();
  }, [id, navigate, toast]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Duration timer
  useEffect(() => {
    if (debate?.status !== "active") return;

    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        duration: prev.duration + 1,
      }));
    }, 60000);

    return () => clearInterval(interval);
  }, [debate?.status]);

  // Auto-dismiss fallacy alert after a delay
  useEffect(() => {
    if (showFallacyAlert && latestFallacyAnalysis) {
      const timer = setTimeout(() => {
        setShowFallacyAlert(false);
      }, 15000); // 15 seconds
      return () => clearTimeout(timer);
    }
  }, [showFallacyAlert, latestFallacyAnalysis]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;
    setShowFallacyAlert(false); // Hide previous alert
    await sendMessage(content);
  };

  const handleGoodArgument = (messageId: string) => {
    toast({
      title: "Acknowledged",
      description: "You've acknowledged this as a strong argument point.",
    });
  };

  const handleFlagIssue = (messageId: string) => {
    toast({
      title: "Issue Flagged",
      description: "The AI will address this in its next response.",
    });
  };

  const handleShowFallacies = (messageId?: string) => {
    if (messageId) {
      setSelectedMessageForFallacy(messageId);
    }
  };

  const handleEndDebate = async () => {
    if (!id) return;

    setIsEnding(true);
    setShowEndDialog(false);

    try {
      const response = await debatesApi.end(id);
      setSummary(response.data.summary);
      setDetailedFallacies(response.data.detailedFallacies || []);
      setShowSummaryDialog(true);

      // Update local state
      setDebate((prev) => prev ? { ...prev, status: "completed" } : null);
      const fallacyCount = response.data.detailedFallacies?.length || response.data.summary.fallaciesDetected?.length || 0;
      setStats({
        argumentStrength: response.data.summary.argumentStrength,
        fallaciesDetected: fallacyCount,
        duration: response.data.stats?.durationMinutes || stats.duration,
      });

      toast({
        title: "Debate ended",
        description: "Your performance summary is ready",
      });
    } catch (error: any) {
      toast({
        title: "Failed to end debate",
        description: error.response?.data?.error?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsEnding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!debate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Debate not found</h1>
          <Button onClick={() => navigate("/debates")} className="mt-4">
            Go to Debates
          </Button>
        </div>
      </div>
    );
  }

  const topicTitle = debate.topic?.title || debate.customTopic?.title || "Custom Debate";
  const topicDescription = debate.topic?.description || debate.customTopic?.description || "";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container max-w-6xl py-24">
        {/* Header Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{topicTitle}</CardTitle>
                <CardDescription className="text-base mt-1">{topicDescription}</CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{debate.difficulty}</Badge>
                  <Badge variant="outline">{debate.debateStyle}</Badge>
                  <Badge variant="secondary">{debate.aiProvider}: {debate.aiModel}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Fallacy History Panel */}
                {allDetectedFallacies.length > 0 && (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Fallacy History ({allDetectedFallacies.length})
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Fallacy History</SheetTitle>
                        <SheetDescription>
                          All logical fallacies detected in your arguments
                        </SheetDescription>
                      </SheetHeader>
                      <ScrollArea className="h-[calc(100vh-200px)] mt-4">
                        <div className="space-y-4 pr-4">
                          {allDetectedFallacies.map((fallacy, index) => (
                            <Card key={index} className={
                              fallacy.severity === "major" ? "border-red-200 dark:border-red-800" :
                              fallacy.severity === "moderate" ? "border-amber-200 dark:border-amber-800" :
                              "border-blue-200 dark:border-blue-800"
                            }>
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm">{fallacy.name}</CardTitle>
                                  <Badge variant={
                                    fallacy.severity === "major" ? "destructive" :
                                    fallacy.severity === "moderate" ? "default" : "secondary"
                                  }>
                                    {fallacy.severity}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                <p className="text-sm text-muted-foreground">{fallacy.description}</p>
                                {fallacy.quote && (
                                  <div className="bg-muted p-2 rounded text-sm italic">
                                    "{fallacy.quote}"
                                  </div>
                                )}
                                {fallacy.suggestion && (
                                  <p className="text-sm text-primary">{fallacy.suggestion}</p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>
                )}

                {debate.status === "active" && (
                  <Button
                    variant="outline"
                    onClick={() => setShowEndDialog(true)}
                    disabled={isEnding}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    End Debate
                  </Button>
                )}
                {debate.status === "completed" && (
                  <Badge className="bg-green-500">
                    <Trophy className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
            </div>
            <div className="mt-2 p-2 bg-muted rounded text-sm">
              <span className="font-medium">Your position:</span> {debate.userPosition}
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Fallacy Alert (shows after user message is analyzed) */}
            {showFallacyAlert && latestFallacyAnalysis && (
              <FallacyAlert
                analysis={latestFallacyAnalysis}
                onDismiss={() => setShowFallacyAlert(false)}
                className="animate-in slide-in-from-top-4"
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Debate Room</span>
                  {isStreaming && (
                    <Badge variant="outline" className="animate-pulse">
                      AI is responding...
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto p-2">
                  {messages.map((message, index) => (
                    <DebateBubble
                      key={message.id}
                      message={message}
                      isLast={index === messages.length - 1 && !streamingContent}
                      fallacyAnalysis={fallacyAnalyses.get(message.id)}
                      onGoodArgument={handleGoodArgument}
                      onFlagIssue={handleFlagIssue}
                      onShowFallacies={() => handleShowFallacies(message.id)}
                    />
                  ))}

                  {/* Streaming content */}
                  {streamingContent && (
                    <div className="debate-bubble debate-bubble-ai">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-debate-ai">AI Opponent</span>
                        <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
                      </div>
                      <p className="whitespace-pre-wrap text-foreground">{streamingContent}</p>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {isStreaming && !streamingContent && (
                    <div className="debate-bubble debate-bubble-ai">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-debate-ai">AI Opponent</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse [animation-delay:150ms]" />
                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse [animation-delay:300ms]" />
                        <span className="text-sm text-muted-foreground ml-2">Thinking...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <Separator className="my-4" />

                {debate.status === "active" ? (
                  <DebateInput
                    onSendMessage={handleSendMessage}
                    isLoading={isStreaming}
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    This debate has ended.{" "}
                    <Button variant="link" onClick={() => navigate("/debate/new")}>
                      Start a new debate
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Your Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <DebateStats
                  stats={stats}
                  recentFallacies={allDetectedFallacies}
                  latestAnalysis={latestFallacyAnalysis}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />

      {/* End Debate Confirmation Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Debate?</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this debate? The AI will generate a summary of your performance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEndDebate} disabled={isEnding}>
              {isEnding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating Summary...
                </>
              ) : (
                "End Debate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Debate Summary
            </DialogTitle>
          </DialogHeader>

          {summary && (
            <div className="space-y-6">
              <div>
                <p className="text-lg">{summary.overallPerformance}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{summary.argumentStrength}/10</div>
                  <div className="text-sm text-muted-foreground">Argument Strength</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{summary.logicalScore}/10</div>
                  <div className="text-sm text-muted-foreground">Logical Score</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{summary.persuasiveScore}/10</div>
                  <div className="text-sm text-muted-foreground">Persuasive Score</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-green-600">Your Strengths</h4>
                <ul className="list-disc list-inside space-y-1">
                  {summary.userStrengths?.map((strength, i) => (
                    <li key={i} className="text-sm">{strength}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-orange-600">Areas for Improvement</h4>
                <ul className="list-disc list-inside space-y-1">
                  {summary.areasForImprovement?.map((area, i) => (
                    <li key={i} className="text-sm">{area}</li>
                  ))}
                </ul>
              </div>

              {/* Detailed Fallacies from Real-Time Detection */}
              {detailedFallacies.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    Fallacies You Committed ({detailedFallacies.length} total)
                  </h4>

                  {/* Group by severity */}
                  {(['major', 'moderate', 'minor'] as const).map((severity) => {
                    const fallaciesOfSeverity = detailedFallacies.filter(f => f.severity === severity);
                    if (fallaciesOfSeverity.length === 0) return null;

                    return (
                      <div key={severity} className="mb-4">
                        <div className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2 ${
                          severity === 'major' ? 'text-red-600' :
                          severity === 'moderate' ? 'text-amber-600' : 'text-blue-600'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            severity === 'major' ? 'bg-red-500' :
                            severity === 'moderate' ? 'bg-amber-500' : 'bg-blue-500'
                          }`} />
                          {severity.toUpperCase()} ({fallaciesOfSeverity.length})
                        </div>
                        <div className="space-y-2">
                          {fallaciesOfSeverity.map((fallacy) => (
                            <div
                              key={fallacy.id}
                              className={`p-3 rounded-lg border ${
                                severity === 'major' ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800' :
                                severity === 'moderate' ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' :
                                'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              <div className="font-semibold text-sm">{fallacy.fallacyName}</div>
                              <p className="text-xs text-muted-foreground mt-1">{fallacy.description}</p>
                              {fallacy.quote && (
                                <div className="mt-2 p-2 bg-background/50 rounded text-xs">
                                  <span className="text-muted-foreground">You said: </span>
                                  <span className="italic">"{fallacy.quote}"</span>
                                </div>
                              )}
                              {fallacy.suggestion && (
                                <div className="mt-2 flex items-start gap-1.5 text-xs text-primary">
                                  <span>💡</span>
                                  <span>{fallacy.suggestion}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Fallback to AI-detected fallacies if no real-time data */}
              {detailedFallacies.length === 0 && summary.fallaciesDetected && summary.fallaciesDetected.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    Fallacies Detected
                  </h4>
                  <ul className="space-y-2">
                    {summary.fallaciesDetected.map((fallacy, i) => (
                      <li key={i} className="text-sm p-2 bg-red-50 dark:bg-red-950 rounded">
                        <span className="font-medium">{fallacy.type}:</span> {fallacy.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 bg-primary/10 rounded-lg">
                <h4 className="font-semibold mb-1">Recommendation</h4>
                <p className="text-sm">{summary.recommendation}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => navigate("/debates")}>
              View All Debates
            </Button>
            <Button onClick={() => navigate("/debate/new")}>
              Start New Debate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DebateRoom;
