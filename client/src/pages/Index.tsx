
import { useEffect, useState } from "react";
import { HeroSection } from "@/components/home/hero-section";
import { TrendingDebates } from "@/components/home/trending-debates";
import { FeaturesSection } from "@/components/home/features-section";
import { TopicWheel } from "@/components/home/topic-wheel";
import { DynamicCTA } from "@/components/home/dynamic-cta";
import { LiveDebateFeed } from "@/components/home/live-debate-feed";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { motion } from "framer-motion";

const Index = () => {
  const [userEngagement, setUserEngagement] = useState<"new" | "returning" | "high">("new");
  
  useEffect(() => {
    // Simulate determining user engagement level
    // In a real app, this would be based on user activity data
    const visitCount = parseInt(localStorage.getItem("visitCount") || "0");
    localStorage.setItem("visitCount", (visitCount + 1).toString());
    
    if (visitCount > 10) {
      setUserEngagement("high");
    } else if (visitCount > 2) {
      setUserEngagement("returning");
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-16">
        <HeroSection />
        
        <motion.div 
          className="container max-w-6xl mx-auto px-4 py-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
            variants={itemVariants}
          >
            <div className="flex flex-col items-center justify-center">
              <TopicWheel />
            </div>
            
            <div className="space-y-8 flex flex-col justify-center">
              <motion.div variants={itemVariants}>
                <h2 className="text-2xl font-bold mb-6">Ready to Debate?</h2>
                <DynamicCTA engagementLevel={userEngagement} />
              </motion.div>
              
              <motion.div variants={itemVariants}>
                <LiveDebateFeed />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
        
        <TrendingDebates />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
