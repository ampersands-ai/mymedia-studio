import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { signupSchema, loginSchema } from "@/lib/validation-schemas";
import { Footer } from "@/components/Footer";
import logo from "@/assets/logo.png";


const countryCodes = [
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+1", country: "Canada", flag: "🇨🇦" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
  { code: "+32", country: "Belgium", flag: "🇧🇪" },
  { code: "+47", country: "Norway", flag: "🇳🇴" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" },
  { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+48", country: "Poland", flag: "🇵🇱" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+30", country: "Greece", flag: "🇬🇷" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+972", country: "Israel", flag: "🇮🇱" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+971", country: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+962", country: "Jordan", flag: "🇯🇴" },
  { code: "+961", country: "Lebanon", flag: "🇱🇧" },
  { code: "+212", country: "Morocco", flag: "🇲🇦" },
  { code: "+216", country: "Tunisia", flag: "🇹🇳" },
  { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+255", country: "Tanzania", flag: "🇹🇿" },
  { code: "+256", country: "Uganda", flag: "🇺🇬" },
  { code: "+260", country: "Zambia", flag: "🇿🇲" },
  { code: "+263", country: "Zimbabwe", flag: "🇿🇼" },
  { code: "+591", country: "Bolivia", flag: "🇧🇴" },
  { code: "+593", country: "Ecuador", flag: "🇪🇨" },
  { code: "+595", country: "Paraguay", flag: "🇵🇾" },
  { code: "+598", country: "Uruguay", flag: "🇺🇾" },
  { code: "+51", country: "Peru", flag: "🇵🇪" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+420", country: "Czech Republic", flag: "🇨🇿" },
  { code: "+36", country: "Hungary", flag: "🇭🇺" },
  { code: "+40", country: "Romania", flag: "🇷🇴" },
  { code: "+421", country: "Slovakia", flag: "🇸🇰" },
  { code: "+359", country: "Bulgaria", flag: "🇧🇬" },
  { code: "+385", country: "Croatia", flag: "🇭🇷" },
  { code: "+386", country: "Slovenia", flag: "🇸🇮" },
  { code: "+370", country: "Lithuania", flag: "🇱🇹" },
  { code: "+371", country: "Latvia", flag: "🇱🇻" },
  { code: "+372", country: "Estonia", flag: "🇪🇪" },
  { code: "+354", country: "Iceland", flag: "🇮🇸" },
  { code: "+377", country: "Monaco", flag: "🇲🇨" },
  { code: "+356", country: "Malta", flag: "🇲🇹" },
  { code: "+357", country: "Cyprus", flag: "🇨🇾" },
  { code: "+382", country: "Montenegro", flag: "🇲🇪" },
  { code: "+381", country: "Serbia", flag: "🇷🇸" },
  { code: "+387", country: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "+389", country: "North Macedonia", flag: "🇲🇰" },
  { code: "+355", country: "Albania", flag: "🇦🇱" },
  { code: "+995", country: "Georgia", flag: "🇬🇪" },
  { code: "+374", country: "Armenia", flag: "🇦🇲" },
  { code: "+994", country: "Azerbaijan", flag: "🇦🇿" },
  { code: "+375", country: "Belarus", flag: "🇧🇾" },
  { code: "+380", country: "Ukraine", flag: "🇺🇦" },
  { code: "+373", country: "Moldova", flag: "🇲🇩" },
  { code: "+996", country: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "+998", country: "Uzbekistan", flag: "🇺🇿" },
  { code: "+7", country: "Kazakhstan", flag: "🇰🇿" },
  { code: "+993", country: "Turkmenistan", flag: "🇹🇲" },
  { code: "+992", country: "Tajikistan", flag: "🇹🇯" },
  { code: "+976", country: "Mongolia", flag: "🇲🇳" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+95", country: "Myanmar", flag: "🇲🇲" },
  { code: "+855", country: "Cambodia", flag: "🇰🇭" },
  { code: "+856", country: "Laos", flag: "🇱🇦" },
  { code: "+673", country: "Brunei", flag: "🇧🇳" },
  { code: "+670", country: "Timor-Leste", flag: "🇹🇱" },
  { code: "+960", country: "Maldives", flag: "🇲🇻" },
  { code: "+975", country: "Bhutan", flag: "🇧🇹" },
  { code: "+93", country: "Afghanistan", flag: "🇦🇫" },
  { code: "+98", country: "Iran", flag: "🇮🇷" },
  { code: "+964", country: "Iraq", flag: "🇮🇶" },
  { code: "+963", country: "Syria", flag: "🇸🇾" },
  { code: "+967", country: "Yemen", flag: "🇾🇪" },
];

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
          firstName,
          lastName,
          phoneNumber: phoneNumber ? `${countryCode}${phoneNumber}` : "",
          zipcode,
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
        throw new Error(rateLimitData?.error || 'Too many attempts. Please try again later.');
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
            console.error('Failed to log audit event:', logError);
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
            console.error('Failed to create session record:', sessionError);
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
          console.error('Failed to log audit event:', logError);
        }
        
        toast.success("Welcome back!");
        navigate("/dashboard/custom-creation");
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: `${firstName} ${lastName}`.trim(),
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber ? `${countryCode}${phoneNumber}` : null,
              zipcode: zipcode || null,
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
            console.error('Failed to log audit event:', logError);
          }
          // Generic error message to prevent user enumeration
          throw new Error("Unable to create account. Please try a different email.");
        }
        
        // Log successful signup
        if (data.user) {
          try {
            await supabase.functions.invoke('audit-log', {
              body: { 
                action: 'signup_success',
                metadata: { 
                  email: email.toLowerCase(),
                  has_phone: !!phoneNumber,
                  has_zipcode: !!zipcode
                }
              }
            });
          } catch (logError) {
            console.error('Failed to log audit event:', logError);
          }
        }
        
        const hasAllFields = phoneNumber && zipcode;
        if (hasAllFields) {
          toast.success("Account created! You've received 500 free tokens. Email auto-confirmed!");
        } else {
          toast.success("Account created! You've received 500 free tokens. Complete your profile for 100 bonus tokens!");
        }
        navigate("/dashboard/custom-creation");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard/custom-creation`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
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
              : "Start with 500 free tokens + 100 bonus tokens when you verify your email and complete your profile"}
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
            <Button
              type="button"
              variant="outline"
              className="w-full border-3 border-black brutal-shadow h-12 font-bold"
              onClick={() => handleSocialAuth('apple')}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-bold">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setValidationErrors(prev => ({ ...prev, firstName: "" }));
                      }}
                      required={!isLogin}
                      className={cn(
                        "border-3 border-black brutal-shadow h-12 font-medium",
                        validationErrors.firstName && "border-red-500"
                      )}
                    />
                    {validationErrors.firstName && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.firstName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-bold">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setValidationErrors(prev => ({ ...prev, lastName: "" }));
                      }}
                      required={!isLogin}
                      className={cn(
                        "border-3 border-black brutal-shadow h-12 font-medium",
                        validationErrors.lastName && "border-red-500"
                      )}
                    />
                    {validationErrors.lastName && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>
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
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setValidationErrors(prev => ({ ...prev, password: "" }));
                    }}
                    required
                    className={cn(
                      "border-3 border-black brutal-shadow h-12 font-medium",
                      validationErrors.password && "border-red-500"
                    )}
                  />
                  {validationErrors.password && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.password}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="font-bold">Phone Number</Label>
                  <div className="flex gap-2">
                    <Popover open={countryCodeOpen} onOpenChange={setCountryCodeOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={countryCodeOpen}
                          className="w-[140px] justify-between border-3 border-black brutal-shadow h-12 font-medium"
                        >
                          <span className="truncate">
                            {countryCodes.find((c) => c.code === countryCode)?.flag} {countryCode}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0 bg-background z-50" align="start">
                        <Command className="bg-background">
                          <CommandInput placeholder="Search country..." className="h-9" />
                          <CommandList>
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                              {countryCodes.map((c, idx) => (
                                <CommandItem
                                  key={`${c.code}-${c.country}-${idx}`}
                                  value={`${c.country} ${c.code}`}
                                  onSelect={() => {
                                    setCountryCode(c.code);
                                    setCountryCodeOpen(false);
                                  }}
                                >
                                  <span className="mr-2">{c.flag}</span>
                                  {c.country} ({c.code})
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      countryCode === c.code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="234 567 8900"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setValidationErrors(prev => ({ ...prev, phoneNumber: "" }));
                      }}
                      className={cn(
                        "flex-1 border-3 border-black brutal-shadow h-12 font-medium",
                        validationErrors.phoneNumber && "border-red-500"
                      )}
                    />
                  </div>
                  {validationErrors.phoneNumber && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.phoneNumber}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipcode" className="font-bold">Zipcode</Label>
                  <Input
                    id="zipcode"
                    type="text"
                    placeholder="12345"
                    value={zipcode}
                    onChange={(e) => {
                      setZipcode(e.target.value);
                      setValidationErrors(prev => ({ ...prev, zipcode: "" }));
                    }}
                    className={cn(
                      "border-3 border-black brutal-shadow h-12 font-medium",
                      validationErrors.zipcode && "border-red-500"
                    )}
                  />
                  {validationErrors.zipcode && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.zipcode}
                    </p>
                  )}
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
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setValidationErrors(prev => ({ ...prev, password: "" }));
                    }}
                    required
                    className={cn(
                      "border-3 border-black brutal-shadow h-12 font-medium",
                      validationErrors.password && "border-red-500"
                    )}
                  />
                  {validationErrors.password && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.password}
                    </p>
                  )}
                </div>
              </>
            )}
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
