import { useEffect } from "react";

const History = () => {
  useEffect(() => {
    document.title = "History - Artifio.ai";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="text-center space-y-4 py-20">
          <h1 className="text-4xl font-black gradient-text">Generation History</h1>
          <p className="text-muted-foreground">Your creation history will appear here</p>
        </div>
      </div>
    </div>
  );
};

export default History;
