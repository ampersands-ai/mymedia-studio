import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Video, Image, Music, MessageSquare, Coins, LogOut, Sparkles } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b-4 border-black bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary border-3 border-black brutal-shadow flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-black gradient-text">ARTIFIO.AI</h1>
            </Link>
            <div className="flex items-center gap-4">
              <div className="brutal-card-sm px-4 py-2 bg-neon-yellow">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  <span className="font-black">{tokensRemaining} tokens</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-5xl font-black">AI PLAYGROUND</h2>
              <p className="text-xl text-foreground/80 font-medium">
                Create stunning content with AI-powered tools
              </p>
            </div>

            <Card className="p-8">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-4 w-full bg-muted h-14">
                  <TabsTrigger value="video" className="gap-2 font-bold data-[state=active]:bg-neon-blue data-[state=active]:text-white">
                    <Video className="h-5 w-5" />
                    VIDEO
                  </TabsTrigger>
                  <TabsTrigger value="image" className="gap-2 font-bold data-[state=active]:bg-neon-pink data-[state=active]:text-white">
                    <Image className="h-5 w-5" />
                    IMAGE
                  </TabsTrigger>
                  <TabsTrigger value="music" className="gap-2 font-bold data-[state=active]:bg-neon-yellow data-[state=active]:text-black">
                    <Music className="h-5 w-5" />
                    MUSIC
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="gap-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                    <MessageSquare className="h-5 w-5" />
                    CHAT
                  </TabsTrigger>
                </TabsList>

                {["video", "image", "music", "chat"].map((tab) => (
                  <TabsContent key={tab} value={tab} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-black">
                        DESCRIBE WHAT YOU WANT TO CREATE
                      </label>
                      <Textarea
                        placeholder={`Enter your ${tab} prompt...`}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[150px] border-3 border-black brutal-shadow resize-none font-medium text-base"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <p className="text-sm text-foreground/80 font-bold">
                        ⚡ This will use approximately 50 tokens
                      </p>
                      <Button
                        onClick={handleGenerate}
                        variant={tab === "video" ? "blue" : tab === "image" ? "pink" : tab === "music" ? "neon" : "default"}
                        size="lg"
                        disabled={tokensRemaining < 50}
                      >
                        GENERATE {tab.toUpperCase()}
                      </Button>
                    </div>

                    {tokensRemaining < 50 && (
                      <div className="text-center p-6 bg-destructive/10 rounded-xl border-3 border-destructive">
                        <p className="text-sm text-destructive font-black">
                          ⚠️ NOT ENOUGH TOKENS. PLEASE UPGRADE YOUR PLAN.
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
