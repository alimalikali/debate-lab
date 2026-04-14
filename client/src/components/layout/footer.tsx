
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-secondary py-8">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="font-bold text-lg">
              DebateHub
            </Link>
            <p className="text-muted-foreground text-sm mt-1">
              Challenge your thinking through AI-powered debates
            </p>
          </div>
          
          <div className="flex gap-8 text-sm">
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} DebateHub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
