import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertCircle, Mail, CheckCircle2, Info } from "lucide-react";
import { profileUpdateSchema } from "@/lib/validation-schemas";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { toast } from "sonner";

interface ProfileData {
  full_name: string;
  phone_number: string;
  zipcode: string;
  email_verified: boolean;
}

interface ProfileSectionProps {
  profileData: ProfileData;
  setProfileData: (data: ProfileData) => void;
}

export function ProfileSection({ profileData, setProfileData }: ProfileSectionProps) {
  const { user } = useAuth();
  const { execute } = useErrorHandler();
  const [loading, setLoading] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleResendVerification = async () => {
    if (!user?.id || !user?.email) return;
    
    setSendingVerification(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          userId: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || profileData.full_name || ""
        }
      });
      
      if (error) throw error;
      
      if (data?.error) {
        if (data.retryAfter) {
          toast.error(`Please wait ${data.retryAfter} seconds before requesting another verification email.`);
        } else {
          toast.error(data.message || data.error);
        }
        return;
      }
      
      toast.success("Verification email sent! Check your inbox.");
    } catch (error) {
      logger.error('Failed to send verification email', error instanceof Error ? error : new Error(String(error)));
      toast.error("Failed to send verification email. Please try again.");
    } finally {
      setSendingVerification(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setLoading(true);

    try {
      await execute(
        async () => {
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

          // Log profile update
          try {
            await supabase.functions.invoke('audit-log', {
              body: {
                action: 'profile_updated',
                resource_type: 'profile',
                resource_id: user?.id,
                metadata: {
                  updated_fields: ['full_name', 'phone_number', 'zipcode']
                }
              }
            });
          } catch (logError) {
            logger.error('Failed to log audit event', logError instanceof Error ? logError : new Error(String(logError)), {
              component: 'ProfileSection',
              operation: 'profile_update_audit',
              userId: user?.id
            });
          }

          // Track activity
          try {
            const { clientLogger } = await import('@/lib/logging/client-logger');
            await clientLogger.activity({
              activityType: 'settings',
              activityName: 'profile_updated',
              routeName: 'Settings',
              description: 'Updated profile settings',
              metadata: {
                fields_changed: Object.keys({ full_name: profileData.full_name, phone_number: profileData.phone_number, zipcode: profileData.zipcode }),
              },
            });
          } catch (trackError) {
            logger.error('Failed to track activity', trackError instanceof Error ? trackError : new Error(String(trackError)), {
              component: 'ProfileSection',
              operation: 'profile_update_activity',
              userId: user?.id
            });
          }
        },
        {
          successMessage: "Profile updated successfully!",
          errorMessage: "Failed to update profile",
          context: {
            component: 'ProfileSection',
            operation: 'handleUpdateProfile',
            userId: user?.id
          }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Manage your personal information and verification status</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={profileData.full_name?.split(' ')[0] || ''}
                onChange={(e) => {
                  const lastName = profileData.full_name?.split(' ').slice(1).join(' ') || '';
                  setProfileData({ ...profileData, full_name: `${e.target.value} ${lastName}`.trim() });
                  setValidationErrors(prev => ({ ...prev, full_name: "" }));
                }}
                placeholder="John"
                aria-label="First name"
                className={cn(validationErrors.full_name && "border-red-500")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={profileData.full_name?.split(' ').slice(1).join(' ') || ''}
                onChange={(e) => {
                  const firstName = profileData.full_name?.split(' ')[0] || '';
                  setProfileData({ ...profileData, full_name: `${firstName} ${e.target.value}`.trim() });
                  setValidationErrors(prev => ({ ...prev, full_name: "" }));
                }}
                placeholder="Doe"
                aria-label="Last name"
                className={cn(validationErrors.full_name && "border-red-500")}
              />
            </div>
          </div>
          {validationErrors.full_name && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {validationErrors.full_name}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                aria-label="Email address"
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
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

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label>Email Verification:</Label>
              <Badge variant={profileData.email_verified ? "default" : "destructive"}>
                {profileData.email_verified ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Not Verified
                  </span>
                )}
              </Badge>
            </div>
            
            {!profileData.email_verified && (
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <Info className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-sm">
                  <p className="font-medium text-foreground mb-2">Your email is not verified</p>
                  <p className="text-muted-foreground mb-3">
                    Please verify your email address to unlock all features and ensure account security.
                  </p>
                  <div className="space-y-2 text-muted-foreground">
                    <p className="font-medium text-foreground">How to verify:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Check your inbox for <span className="font-medium text-foreground">{user?.email}</span></li>
                      <li>Look for an email from <span className="font-medium text-foreground">Artifio</span> with subject "Confirm your email"</li>
                      <li>Click the verification link in the email</li>
                      <li>Check your spam/junk folder if you don't see it</li>
                    </ol>
                  </div>
                  <div className="mt-4">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={sendingVerification}
                      className="gap-2"
                    >
                      {sendingVerification ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Resend Verification Email
                        </>
                      )}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
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
  );
}
