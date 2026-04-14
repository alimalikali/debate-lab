
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center">
      <div className="container max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Sharpen Your Mind with
              <span className="text-gradient block mt-1">AI Debate</span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-md">
              Challenge your thinking, refine your arguments, and debate with advanced AI opponents on any topic.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/debate/new">
                <Button size="lg" className="rounded-full">
                  Start a Debate
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/debates">
                <Button variant="outline" size="lg" className="rounded-full">
                  Browse Debates
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="hidden md:block relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl animate-pulse-slow"></div>
            <div className="glass-card rounded-xl p-6 relative">
              <div className="space-y-4">
                <div className="debate-bubble debate-bubble-ai">
                  <p className="text-sm">The advancement of AI technology poses significant risks to privacy and human autonomy.</p>
                </div>
                <div className="debate-bubble debate-bubble-human">
                  <p className="text-sm">While there are legitimate concerns, the benefits of AI in healthcare and scientific research outweigh potential privacy issues.</p>
                </div>
                <div className="debate-bubble debate-bubble-ai">
                  <p className="text-sm">That ignores the fundamental question of consent. Users rarely understand how their data is used to train AI models.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
