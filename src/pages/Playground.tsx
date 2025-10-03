import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Video, Image, Music, MessageSquare, Coins, LogOut } from "lucide-react";
import logo from "@/assets/logo.png";

const Playground = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tokensRemaining, setTokensRemaining] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [activeTab, setActiveTab] = useState("video");

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchTokenBalance(session.user.id);
  };

  const fetchTokenBalance = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("tokens_remaining")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching tokens:", error);
      return;
    }
    setTokensRemaining(data?.tokens_remaining || 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    toast.info("Generation feature coming soon!");
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,hsl(270_80%_65%/0.15),transparent_70%)]" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-xl bg-background/50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Artifio Logo" className="h-8 w-8" />
              <h1 className="text-2xl font-bold glow-text">Artifio.ai</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate("/pricing")}
              >
                <Coins className="h-4 w-4" />
                {tokensRemaining} tokens
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-bold">AI Playground</h2>
              <p className="text-muted-foreground">
                Create stunning content with AI-powered tools
              </p>
            </div>

            <Card className="glass-card glow-border p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-4 w-full bg-muted/50">
                  <TabsTrigger value="video" className="gap-2">
                    <Video className="h-4 w-4" />
                    Video
                  </TabsTrigger>
                  <TabsTrigger value="image" className="gap-2">
                    <Image className="h-4 w-4" />
                    Image
                  </TabsTrigger>
                  <TabsTrigger value="music" className="gap-2">
                    <Music className="h-4 w-4" />
                    Music
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </TabsTrigger>
                </TabsList>

                {["video", "image", "music", "chat"].map((tab) => (
                  <TabsContent key={tab} value={tab} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Describe what you want to create
                      </label>
                      <Textarea
                        placeholder={`Enter your ${tab} prompt...`}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[120px] bg-muted/50 resize-none"
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        This will use approximately 50 tokens
                      </p>
                      <Button
                        onClick={handleGenerate}
                        className="bg-gradient-primary hover:opacity-90"
                        disabled={tokensRemaining < 50}
                      >
                        Generate {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </Button>
                    </div>

                    {tokensRemaining < 50 && (
                      <div className="text-center p-4 bg-destructive/10 rounded-lg">
                        <p className="text-sm text-destructive">
                          Not enough tokens. Please upgrade your plan.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Playground;
