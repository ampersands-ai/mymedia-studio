import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import logo from "@/assets/logo.png";
import { Footer } from "@/components/Footer";

type VerificationStatus = "loading" | "success" | "error" | "expired";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setErrorMessage("No verification token provided.");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-email", {
          body: { token }
        });

        if (error) {
          throw new Error(error.message || "Verification failed");
        }

        if (data?.error) {
          if (data.error.includes("expired")) {
            setStatus("expired");
          } else {
            setStatus("error");
          }
          setErrorMessage(data.error);
          return;
        }

        setStatus("success");
        setEmail(data.email || "");
      } catch (err) {
        console.error("Verification error:", err);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to verify email");
      }
    };

    verifyToken();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      {/* Header */}
      <header className="border-b border-border bg-card relative z-10">
        <nav className="container mx-auto px-4 py-3 md:py-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img 
              src={logo} 
              alt="artifio.ai logo" 
              className="h-6 md:h-8 object-contain"
              loading="eager"
            />
            <span className="font-black text-xl md:text-2xl text-foreground">artifio.ai</span>
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {status === "loading" && (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              {status === "success" && (
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              )}
              {(status === "error" || status === "expired") && (
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              )}
            </div>
            
            <CardTitle className="text-2xl">
              {status === "loading" && "Verifying your email..."}
              {status === "success" && "Email Verified!"}
              {status === "expired" && "Link Expired"}
              {status === "error" && "Verification Failed"}
            </CardTitle>
            
            <CardDescription className="text-base mt-2">
              {status === "loading" && "Please wait while we verify your email address."}
              {status === "success" && (
                <>
                  {email && <span className="font-medium text-foreground">{email}</span>}
                  <br />
                  Your email has been verified successfully. You now have full access to all features.
                </>
              )}
              {status === "expired" && "This verification link has expired. Please request a new verification email."}
              {status === "error" && errorMessage}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex flex-col gap-3">
            {status === "success" && (
              <>
                <Button asChild className="w-full">
                  <Link to="/dashboard/custom-creation">
                    Start Creating
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/dashboard/settings">
                    Go to Settings
                  </Link>
                </Button>
              </>
            )}
            
            {status === "expired" && (
              <>
                <Button asChild className="w-full gap-2">
                  <Link to="/dashboard/settings?tab=profile">
                    <Mail className="h-4 w-4" />
                    Request New Verification Email
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/">
                    Go to Home
                  </Link>
                </Button>
              </>
            )}
            
            {status === "error" && (
              <>
                <Button asChild className="w-full">
                  <Link to="/auth">
                    Go to Login
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/">
                    Go to Home
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
