import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { topicsApi, debatesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Filter, History, Loader2, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Topic {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: { name: string } | null;
}

interface Debate {
  id: string;
  topic: { title: string } | null;
  customTopic: { title: string } | null;
  status: string;
  difficulty: string;
  startedAt: string;
  messageCount: number;
}

const DebatesList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState("topics");
  const [filter, setFilter] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [debates, setDebates] = useState<Debate[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [isLoadingDebates, setIsLoadingDebates] = useState(true);

  // Load topics
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const response = await topicsApi.getTopics({ limit: 50, difficulty: filter || undefined });
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
  }, [filter, toast]);

  // Load user's debates
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoadingDebates(false);
      return;
    }

    const loadDebates = async () => {
      try {
        const response = await debatesApi.getAll(1, 20);
        setDebates(response.data);
      } catch (error) {
        // User may not have any debates yet
      } finally {
        setIsLoadingDebates(false);
      }
    };
    loadDebates();
  }, [isAuthenticated]);

  const filteredTopics = filter
    ? topics.filter((topic) => topic.difficulty === filter)
    : topics;

  const handleStartDebate = (topicId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to start a debate",
      });
      navigate("/login");
      return;
    }
    navigate(`/debate/new?topic=${topicId}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container py-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Debate Arena</h1>
          <p className="text-muted-foreground mt-2">
            Browse topics to debate or view your debate history
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="topics">
              <MessageSquare className="h-4 w-4 mr-2" />
              Browse Topics
            </TabsTrigger>
            {isAuthenticated && (
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                My Debates
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="topics" className="space-y-6">
            <div className="flex justify-between items-center">
              <Tabs
                defaultValue="all"
                className="w-[400px]"
                onValueChange={(value) => setFilter(value === "all" ? null : value)}
              >
                <TabsList>
                  <TabsTrigger value="all">All Topics</TabsTrigger>
                  <TabsTrigger value="beginner">Beginner</TabsTrigger>
                  <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
                  <TabsTrigger value="expert">Expert</TabsTrigger>
                </TabsList>
              </Tabs>

              <Link to="/debate/new">
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  New Debate
                </Button>
              </Link>
            </div>

            {isLoadingTopics ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTopics.map((topic) => (
                  <Card key={topic.id} className="hover:border-primary/50 hover:shadow-md transition-all">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{topic.title}</CardTitle>
                        <Badge
                          variant={
                            topic.difficulty === "beginner"
                              ? "default"
                              : topic.difficulty === "intermediate"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {topic.difficulty}
                        </Badge>
                      </div>
                      <CardDescription className="mt-2 line-clamp-2">
                        {topic.description}
                      </CardDescription>
                      {topic.category && (
                        <Badge variant="outline" className="mt-2 w-fit">
                          {topic.category.name}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full"
                        onClick={() => handleStartDebate(topic.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Start Debate
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoadingTopics && filteredTopics.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No topics found. Try a different filter.
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {isLoadingDebates ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : debates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">You haven't started any debates yet.</p>
                <Link to="/debate/new">
                  <Button>Start Your First Debate</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {debates.map((debate) => (
                  <Card key={debate.id} className="hover:border-primary/50 transition-all">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {debate.topic?.title || debate.customTopic?.title || "Custom Debate"}
                          </h3>
                          <Badge
                            variant={debate.status === "completed" ? "default" : "secondary"}
                            className={debate.status === "completed" ? "bg-green-500" : ""}
                          >
                            {debate.status === "completed" && <Trophy className="h-3 w-3 mr-1" />}
                            {debate.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(debate.startedAt).toLocaleDateString()}
                          </span>
                          <span>{debate.messageCount || 0} messages</span>
                          <Badge variant="outline">{debate.difficulty}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/debate/${debate.id}`)}
                      >
                        {debate.status === "active" ? "Continue" : "View"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default DebatesList;
