
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageSquare, Trophy, User } from "lucide-react";

const Profile = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container max-w-5xl py-24">
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" />
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                  <User />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold">Demo User</h1>
                <p className="text-muted-foreground">Joined June 2023</p>
                
                <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                  <Badge variant="outline" className="bg-primary/10">
                    <Trophy className="h-3 w-3 mr-1" />
                    Top 10% Debater
                  </Badge>
                  <Badge variant="outline" className="bg-accent/10">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    25+ Debates
                  </Badge>
                  <Badge variant="outline" className="bg-secondary/50">
                    <Brain className="h-3 w-3 mr-1" />
                    Logic Expert
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">12</div>
                  <div className="text-xs text-muted-foreground">Wins</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">8</div>
                  <div className="text-xs text-muted-foreground">Losses</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">8.2</div>
                  <div className="text-xs text-muted-foreground">Avg. Score</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="history">
          <TabsList className="mb-6">
            <TabsTrigger value="history">Debate History</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="history">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>
                        {["Universal Basic Income", "Climate Change Solutions", "Social Media Impact"][i]}
                      </CardTitle>
                      <Badge variant={i === 0 ? "default" : i === 1 ? "secondary" : "outline"}>
                        {i === 0 ? "Won" : i === 1 ? "Lost" : "Draw"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {new Date(Date.now() - i * 86400000 * 3).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {i === 0 
                        ? "You argued that UBI is necessary for economic stability in an automated future." 
                        : i === 1 
                        ? "You debated the effectiveness of carbon taxes versus renewable subsidies."
                        : "You discussed whether social media has a net positive effect on society."
                      }
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Argument Strength:</span> {7 + i}/10
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="achievements">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { name: "First Debate", desc: "Completed your first debate", earned: true },
                { name: "Logic Champion", desc: "Won 5 debates with high scores", earned: true },
                { name: "Persistent Debater", desc: "Participated in 10 consecutive days", earned: true },
                { name: "Diverse Thinker", desc: "Debated in 5 different topic categories", earned: false },
                { name: "Expert Challenger", desc: "Won against an expert-level AI", earned: false },
                { name: "Perfect Score", desc: "Achieved a 10/10 argument score", earned: false }
              ].map((achievement, i) => (
                <Card key={i} className={!achievement.earned ? "opacity-60" : undefined}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Trophy className={`h-5 w-5 ${achievement.earned ? "text-primary" : "text-muted-foreground"}`} />
                      {achievement.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{achievement.desc}</p>
                    <p className="text-xs mt-2">
                      {achievement.earned ? "Earned on June 10, 2023" : "Not yet earned"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Debate Performance</CardTitle>
                <CardDescription>Your debate statistics over time</CardDescription>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <p className="text-muted-foreground">Detailed statistics will be available in the full version</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
