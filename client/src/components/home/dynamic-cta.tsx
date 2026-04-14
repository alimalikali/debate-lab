
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Award, Flame, Swords } from "lucide-react";

type UserEngagementLevel = "new" | "returning" | "high";

interface DynamicCTAProps {
  engagementLevel?: UserEngagementLevel;
}

export function DynamicCTA({ engagementLevel = "new" }: DynamicCTAProps) {
  const ctaContent = {
    new: {
      icon: Swords,
      text: "Challenge the AI",
      subtext: "Start your first intellectual duel",
      route: "/debate/new"
    },
    returning: {
      icon: Flame,
      text: "Continue Your Debate Streak",
      subtext: "Keep your intellectual momentum going",
      route: "/debates"
    },
    high: {
      icon: Award,
      text: "Climb the Leaderboard",
      subtext: "You're gaining recognition - aim for the top",
      route: "/profile"
    }
  };

  const { icon: Icon, text, subtext, route } = ctaContent[engagementLevel];

  return (
    <div className="w-full max-w-md">
      <Link to={route}>
        <Button 
          size="lg" 
          className="w-full group h-auto py-6 rounded-xl relative overflow-hidden"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-80 group-hover:opacity-100 transition-opacity"></span>
          
          <div className="flex items-center justify-between w-full relative z-10">
            <div className="flex items-center">
              <div className="bg-background/20 p-2 rounded-lg mr-4">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <div className="font-bold text-lg">{text}</div>
                <div className="text-xs text-white/80">{subtext}</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-white group-hover:translate-x-1 transition-transform" />
          </div>
        </Button>
      </Link>
    </div>
  );
}
