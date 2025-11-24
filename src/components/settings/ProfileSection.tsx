import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertCircle } from "lucide-react";
import { profileUpdateSchema } from "@/lib/validation-schemas";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { useErrorHandler } from "@/hooks/useErrorHandler";

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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

          <div className="flex items-center gap-2">
            <Label>Verification Status:</Label>
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
  );
}
