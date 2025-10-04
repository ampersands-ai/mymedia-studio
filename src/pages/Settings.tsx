import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Download, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { profileUpdateSchema } from "@/lib/validation-schemas";
import { cn } from "@/lib/utils";

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone_number: "",
    zipcode: "",
    email_verified: false,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [generations, setGenerations] = useState<any[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    document.title = "Settings - Artifio.ai";
    if (user) {
      fetchProfile();
      fetchGenerations();
      fetchSubscription();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfileData({
          full_name: data.full_name || "",
          phone_number: data.phone_number || "",
          zipcode: data.zipcode || "",
          email_verified: data.email_verified || false,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile data");
    }
  };

  const fetchGenerations = async () => {
    setLoadingGenerations(true);
    try {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setGenerations(data || []);
    } catch (error) {
      console.error("Error fetching generations:", error);
      toast.error("Failed to load generation history");
    } finally {
      setLoadingGenerations(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setLoading(true);

    try {
      // Validate inputs
      const result = profileUpdateSchema.safeParse({
        full_name: profileData.full_name,
        phoneNumber: profileData.phone_number,
        zipcode: profileData.zipcode,
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

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.full_name,
          phone_number: profileData.phone_number,
          zipcode: profileData.zipcode,
        })
        .eq("id", user?.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" aria-label="Completed" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" aria-label="Failed" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" aria-label="Pending" />;
      default:
        return <Clock className="h-4 w-4" aria-label="Processing" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-black gradient-text mb-8">Settings</h1>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your profile information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => {
                        setProfileData({ ...profileData, full_name: e.target.value });
                        setValidationErrors(prev => ({ ...prev, full_name: "" }));
                      }}
                      placeholder="John Doe"
                      aria-label="Full name"
                      className={cn(validationErrors.full_name && "border-red-500")}
                    />
                    {validationErrors.full_name && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.full_name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={profileData.phone_number}
                      onChange={(e) => {
                        setProfileData({ ...profileData, phone_number: e.target.value });
                        setValidationErrors(prev => ({ ...prev, phoneNumber: "" }));
                      }}
                      placeholder="+1234567890"
                      aria-label="Phone number"
                      className={cn(validationErrors.phoneNumber && "border-red-500")}
                    />
                    {validationErrors.phoneNumber && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.phoneNumber}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipcode">Zipcode</Label>
                    <Input
                      id="zipcode"
                      value={profileData.zipcode}
                      onChange={(e) => {
                        setProfileData({ ...profileData, zipcode: e.target.value });
                        setValidationErrors(prev => ({ ...prev, zipcode: "" }));
                      }}
                      placeholder="12345"
                      aria-label="Zipcode"
                      className={cn(validationErrors.zipcode && "border-red-500")}
                    />
                    {validationErrors.zipcode && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.zipcode}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Email Verification Status:</Label>
                    <Badge variant={profileData.email_verified ? "default" : "secondary"}>
                      {profileData.email_verified ? "Verified" : "Not Verified"}
                    </Badge>
                  </div>
                  <Button type="submit" disabled={loading} aria-label="Save profile changes">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Generation History</CardTitle>
                <CardDescription>View your recent AI generations</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingGenerations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : generations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No generations yet. Start creating to see your history!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {generations.map((gen) => (
                      <div
                        key={gen.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(gen.status)}
                            <span className="font-semibold capitalize">{gen.type}</span>
                            <Badge variant="outline" className="text-xs">
                              {gen.tokens_used} tokens
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {gen.prompt}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(gen.created_at).toLocaleString()}
                          </p>
                        </div>
                        {gen.status === "completed" && gen.output_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(gen.output_url, "_blank")}
                            aria-label="Download generation"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="pricing" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Subscription</CardTitle>
                <CardDescription>Manage your subscription and view pricing options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Current Plan:</span>
                      <Badge variant="default" className="capitalize">
                        {subscription.plan}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Tokens Remaining:</span>
                      <span className="font-bold">{subscription.tokens_remaining.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Tokens:</span>
                      <span className="text-muted-foreground">{subscription.tokens_total.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                <Link to="/pricing">
                  <Button className="w-full" aria-label="View all pricing plans">
                    View All Pricing Plans
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="account" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>View your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={user?.email || ""} disabled aria-label="Email address" />
                </div>
                <div className="space-y-2">
                  <Label>Account Created</Label>
                  <Input
                    value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                    disabled
                    aria-label="Account creation date"
                  />
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    Need to update your email or password? Contact support.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;