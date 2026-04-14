
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Cpu, 
  Globe, 
  HeartPulse, 
  LucideIcon, 
  PenTool, 
  Presentation 
} from "lucide-react";
import { cn } from "@/lib/utils";

type DebateCategory = {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
};

const CATEGORIES: DebateCategory[] = [
  { id: "ethics", name: "Ethics", icon: HeartPulse, color: "from-red-500 to-pink-500" },
  { id: "tech", name: "Tech", icon: Cpu, color: "from-blue-500 to-cyan-500" },
  { id: "politics", name: "Politics", icon: Globe, color: "from-green-500 to-emerald-500" },
  { id: "culture", name: "Culture", icon: PenTool, color: "from-yellow-500 to-amber-500" },
  { id: "philosophy", name: "Philosophy", icon: BookOpen, color: "from-purple-500 to-violet-500" },
  { id: "ai", name: "AI", icon: Presentation, color: "from-indigo-500 to-blue-500" },
];

export function TopicWheel() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const spinWheel = () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    
    // Calculate random rotation between 2 and 5 full rotations plus offset for a category
    const fullRotations = 2 + Math.random() * 3; // 2-5 rotations
    const categoryIndex = Math.floor(Math.random() * CATEGORIES.length);
    const categoryOffset = (categoryIndex / CATEGORIES.length) * 360;
    const totalRotation = fullRotations * 360 + categoryOffset;
    
    if (wheelRef.current) {
      wheelRef.current.style.transition = "transform 4s cubic-bezier(0.2, 0.8, 0.2, 1)";
      wheelRef.current.style.transform = `rotate(${totalRotation}deg)`;
    }
    
    // Play spin sound
    const audio = new Audio("/spin-sound.mp3");
    audio.volume = 0.3;
    audio.play().catch(e => console.log("Audio play failed:", e));
    
    // Vibrate if available
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    // After animation, set the selected category
    setTimeout(() => {
      setSelectedCategory(CATEGORIES[categoryIndex].id);
      setIsSpinning(false);
    }, 4000);
  };

  useEffect(() => {
    // Reset the wheel's transform when not spinning
    if (!isSpinning && wheelRef.current) {
      wheelRef.current.style.transition = "none";
      wheelRef.current.style.transform = "rotate(0deg)";
    }
  }, [isSpinning]);

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-xl font-semibold mb-6">Explore Debate Topics</h3>
      
      <div className="relative w-64 h-64 mb-8">
        {/* Wheel center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-background rounded-full z-20 border-4 border-primary shadow-lg flex items-center justify-center">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
        </div>
        
        {/* Spinner indicator */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-8 bg-accent z-10 clip-triangle"></div>
        
        {/* Wheel */}
        <div 
          ref={wheelRef} 
          className="w-full h-full rounded-full overflow-hidden border border-border shadow-md relative"
        >
          {CATEGORIES.map((category, index) => (
            <div 
              key={category.id}
              className={cn(
                "absolute w-1/2 h-1/2 bg-gradient-to-r",
                category.color,
                "origin-bottom-right"
              )}
              style={{ 
                transform: `rotate(${index * (360 / CATEGORIES.length)}deg)`,
                clipPath: "polygon(0 0, 100% 0, 100% 100%)"
              }}
            >
              <div 
                className="absolute top-6 left-6 transform -rotate-45 flex items-center justify-center text-white"
                style={{ 
                  transform: `rotate(${(index * (360 / CATEGORIES.length)) + 45}deg)`,
                  transformOrigin: "bottom right"
                }}
              >
                <category.icon className="h-6 w-6" />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Button 
        onClick={spinWheel} 
        disabled={isSpinning}
        className="relative overflow-hidden group animate-pulse"
        size="lg"
      >
        <span className="relative z-10">Spin the Topic Wheel</span>
        <span className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient group-hover:opacity-90"></span>
      </Button>
      
      {selectedCategory && (
        <div className="mt-6 text-center animate-fade-in">
          <p className="font-medium">Ready to debate about <span className="text-primary font-bold">{CATEGORIES.find(c => c.id === selectedCategory)?.name}</span>?</p>
          <Button variant="outline" className="mt-3">
            Start a Debate
          </Button>
        </div>
      )}
      
      <style>
        {`
        .clip-triangle {
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
        `}
      </style>
    </div>
  );
}
