import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { topicsApi } from "@/lib/api";
import type { Topic } from "@/types/api";
import { TrendingUp, MessageSquare } from "lucide-react";

export function TrendingDebates() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => { void topicsApi.getTrending(6).then((response) => setTopics(response.data)).finally(() => setIsLoading(false)); }, []);

  return <section className="py-16 bg-secondary/50"><div className="container">
    <div className="flex items-center gap-2 mb-8"><TrendingUp className="h-5 w-5 text-primary" /><h2 className="text-2xl font-bold">Trending Topics</h2></div>
    {isLoading ? <div className="grid md:grid-cols-3 gap-6">{[0,1,2].map((item) => <Card key={item} className="h-48 animate-pulse" />)}</div> :
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{topics.map((topic) => <Link to={`/debate/new?topic=${topic.id}`} key={topic.id}><Card className="h-full hover:border-primary/50 transition-all"><CardHeader><CardTitle>{topic.title}</CardTitle><CardDescription>{topic.description}</CardDescription></CardHeader><CardContent className="flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="h-3 w-3" />Used {topic.usageCount} times</CardContent></Card></Link>)}</div>}
  </div></section>;
}
