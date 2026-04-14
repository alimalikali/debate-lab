
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Send } from "lucide-react";

interface DebateInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

export function DebateInput({ onSendMessage, isLoading }: DebateInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t pt-4">
      <div className="flex items-end gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your argument here..."
          className="min-h-24 resize-none"
        />
        <div className="flex flex-col gap-2">
          <Button 
            type="submit" 
            size="icon"
            disabled={!message.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => console.log("Voice input not implemented")}
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
