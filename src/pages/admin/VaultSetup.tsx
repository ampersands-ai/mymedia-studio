import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Shield, Lock, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VaultSetup() {
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const { toast } = useToast();
  const [anonKey, setAnonKey] = useState("");
  const [isStoring, setIsStoring] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleStoreSecret = async () => {
    if (!anonKey.trim()) {
      toast({
        title: "Missing anon key",
        description: "Please paste the new anon key",
        variant: "destructive",
      });
      return;
    }

    if (!anonKey.startsWith("eyJ")) {
      toast({
        title: "Invalid format",
        description: "The anon key must be a valid JWT token (starts with 'eyJ')",
        variant: "destructive",
      });
      return;
    }

    setIsStoring(true);

    try {
      const { data, error } = await supabase.functions.invoke("store-vault-secret", {
        body: {
          secret_value: anonKey.trim(),
          secret_name: "supabase_anon_key"
        }
      });

      if (error) throw error;

      if (data.success) {
        setSuccess(true);
        setAnonKey("");
        toast({
          title: "Success!",
          description: "Anon key securely stored in encrypted vault",
        });
      } else {
        throw new Error(data.error || "Failed to store secret");
      }
    } catch (error) {
      console.error("Error storing secret:", error);
      toast({
        title: "Failed to store secret",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsStoring(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Admin access required to manage vault secrets
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          JWT Token Security Setup
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete the JWT token rotation by storing the new anon key in encrypted vault
        </p>
      </div>

      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900 dark:text-green-100">
            ✅ JWT token successfully rotated and stored in vault! Your cron jobs will now use the secure helper function.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Step 1: Rotate Token */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                1
              </div>
              Rotate the Anon Key
            </CardTitle>
            <CardDescription>
              Generate a new anon key to invalidate the old (exposed) token
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click "View Backend" below to open Lovable Cloud dashboard</li>
              <li>Navigate to <strong>Settings → API</strong></li>
              <li>Click <strong>"Reset anon/public key"</strong></li>
              <li>Copy the new anon key to your clipboard</li>
            </ol>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
                const projectId = supabaseUrl.split('.')[0].split('//')[1] || '';
                window.open(`https://lovable.dev/projects/${projectId}/backend`, '_blank');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Backend
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Store in Vault */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </div>
              Store New Key in Vault
            </CardTitle>
            <CardDescription>
              Paste the new anon key below to securely store it in encrypted vault
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Anon Key</label>
              <Textarea
                placeholder="Paste the new anon key here (starts with 'eyJ'...)"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                rows={4}
                className="font-mono text-xs"
              />
            </div>
            <Button
              onClick={handleStoreSecret}
              disabled={isStoring || !anonKey.trim()}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-2" />
              {isStoring ? "Storing in Vault..." : "Store in Encrypted Vault"}
            </Button>
          </CardContent>
        </Card>

        {/* Step 3: Verify */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                3
              </div>
              Verify Cron Jobs
            </CardTitle>
            <CardDescription>
              Check that the 6 cron jobs are running successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              After storing the secret, verify that the following cron jobs are executing without auth errors:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>send-daily-error-summary</li>
              <li>check-generation-timeouts</li>
              <li>auto-recover-stuck-generations</li>
              <li>monitor-video-jobs</li>
              <li>cleanup-stuck-generations</li>
              <li>recover-stuck-jobs</li>
            </ul>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
                const projectId = supabaseUrl.split('.')[0].split('//')[1] || '';
                window.open(`https://lovable.dev/projects/${projectId}/backend/functions`, '_blank');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Edge Functions Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
