import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Coins, Crown } from "lucide-react";
import { useErrorHandler } from "@/hooks/useErrorHandler";

interface UserWithSubscription {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  subscription?: {
    tokens_remaining: number;
    plan: string;
  };
  roles?: Array<{ role: string }>;
}

export default function UsersManager() {
  const { execute } = useErrorHandler();
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    await execute(
      async () => {
        // Fetch profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, full_name, created_at")
          .order("created_at", { ascending: false });

        if (profilesError) throw profilesError;

        // Fetch subscriptions
        const { data: subscriptions, error: subsError } = await supabase
          .from("user_subscriptions")
          .select("user_id, tokens_remaining, plan");

        if (subsError) throw subsError;

        // Fetch roles
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role");

        if (rolesError) throw rolesError;

        // Combine data
        const usersWithData = profiles?.map(profile => {
          const userSub = subscriptions?.find(s => s.user_id === profile.id);
          const userRoles = roles?.filter(r => r.user_id === profile.id);
          return {
            ...profile,
            subscription: userSub,
            roles: userRoles,
          };
        });

        setUsers(usersWithData || []);
      },
      {
        showSuccessToast: false,
        errorMessage: "Failed to load users",
        context: {
          component: 'UsersManager',
          operation: 'fetchUsers'
        }
      }
    );
  };

  const handleAddTokens = async () => {
    if (!selectedUser || !tokenAmount) return;

    const amount = parseInt(tokenAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid credit amount");
      return;
    }

    await execute(
      async () => {
        // Use edge function for secure token management with audit trail
        const { error } = await supabase.functions.invoke('manage-user-tokens', {
          body: {
            user_id: selectedUser.id,
            amount: amount,
            action: 'add'
          }
        });

        if (error) throw error;

        setDialogOpen(false);
        setTokenAmount("");
        fetchUsers();
      },
      {
        successMessage: `Added ${amount} credits to ${selectedUser.email}`,
        errorMessage: "Failed to add tokens",
        context: {
          component: 'UsersManager',
          operation: 'handleAddTokens',
          userId: selectedUser.id,
          amount
        }
      }
    );
  };

  const handleToggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    await execute(
      async () => {
        // Use edge function for secure role management with audit trail
        const { error } = await supabase.functions.invoke('manage-user-role', {
          body: {
            user_id: userId,
            role: 'admin',
            action: currentlyAdmin ? 'revoke' : 'grant'
          }
        });

        if (error) throw error;

        fetchUsers();
      },
      {
        successMessage: currentlyAdmin ? "Admin role removed" : "Admin role granted",
        errorMessage: "Failed to update admin role",
        context: {
          component: 'UsersManager',
          operation: 'handleToggleAdmin',
          userId,
          currentlyAdmin
        }
      }
    );
  };

  // No loading state - render immediately
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black mb-2">USERS MANAGEMENT</h1>
        <p className="text-muted-foreground">
          View and manage user accounts, tokens, and roles
        </p>
      </div>

      <Card className="border-3 border-black brutal-shadow">
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Email</TableHead>
                <TableHead className="font-bold">Full Name</TableHead>
                <TableHead className="font-bold">Credits</TableHead>
                <TableHead className="font-bold">Plan</TableHead>
                <TableHead className="font-bold">Role</TableHead>
                <TableHead className="font-bold">Joined</TableHead>
                <TableHead className="font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isAdmin = user.roles?.some(r => r.role === "admin");
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.email || "N/A"}
                    </TableCell>
                    <TableCell>{user.full_name || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-primary" />
                        <span className="font-bold">
                          {Number(user.subscription?.tokens_remaining || 0).toFixed(2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className="capitalize">
                        {user.subscription?.plan || "freemium"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <Badge className="bg-purple-500">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setDialogOpen(true);
                          }}
                        >
                          <Coins className="h-4 w-4 mr-1" />
                          Add Credits
                        </Button>
                        <Button
                          variant={isAdmin ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleToggleAdmin(user.id, isAdmin)}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          {isAdmin ? "Remove Admin" : "Make Admin"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credits</DialogTitle>
            <DialogDescription>
              Add credits to {selectedUser?.email}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Current balance: {Number(selectedUser?.subscription?.tokens_remaining || 0).toFixed(2)} credits
              </p>
              <Input
                type="number"
                placeholder="Enter credit amount"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                min="1"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddTokens} className="flex-1">
                Add Credits
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
