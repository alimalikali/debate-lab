import { useState, useEffect } from "react";
import { getApiErrorMessage } from "@/lib/errors";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { topicsApi, debatesApi, aiApi } from "@/lib/api";
import { ArrowRight, MessageSquare, Loader2, Cpu, Zap, AlertCircle } from "lucide-react";

interface Topic {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: { name: string } | null;
}

const NewDebate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);

  // Topic selection
  const [customTopic, setCustomTopic] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");

  // Debate settings
  const [userPosition, setUserPosition] = useState("");
  const [difficulty, setDifficulty] = useState<import("@/types/api").Difficulty>("beginner");
  const [debateStyle, setDebateStyle] = useState<import("@/types/api").DebateStyle>("balanced");

  // AI Provider settings
  const [aiProvider, setAiProvider] = useState("ollama");
  const [aiModel, setAiModel] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [isCheckingOllama, setIsCheckingOllama] = useState(true);

  // Load topics
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const response = await topicsApi.getTopics({ limit: 100 });
        setTopics(response.data);
      } catch (error) {
        toast({
          title: "Failed to load topics",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTopics(false);
      }
    };
    loadTopics();
  }, [toast]);

  // Check Ollama status and load models
  useEffect(() => {
    const checkOllama = async () => {
      try {
        const status = await aiApi.getOllamaStatus();
        setOllamaConnected(status.data.connected);
        if (status.data.connected && status.data.models.length > 0) {
          setAvailableModels(status.data.models);
          setAiModel(status.data.models[0]);
        }
      } catch (error) {
        setOllamaConnected(false);
      } finally {
        setIsCheckingOllama(false);
      }
    };
    checkOllama();
  }, []);

  // Load models when provider changes
  useEffect(() => {
    const loadModels = async () => {
      if (aiProvider === "ollama") {
        try {
          const models = await aiApi.getOllamaModels();
          setAvailableModels(models.data);
          if (models.data.length > 0) {
            setAiModel(models.data[0]);
          }
        } catch {
          setAvailableModels([]);
        }
      } else {
        try {
          const models = await aiApi.getProviderModels(aiProvider);
          setAvailableModels(models.data);
          if (models.data.length > 0) {
            setAiModel(models.data[0]);
          }
        } catch {
          setAvailableModels([]);
        }
      }
    };
    loadModels();
  }, [aiProvider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userPosition.trim()) {
      toast({
        title: "Position required",
        description: "Please state your position on the topic",
        variant: "destructive",
      });
      return;
    }

    if (aiProvider === "ollama" && !ollamaConnected) {
      toast({
        title: "Ollama not connected",
        description: "Please start Ollama or select a different AI provider",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Determine default model based on provider
      let modelToUse = aiModel;
      if (!modelToUse) {
        switch (aiProvider) {
          case 'ollama':
            modelToUse = 'llama3.2';
            break;
          case 'google':
            modelToUse = 'gemini-2.0-flash';
            break;
          case 'openai':
            modelToUse = 'gpt-4o-mini';
            break;
          case 'anthropic':
            modelToUse = 'claude-3-haiku-20240307';
            break;
          case 'groq':
            modelToUse = 'llama-3.1-8b-instant';
            break;
          default:
            modelToUse = 'llama2';
        }
      }

      const debateData: Parameters<typeof debatesApi.create>[0] = {
        userPosition,
        difficulty,
        debateStyle,
        aiProvider,
        aiModel: modelToUse,
      };

      if (customTopic) {
        debateData.customTopicTitle = customTitle;
        debateData.customTopicDescription = customDescription;
      } else {
        debateData.topicId = topicId;
      }

      const response = await debatesApi.create(debateData);
      toast({
        title: "Debate started!",
        description: "Good luck with your arguments",
      });
      navigate(`/debate/${response.data.id}`);
    } catch (error: unknown) {
      toast({
        title: "Failed to start debate",
        description: getApiErrorMessage(error, "Please try again"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTopic = topics.find((t) => t.id === topicId);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container max-w-3xl py-24">
        <div className="mb-8 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Start a New Debate</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select a Topic</CardTitle>
              <CardDescription>Choose a pre-defined topic or create your own</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Topic Type</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomTopic(!customTopic)}
                >
                  {customTopic ? "Select Existing Topic" : "Create Custom Topic"}
                </Button>
              </div>

              {!customTopic ? (
                <div className="space-y-4">
                  <Select value={topicId} onValueChange={setTopicId} disabled={isLoadingTopics}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingTopics ? "Loading topics..." : "Select a debate topic"} />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          <div className="flex items-center gap-2">
                            <span>{topic.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {topic.difficulty}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedTopic && (
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <p className="text-muted-foreground">{selectedTopic.description}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Topic Title</Label>
                    <Input
                      id="title"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Enter a clear and concise title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Topic Description</Label>
                    <Textarea
                      id="description"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Provide a brief description or question to debate"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Your Position */}
          <Card>
            <CardHeader>
              <CardTitle>Your Position</CardTitle>
              <CardDescription>
                State your stance on this topic. The AI will argue against your position as a devil's advocate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={userPosition}
                onChange={(e) => setUserPosition(e.target.value)}
                placeholder="I believe that... / I am arguing for... / My position is..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Debate Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Debate Settings</CardTitle>
              <CardDescription>Customize how the AI opponent behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={(value) => { if (value === "beginner" || value === "intermediate" || value === "expert") setDifficulty(value); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner - Friendly & Educational</SelectItem>
                      <SelectItem value="intermediate">Intermediate - Challenging</SelectItem>
                      <SelectItem value="expert">Expert - No Mercy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Debate Style</Label>
                  <Select value={debateStyle} onValueChange={(value) => { if (value === "aggressive" || value === "balanced" || value === "socratic") setDebateStyle(value); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">Balanced - Fair & Respectful</SelectItem>
                      <SelectItem value="aggressive">Aggressive - Direct & Assertive</SelectItem>
                      <SelectItem value="socratic">Socratic - Questions & Exploration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Provider */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                AI Provider
              </CardTitle>
              <CardDescription>
                Choose which AI will be your debate opponent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCheckingOllama ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking Ollama connection...
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {ollamaConnected ? (
                      <Badge variant="default" className="bg-green-500">
                        <Zap className="h-3 w-3 mr-1" />
                        Ollama Connected
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Ollama Not Running
                      </Badge>
                    )}
                  </div>

                  {!ollamaConnected && (
                    <p className="text-sm text-muted-foreground">
                      Start Ollama locally to use free AI, or add your API keys in Profile settings.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select value={aiProvider} onValueChange={setAiProvider}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ollama" disabled={!ollamaConnected}>
                            Ollama (Local - Free) {!ollamaConnected && "(Not Connected)"}
                          </SelectItem>
                          <SelectItem value="openai">OpenAI (Requires API Key)</SelectItem>
                          <SelectItem value="anthropic">Anthropic Claude (Requires API Key)</SelectItem>
                          <SelectItem value="google">Google Gemini (Requires API Key)</SelectItem>
                          <SelectItem value="groq">Groq (Requires API Key)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Select value={aiModel} onValueChange={setAiModel} disabled={availableModels.length === 0}>
                        <SelectTrigger>
                          <SelectValue placeholder={availableModels.length === 0 ? "No models available" : "Select model"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={
              isLoading ||
              (!customTopic && !topicId) ||
              (customTopic && (!customTitle || !customDescription)) ||
              !userPosition.trim() ||
              (aiProvider === "ollama" && !ollamaConnected)
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Debate...
              </>
            ) : (
              <>
                Start Debate
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default NewDebate;
