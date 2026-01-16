import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import { Footer } from "@/components/Footer";
import logo from "@/assets/logo.png";
import { logger } from "@/lib/logger";

const forgotPasswordLogger = logger.child({ component: 'ForgotPassword' });

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset-email', {
        body: { email }
      });

      if (error) {
        throw error;
      }

      if (data?.error === "Rate limited") {
        setCooldown(data.retryAfter || 60);
        const interval = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        toast.error(data.message);
        return;
      }

      // Always show success - prevents email enumeration attacks
      setSent(true);
      toast.success("If an account exists with this email, we've sent reset instructions");
    } catch (error) {
      forgotPasswordLogger.error("Password reset request failed", error instanceof Error ? error : new Error(String(error)), {
        operation: 'handleSubmit'
      });
      toast.error("Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Artifio" className="h-8 w-8" />
            <span className="font-bold text-xl">artifio.ai</span>
          </Link>
          <Link 
            to="/auth" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-4rem-200px)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {sent ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <Mail className="h-6 w-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {sent ? "Check your email" : "Forgot password?"}
            </CardTitle>
            <CardDescription>
              {sent 
                ? "If an account exists with that email, we've sent password reset instructions."
                : "Enter your email and we'll send you instructions to reset your password."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Didn't receive the email? Check your spam folder or{" "}
                  <button 
                    onClick={() => setSent(false)} 
                    className="text-primary hover:underline"
                  >
                    try again
                  </button>
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  If you don't have an account yet,{" "}
                  <Link to="/auth?mode=signup" className="text-primary hover:underline">
                    sign up here
                  </Link>
                </p>
                <Link to="/auth">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading || cooldown > 0}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || cooldown > 0}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : cooldown > 0 ? (
                    `Wait ${cooldown}s`
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                
                <Link to="/auth">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default ForgotPassword;
