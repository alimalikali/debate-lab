
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDebate } from "@/types/debate";
import { TrendingUp, Clock, MessageSquare } from "lucide-react";
import { mockTrendingDebates } from "@/data/mock-debates";

export function TrendingDebates() {
  const [debates, setDebates] = useState<TrendingDebate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch with timeout
    const fetchDebates = () => {
      setTimeout(() => {
        setDebates(mockTrendingDebates);
        setIsLoading(false);
      }, 1000);
    };

    fetchDebates();
  }, []);

  return (
    <section className="py-16 bg-secondary/50">
      <div className="container">
        <div className="flex items-center gap-2 mb-8">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Trending Debates</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-48 animate-pulse">
                <CardHeader className="bg-muted/50 h-full"></CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {debates.map((debate) => (
              <Link to={`/debate/${debate.id}`} key={debate.id}>
                <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all">
                  <CardHeader>
                    <CardTitle>{debate.topic}</CardTitle>
                    <CardDescription>{debate.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>{debate.messageCount} messages</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{debate.duration} min</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
