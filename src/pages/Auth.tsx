import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { AlertCircle, Info, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { signupSchema, loginSchema } from "@/lib/validation-schemas";
import { Footer } from "@/components/Footer";
import logo from "@/assets/logo.png";
import { logger } from "@/lib/logger";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { isDisposableEmail, getCanonicalEmail } from "@/lib/email-validation";
import { TurnstileWidget, TurnstileWidgetRef } from "@/components/auth/TurnstileWidget";
import { useUtmCapture, getStoredUtmParams, clearStoredUtmParams } from "@/hooks/useUtmCapture";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { execute } = useErrorHandler();
  const [isLogin, setIsLogin] = useState(() => searchParams.get('mode') !== 'signup');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  
  // Capture UTM params on page load for acquisition tracking
  useUtmCapture();

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileError(null);
  }, []);

  const handleTurnstileError = useCallback((error: string) => {
    setTurnstileToken(null);
    setTurnstileError(error);
    // Try to reset the widget for the user
    turnstileRef.current?.reset();
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileError("Security check expired. Please verify again.");
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard/custom-creation");
    }
  }, [user, authLoading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setLoading(true);

    try {
      await execute(
        async () => {
      // Validate inputs
      if (isLogin) {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          const errors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              errors[err.path[0].toString()] = err.message;
            }
          });
          setValidationErrors(errors);
          setLoading(false);
          return;
        }
      } else {
        const result = signupSchema.safeParse({
          email,
          password,
          confirmPassword,
        });
        if (!result.success) {
          const errors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              errors[err.path[0].toString()] = err.message;
            }
          });
          setValidationErrors(errors);
          setLoading(false);
          return;
        }
      }

      // Verify Turnstile token first
      if (!turnstileToken) {
        throw new Error("Please complete the security verification.");
      }

      // Verify Turnstile server-side
      const { data: turnstileData, error: turnstileVerifyError } = await supabase.functions.invoke(
        'verify-turnstile',
        { body: { token: turnstileToken } }
      );

      if (turnstileVerifyError || !turnstileData?.success) {
        setTurnstileToken(null); // Reset token to force re-verification
        setTurnstileError("Security check expired. We've refreshed it - please try again.");
        turnstileRef.current?.reset();
        throw new Error("Security check expired. We've refreshed it - please try again.");
      }

      // Check rate limiting
      const { data: rateLimitData, error: rateLimitError } = await supabase.functions.invoke(
        'rate-limiter',
        {
          body: { 
            identifier: email.toLowerCase(), 
            action: isLogin ? 'login' : 'signup' 
          },
        }
      );

      if (rateLimitError || !rateLimitData?.allowed) {
        const waitTime = rateLimitData?.retryAfter ? Math.ceil(rateLimitData.retryAfter / 60) : 15;
        throw new Error(`Too many attempts. Please wait ${waitTime} minutes before trying again.`);
      }

      if (isLogin) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          // Log failed login attempt
          try {
            await supabase.functions.invoke('audit-log', {
              body: { 
                action: 'login_failed',
                metadata: { email: email.toLowerCase(), reason: 'invalid_credentials' }
              }
            });
          } catch (logError) {
            logger.error('Failed to log audit event', logError instanceof Error ? logError : new Error(String(logError)), {
              component: 'Auth',
              operation: 'login_failed_audit',
              email: email.toLowerCase()
            });
          }
          // Generic error message to prevent user enumeration
          throw new Error("Invalid credentials. Please check your email and password.");
        }
        
        // Create session record
        if (authData.session) {
          try {
            await supabase.functions.invoke('session-manager', {
              body: { action: 'create' }
            });
          } catch (sessionError) {
            logger.error('Failed to create session record', sessionError instanceof Error ? sessionError : new Error(String(sessionError)), {
              component: 'Auth',
              operation: 'create_session',
              userId: authData.session?.user.id
            });
          }
        }
        
        // Log successful login
        try {
          await supabase.functions.invoke('audit-log', {
            body: { 
              action: 'login_success',
              metadata: { email: email.toLowerCase() }
            }
          });
        } catch (logError) {
          logger.error('Failed to log audit event', logError instanceof Error ? logError : new Error(String(logError)), {
            component: 'Auth',
            operation: 'login_success_audit',
            email: email.toLowerCase()
          });
        }
        
        navigate("/dashboard/custom-creation");
      } else {
        // Check for disposable/temporary email addresses
        if (isDisposableEmail(email)) {
          throw new Error("Temporary or disposable email addresses are not allowed. Please use a permanent email address.");
        }

        // Check for duplicate Gmail accounts (with dot trick)
        const canonicalEmail = getCanonicalEmail(email);
        const { data: duplicateCheck, error: duplicateError } = await supabase.functions.invoke(
          'check-email-duplicate',
          { body: { email, canonicalEmail } }
        );
        
        if (!duplicateError && duplicateCheck?.isDuplicate) {
          throw new Error("An account with this email already exists. Gmail ignores dots in addresses, so try logging in instead.");
        }

        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              canonical_email: canonicalEmail,
              marketing_consent: marketingConsent,
            },
            emailRedirectTo: `${window.location.origin}/dashboard/custom-creation`,
          },
        });
        if (error) {
          // Log failed signup attempt
          try {
            await supabase.functions.invoke('audit-log', {
              body: { 
                action: 'signup_failed',
                metadata: { email: email.toLowerCase(), reason: error.message }
              }
            });
          } catch (logError) {
            logger.error('Failed to log audit event', logError instanceof Error ? logError : new Error(String(logError)), {
              component: 'Auth',
              operation: 'signup_failed_audit',
              email: email.toLowerCase()
            });
          }
          // Provide helpful error messages for common signup issues
          if (error.message?.includes('already registered') || error.status === 422) {
            throw new Error("This email is already registered. Click 'Already have an account? Sign in' below to log in, or use 'Forgot password?' if needed.");
          }
          if (error.message?.includes('invalid') || error.message?.includes('email')) {
            throw new Error("Please enter a valid email address.");
          }
          if (error.message?.includes('password')) {
            throw new Error("Password doesn't meet requirements. Please check the password requirements below.");
          }
          throw new Error("We couldn't create your account. Please check your information and try again. If the problem persists, contact support@artifio.ai");
        }
        
        // Log successful signup
        if (data.user) {
          const userId = data.user.id;
          const userEmail = data.user.email;
          
          try {
            await supabase.functions.invoke('audit-log', {
              body: { 
                action: 'signup_success',
                metadata: { 
                  email: email.toLowerCase()
                }
              }
            });
          } catch (logError) {
            logger.error('Failed to log audit event', logError instanceof Error ? logError : new Error(String(logError)), {
              component: 'Auth',
              operation: 'signup_success_audit',
              email: email.toLowerCase(),
              userId
            });
          }

          // Fire-and-forget: Send welcome email (non-blocking)
          supabase.functions.invoke('send-welcome-email', {
            body: {
              userId,
              email: userEmail,
            }
          }).catch((emailError) => {
            logger.error('Failed to send welcome email', emailError instanceof Error ? emailError : new Error(String(emailError)), {
              component: 'Auth',
              operation: 'send_welcome_email',
              userId,
              email: userEmail
            });
          });

          // Fire-and-forget: Send verification email (non-blocking)
          supabase.functions.invoke('send-verification-email', {
            body: {
              userId,
              email: userEmail,
            }
          }).catch((verifyError) => {
            logger.error('Failed to send verification email', verifyError instanceof Error ? verifyError : new Error(String(verifyError)), {
              component: 'Auth',
              operation: 'send_verification_email',
              userId,
              email: userEmail
            });
          });

          // Fire-and-forget: Save UTM attribution (non-blocking)
          const utmParams = getStoredUtmParams();
          supabase.functions.invoke('save-signup-attribution', {
            body: {
              ...utmParams,
              signup_method: 'email',
            }
          }).then(() => {
            clearStoredUtmParams();
          }).catch((attrError) => {
            logger.error('Failed to save attribution', attrError instanceof Error ? attrError : new Error(String(attrError)), {
              component: 'Auth',
              operation: 'save_attribution',
              userId
            });
          });

          // Note: Admin notification is handled by database trigger (handle_new_user)
          // to avoid duplicate emails
        }
        
        toast.success("Account created! Check your email to verify your account.");
        // Don't navigate here - let the auth state change in useEffect handle redirect
        // This prevents race conditions with session establishment
      }
        },
        {
          showSuccessToast: false,
          showErrorToast: true,
          context: {
            component: 'Auth',
            operation: isLogin ? 'login' : 'signup',
            email: email.toLowerCase()
          }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    await execute(
      async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/dashboard/custom-creation`,
          },
        });
        if (error) throw error;
      },
      {
        showSuccessToast: false,
        errorMessage: "Social authentication failed",
        context: {
          component: 'Auth',
          operation: 'social_auth',
          provider
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      {/* Header Navigation */}
      <header className="border-b-4 border-black bg-card relative z-10">
        <nav className="container mx-auto px-4 py-3 md:py-4" aria-label="Main navigation">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img 
                src={logo} 
                alt="artifio.ai logo" 
                className="h-6 md:h-8 object-contain"
                loading="eager"
              />
              <span className="font-black text-xl md:text-2xl text-foreground">artifio.ai</span>
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
              : "Start with 5 free credits + 2 bonus credits when you verify your email and complete your profile"}
          </CardDescription>
          {!isLogin && (
            <p className="text-xs text-muted-foreground mt-2">
              🔒 We don't sell your data. No spam, absolutely.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {/* Social Auth Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full border-3 border-black brutal-shadow h-12 font-bold"
              onClick={() => handleSocialAuth('google')}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t-2 border-black" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-foreground/60 font-bold">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="email" className="font-bold">Email</Label>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger type="button" tabIndex={-1}>
                          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center" collisionPadding={16}>
                          <p>Email verification required after signup</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setValidationErrors(prev => ({ ...prev, email: "" }));
                    }}
                    required
                    className={cn(
                      "border-3 border-black brutal-shadow h-12 font-medium",
                      validationErrors.email && "border-red-500"
                    )}
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="password" className="font-bold">Password</Label>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger type="button" tabIndex={-1}>
                          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center" collisionPadding={16} className="max-w-[280px]">
                          <p className="font-semibold mb-1">Password requirements:</p>
                          <ul className="text-xs space-y-0.5 list-disc list-inside">
                            <li>At least 8 characters</li>
                            <li>One uppercase letter (A-Z)</li>
                            <li>One lowercase letter (a-z)</li>
                            <li>One number (0-9)</li>
                            <li>One special character (!@#$...)</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setValidationErrors(prev => ({ ...prev, password: "", confirmPassword: "" }));
                      }}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      required
                      className={cn(
                        "border-3 border-black brutal-shadow h-12 font-medium pr-10",
                        validationErrors.password && "border-red-500"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.password}
                    </p>
                  )}
                  <PasswordRequirements 
                    password={password} 
                    show={passwordFocused || password.length > 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-bold">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setValidationErrors(prev => ({ ...prev, confirmPassword: "" }));
                      }}
                      required
                      className={cn(
                        "border-3 border-black brutal-shadow h-12 font-medium pr-10",
                        validationErrors.confirmPassword && "border-red-500"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.confirmPassword}
                    </p>
                  )}
                </div>
                
                {/* Marketing Consent Checkbox */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="marketingConsent"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-2 border-black"
                  />
                  <label htmlFor="marketingConsent" className="text-sm text-muted-foreground">
                    Send me product updates and tips
                  </label>
                </div>
              </>
            )}
            {isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setValidationErrors(prev => ({ ...prev, email: "" }));
                    }}
                    required
                    className={cn(
                      "border-3 border-black brutal-shadow h-12 font-medium",
                      validationErrors.email && "border-red-500"
                    )}
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-bold">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setValidationErrors(prev => ({ ...prev, password: "" }));
                      }}
                      required
                      className={cn(
                        "border-3 border-black brutal-shadow h-12 font-medium pr-10",
                        validationErrors.password && "border-red-500"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.password}
                    </p>
                  )}
                  <div className="text-right">
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>
              </>
            )}
            
            {/* Turnstile CAPTCHA */}
            <div className="my-4">
              <TurnstileWidget
                ref={turnstileRef}
                onVerify={handleTurnstileVerify}
                onError={handleTurnstileError}
                onExpire={handleTurnstileExpire}
              />
              {turnstileError && (
                <p className="text-sm text-red-600 flex items-center gap-1 mt-2 justify-center">
                  <AlertCircle className="h-3 w-3" />
                  {turnstileError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              variant="neon"
              size="lg"
              disabled={loading || !turnstileToken}
            >
              {loading ? "LOADING..." : isLogin ? "SIGN IN" : "SIGN UP"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-foreground hover:text-foreground/70 transition-colors font-bold underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
