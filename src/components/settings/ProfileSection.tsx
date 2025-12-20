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
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { toast } from "sonner";
import { z } from "zod";

// Profile name validation schema
const profileNameSchema = z
  .string()
  .trim()
  .min(3, { message: "Profile name must be at least 3 characters" })
  .max(20, { message: "Profile name must be less than 20 characters" })
  .regex(/^[a-zA-Z0-9_]+$/, { 
    message: "Profile name can only contain letters, numbers, and underscores" 
  });

interface ProfileData {
  profile_name: string;
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
          profileName: profileData.profile_name || ""
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
          // Validate profile name
          const result = profileNameSchema.safeParse(profileData.profile_name);

          if (!result.success) {
            const errors: Record<string, string> = {};
            result.error.errors.forEach((err) => {
              errors['profile_name'] = err.message;
            });
            setValidationErrors(errors);
            setLoading(false);
            return;
          }

          const { error } = await supabase
            .from("profiles")
            .update({
              profile_name: profileData.profile_name,
            })
            .eq("id", user?.id);

          if (error) {
            // Handle unique constraint violation
            if (error.code === '23505') {
              setValidationErrors({ profile_name: "This profile name is already taken" });
              setLoading(false);
              return;
            }
            throw error;
          }

          // Log profile update
          try {
            await supabase.functions.invoke('audit-log', {
              body: {
                action: 'profile_updated',
                resource_type: 'profile',
                resource_id: user?.id,
                metadata: {
                  updated_fields: ['profile_name']
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
                fields_changed: ['profile_name'],
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
        <CardDescription>Manage your profile name and verification status</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile_name">Profile Name</Label>
            <Input
              id="profile_name"
              value={profileData.profile_name || ''}
              onChange={(e) => {
                setProfileData({ ...profileData, profile_name: e.target.value });
                setValidationErrors(prev => ({ ...prev, profile_name: "" }));
              }}
              placeholder="Creator_XXXXX"
              aria-label="Profile name"
              className={cn(validationErrors.profile_name && "border-red-500")}
            />
            {validationErrors.profile_name && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.profile_name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              This is your public display name. Use letters, numbers, and underscores only.
            </p>
          </div>

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