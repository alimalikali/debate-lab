
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Gauge, MessageSquare, Trophy } from "lucide-react";

const features = [
  {
    title: "Real-Time AI Debates",
    description: "Engage with advanced AI opponents that respond to your arguments in real-time with relevant counterpoints.",
    icon: MessageSquare,
  },
  {
    title: "Argument Strength Analysis",
    description: "Receive instant feedback on your arguments' logical strength and persuasiveness.",
    icon: Gauge,
  },
  {
    title: "Multiple Difficulty Levels",
    description: "Choose opponents from beginner to expert level based on your experience and confidence.",
    icon: Brain,
  },
  {
    title: "Achievements & Leaderboards",
    description: "Earn badges for successful debates and compare your performance with others.",
    icon: Trophy,
  },
];

export function FeaturesSection() {
  return (
    <section className="py-16">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Powerful Debate Features</h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Our platform offers everything you need to sharpen your debating skills and challenge your perspectives.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <Card key={i} className="border bg-card">
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
