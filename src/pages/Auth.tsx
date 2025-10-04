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
import { Sparkles, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";


const countries = [
  { value: "united-states", label: "United States" },
  { value: "canada", label: "Canada" },
  { value: "united-kingdom", label: "United Kingdom" },
  { value: "australia", label: "Australia" },
  { value: "germany", label: "Germany" },
  { value: "france", label: "France" },
  { value: "spain", label: "Spain" },
  { value: "italy", label: "Italy" },
  { value: "japan", label: "Japan" },
  { value: "china", label: "China" },
  { value: "india", label: "India" },
  { value: "brazil", label: "Brazil" },
  { value: "mexico", label: "Mexico" },
  { value: "south-korea", label: "South Korea" },
  { value: "netherlands", label: "Netherlands" },
  { value: "sweden", label: "Sweden" },
  { value: "switzerland", label: "Switzerland" },
  { value: "belgium", label: "Belgium" },
  { value: "norway", label: "Norway" },
  { value: "denmark", label: "Denmark" },
  { value: "finland", label: "Finland" },
  { value: "poland", label: "Poland" },
  { value: "portugal", label: "Portugal" },
  { value: "greece", label: "Greece" },
  { value: "austria", label: "Austria" },
  { value: "ireland", label: "Ireland" },
  { value: "new-zealand", label: "New Zealand" },
  { value: "singapore", label: "Singapore" },
  { value: "hong-kong", label: "Hong Kong" },
  { value: "south-africa", label: "South Africa" },
  { value: "russia", label: "Russia" },
  { value: "turkey", label: "Turkey" },
  { value: "argentina", label: "Argentina" },
  { value: "chile", label: "Chile" },
  { value: "colombia", label: "Colombia" },
  { value: "egypt", label: "Egypt" },
  { value: "israel", label: "Israel" },
  { value: "thailand", label: "Thailand" },
  { value: "malaysia", label: "Malaysia" },
  { value: "indonesia", label: "Indonesia" },
  { value: "philippines", label: "Philippines" },
  { value: "vietnam", label: "Vietnam" },
  { value: "pakistan", label: "Pakistan" },
  { value: "bangladesh", label: "Bangladesh" },
  { value: "nigeria", label: "Nigeria" },
  { value: "kenya", label: "Kenya" },
  { value: "uae", label: "United Arab Emirates" },
  { value: "saudi-arabia", label: "Saudi Arabia" },
];

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [zipcode, setZipcode] = useState("");
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
              full_name: `${firstName} ${lastName}`.trim(),
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber || null,
              country: country ? countries.find(c => c.value === country)?.label : null,
              zipcode: zipcode || null,
            },
            emailRedirectTo: `${window.location.origin}/playground`,
          },
        });
        if (error) throw error;
        
        // Check if user provided all optional fields
        const hasAllFields = phoneNumber && country && zipcode;
        if (hasAllFields) {
          toast.success("Account created! You've received 500 free tokens. Verify your email for 100 bonus tokens!");
        } else {
          toast.success("Account created! You've received 500 free tokens. Complete your profile & verify email for 100 bonus tokens!");
        }
        navigate("/playground");
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
          redirectTo: `${window.location.origin}/playground`,
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
                      onChange={(e) => setFirstName(e.target.value)}
                      required={!isLogin}
                      className="border-3 border-black brutal-shadow h-12 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-bold">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required={!isLogin}
                      className="border-3 border-black brutal-shadow h-12 font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="font-bold">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="border-3 border-black brutal-shadow h-12 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="font-bold">Country</Label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-full justify-between border-3 border-black brutal-shadow h-12 font-medium"
                      >
                        {country
                          ? countries.find((c) => c.value === country)?.label
                          : "Select country..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-background z-50" align="start">
                      <Command className="bg-background">
                        <CommandInput placeholder="Search country..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {countries.map((c) => (
                              <CommandItem
                                key={c.value}
                                value={c.value}
                                onSelect={(currentValue) => {
                                  setCountry(currentValue === country ? "" : currentValue);
                                  setCountryOpen(false);
                                }}
                              >
                                {c.label}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    country === c.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipcode" className="font-bold">Zipcode</Label>
                  <Input
                    id="zipcode"
                    type="text"
                    placeholder="12345"
                    value={zipcode}
                    onChange={(e) => setZipcode(e.target.value)}
                    className="border-3 border-black brutal-shadow h-12 font-medium"
                  />
                </div>
              </>
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
