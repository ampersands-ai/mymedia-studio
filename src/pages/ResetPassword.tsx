import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { Footer } from "@/components/Footer";
import logo from "@/assets/logo.png";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { token, newPassword: password }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        setStatus("error");
        setErrorMessage(data.error);
        return;
      }

      setStatus("success");
      toast.success("Password reset successfully!");
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (error) {
      console.error("Password reset error:", error);
      setStatus("error");
      setErrorMessage("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (status === "success") {
      return (
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold">Password Reset Successful!</h2>
          <p className="text-muted-foreground">
            Your password has been updated. Redirecting to login...
          </p>
          <Link to="/auth">
            <Button className="w-full">Go to Login</Button>
          </Link>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Reset Failed</h2>
          <p className="text-muted-foreground">{errorMessage}</p>
          <div className="space-y-2">
            <Link to="/forgot-password">
              <Button className="w-full">Request New Reset Link</Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
        </div>
        
        <p className="text-xs text-muted-foreground">
          Password must be at least 8 characters long.
        </p>
        
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
        
        <Link to="/auth">
          <Button variant="ghost" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </Link>
      </form>
    );
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
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-4rem-200px)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {status === "idle" && (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Reset your password</CardTitle>
                <CardDescription>
                  Enter your new password below.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default ResetPassword;
