import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/playground");
    }
  }, [user, authLoading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/playground");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/playground`,
          },
        });
        if (error) throw error;
        toast.success("Account created! You've received 500 free tokens.");
        navigate("/playground");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      {/* Header Navigation */}
      <header className="border-b-4 border-black bg-card relative z-10">
        <nav className="container mx-auto px-4 py-3 md:py-4" aria-label="Main navigation">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-gradient-primary border-3 border-black brutal-shadow flex items-center justify-center">
                <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-white" aria-hidden="true" />
              </div>
              <h1 className="text-xl md:text-3xl font-black gradient-text">ARTIFIO.AI</h1>
            </Link>
            <div className="flex items-center gap-2 md:gap-3">
              <Button variant="ghost" onClick={() => navigate("/pricing")} className="text-sm md:text-base px-2 md:px-4">
                Pricing
              </Button>
            </div>
          </div>
        </nav>
      </header>
      
      {/* Auth Card */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-5rem)] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-black">
            {isLogin ? "WELCOME BACK" : "CREATE ACCOUNT"}
          </CardTitle>
          <CardDescription className="text-base font-medium">
            {isLogin
              ? "Sign in to continue creating"
              : "Start creating with 500 free tokens"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="font-bold">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="border-3 border-black brutal-shadow h-12 font-medium"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-3 border-black brutal-shadow h-12 font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-3 border-black brutal-shadow h-12 font-medium"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              variant="neon"
              size="lg"
              disabled={loading}
            >
              {loading ? "LOADING..." : isLogin ? "SIGN IN" : "SIGN UP"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:text-primary/80 transition-colors font-bold underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Auth;
