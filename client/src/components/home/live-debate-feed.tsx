
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDebate } from "@/types/debate";
import { Clock, MessageSquare, Users } from "lucide-react";
import { mockTrendingDebates } from "@/data/mock-debates";

export function LiveDebateFeed() {
  const [debates, setDebates] = useState<TrendingDebate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch with timeout
    const fetchDebates = () => {
      setTimeout(() => {
        // Randomize order of debates
        const shuffled = [...mockTrendingDebates].sort(() => 0.5 - Math.random());
        setDebates(shuffled.slice(0, 5)); // Take 5 random debates
        setIsLoading(false);
      }, 1000);
    };

    fetchDebates();

    // Simulated real-time updates
    const interval = setInterval(() => {
      const newDebates = [...debates];
      // Update a random debate's message count and duration
      if (newDebates.length > 0) {
        const randomIndex = Math.floor(Math.random() * newDebates.length);
        newDebates[randomIndex] = {
          ...newDebates[randomIndex],
          messageCount: newDebates[randomIndex].messageCount + Math.floor(Math.random() * 3) + 1,
          duration: newDebates[randomIndex].duration + 1
        };
        setDebates(newDebates);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [debates]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold">Live Debates</h3>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-16 animate-pulse bg-muted/50"></Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {debates.map((debate, index) => (
            <motion.div
              key={debate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/debate/${debate.id}`}>
                <Card className="hover:border-primary/30 hover:bg-accent/5 transition-all">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{debate.topic}</div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{debate.messageCount} msgs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{debate.duration} min</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Sentiment bar */}
                      <div className="h-6 w-24 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500" 
                          style={{ width: `${Math.random() * 60 + 40}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
