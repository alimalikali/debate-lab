
import { DebateTopic, TrendingDebate } from "@/types/debate";

export const mockTrendingDebates: TrendingDebate[] = [
  {
    id: "1",
    topic: "Universal Basic Income",
    description: "Is UBI a viable solution to address poverty and technological unemployment?",
    messageCount: 28,
    duration: 15
  },
  {
    id: "2",
    topic: "Artificial Intelligence Regulation",
    description: "Should AI development be regulated by international standards?",
    messageCount: 34,
    duration: 22
  },
  {
    id: "3",
    topic: "Climate Change Solutions",
    description: "Carbon taxes vs. renewable energy subsidies: which approach is more effective?",
    messageCount: 41,
    duration: 27
  }
];

export const mockDebateTopics: DebateTopic[] = [
  {
    id: "topic-1",
    title: "Social Media Impact",
    description: "Do social media platforms have a net positive or negative effect on society?",
    difficulty: "beginner"
  },
  {
    id: "topic-2",
    title: "Free Speech Limitations",
    description: "Should hate speech be protected under free speech laws?",
    difficulty: "intermediate"
  },
  {
    id: "topic-3",
    title: "Genetic Engineering",
    description: "Should gene editing technologies like CRISPR be used on humans?",
    difficulty: "expert"
  },
  {
    id: "topic-4",
    title: "Democracy vs. Authoritarianism",
    description: "Is democracy always superior to authoritarian systems of government?",
    difficulty: "expert"
  },
  {
    id: "topic-5",
    title: "Space Exploration Funding",
    description: "Should governments prioritize space exploration over addressing Earth's problems?",
    difficulty: "intermediate"
  },
  {
    id: "topic-6",
    title: "Mandatory Voting",
    description: "Should voting be mandatory in democratic elections?",
    difficulty: "beginner"
  }
];

// Mock debate initial responses to simulate AI
export const mockDebateResponses = {
  "topic-1": "While social media platforms have connected people globally and given voice to marginalized groups, they've also contributed to misinformation, addiction, and mental health issues. The question isn't whether they're good or bad, but how we can maximize benefits while minimizing harms.",
  "topic-2": "Free speech is a fundamental right in democratic societies, but unrestricted hate speech can lead to discrimination, violence, and social harm. The challenge lies in drawing the line between protecting expression and preventing harm.",
  "topic-3": "Gene editing technologies like CRISPR offer tremendous potential for eliminating genetic diseases, but they also raise profound ethical questions about consent, unintended consequences, and creating a divide between genetically enhanced and unenhanced populations.",
  "topic-4": "Democracy provides freedoms and representation that authoritarianism lacks, but some argue that certain authoritarian systems can implement policies more efficiently without political gridlock. The effectiveness of either system depends greatly on specific implementation and cultural context.",
  "topic-5": "Space exploration has led to numerous technological advancements that benefit life on Earth, but with pressing issues like climate change and global poverty, we must consider whether immediate terrestrial concerns should take precedence over long-term space ambitions.",
  "topic-6": "Mandatory voting ensures higher participation rates and potentially more representative governments, but it may also lead to uninformed voting and questions whether forcing civic participation aligns with democratic values of freedom."
};

export const generateAIResponse = (message: string): string => {
  // This is a very simplified mock of AI responses
  // In a real app, this would call an AI API
  
  if (message.toLowerCase().includes("disagree")) {
    return "I understand your perspective, but consider the counterargument: statistical evidence from multiple studies suggests otherwise. Additionally, we should examine the ethical implications more closely.";
  }
  
  if (message.toLowerCase().includes("agree")) {
    return "While I see merit in your agreement, there are still some critical nuances to consider. For example, implementation challenges could significantly impact outcomes, and there are competing ethical frameworks that might lead to different conclusions.";
  }
  
  if (message.length < 50) {
    return "That's an interesting point, but I'd appreciate if you could elaborate further. Brief arguments often overlook important complexities and nuances that are crucial to this debate topic.";
  }
  
  // Default response for other cases
  return "That's a thoughtful argument. However, we should consider alternative perspectives as well. The issue has multiple dimensions including ethical considerations, practical implementation challenges, and long-term societal impacts that might not be immediately apparent.";
};
