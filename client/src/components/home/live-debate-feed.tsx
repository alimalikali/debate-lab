import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { topicsApi } from "@/lib/api";
import type { Topic } from "@/types/api";
import { MessageSquare, Users } from "lucide-react";

export function LiveDebateFeed() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => { void topicsApi.getTrending(5).then((response) => setTopics(response.data)).finally(() => setIsLoading(false)); }, []);
  return <div className="w-full"><div className="flex items-center gap-2 mb-4"><Users className="h-5 w-5 text-primary" /><h3 className="text-xl font-semibold">Popular Challenges</h3></div>
    {isLoading ? <div className="space-y-4">{[0,1,2].map((item) => <Card key={item} className="h-16 animate-pulse" />)}</div> :
      <div className="space-y-3">{topics.map((topic, index) => <motion.div key={topic.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:index*.1}}><Link to={`/debate/new?topic=${topic.id}`}><Card className="hover:border-primary/30"><CardContent className="p-3 flex justify-between"><span className="font-medium text-sm">{topic.title}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="h-3 w-3" />{topic.usageCount}</span></CardContent></Card></Link></motion.div>)}</div>}
  </div>;
}
