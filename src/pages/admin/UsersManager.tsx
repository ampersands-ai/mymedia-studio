import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Shield,
  Coins,
  Crown,
  ShieldOff,
  Search,
  Download,
  RefreshCw,
  Users,
  UserCheck,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
  ArrowUpDown,
  History,
} from "lucide-react";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useAdminUsers, type SortColumn } from "@/hooks/useAdminUsers";
import { PaginationControls } from "@/components/ui/pagination-controls";

export default function UsersManager() {
  const navigate = useNavigate();
  const { execute } = useErrorHandler();
  const {
    users,
    stats,
    isLoading,
    isLoadingStats,
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter,
    clearFilters,
    sortColumn,
    sortDirection,
    handleSort,
    pagination,
    exportToCSV,
    refresh,
  } = useAdminUsers();

  const [selectedUser, setSelectedUser] = useState<(typeof users)[0] | null>(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleAddTokens = async () => {
    if (!selectedUser || !tokenAmount) return;

    const amount = parseInt(tokenAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid credit amount");
      return;
    }

    await execute(
      async () => {
        const { error } = await supabase.functions.invoke("manage-user-tokens", {
          body: {
            user_id: selectedUser.id,
            amount: amount,
            action: "add",
          },
        });

        if (error) throw error;

        setDialogOpen(false);
        setTokenAmount("");
        refresh();
      },
      {
        successMessage: `Added ${amount} credits to ${selectedUser.email}`,
        errorMessage: "Failed to add tokens",
        context: {
          component: "UsersManager",
          operation: "handleAddTokens",
          userId: selectedUser.id,
          amount,
        },
      }
    );
  };

  const handleToggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    await execute(
      async () => {
        const { error } = await supabase.functions.invoke("manage-user-role", {
          body: {
            user_id: userId,
            role: "admin",
            action: currentlyAdmin ? "revoke" : "grant",
          },
        });

        if (error) throw error;

        refresh();
      },
      {
        successMessage: currentlyAdmin ? "Admin role removed" : "Admin role granted",
        errorMessage: "Failed to update admin role",
        context: {
          component: "UsersManager",
          operation: "handleToggleAdmin",
          userId,
          currentlyAdmin,
        },
      }
    );
  };

  const handleToggleModerationExempt = async (userId: string, currentlyExempt: boolean) => {
    await execute(
      async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (currentlyExempt) {
          const { error } = await supabase
            .from("moderation_exemptions")
            .update({ is_active: false })
            .eq("user_id", userId);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("moderation_exemptions").upsert(
            {
              user_id: userId,
              granted_by: user?.id,
              is_active: true,
              granted_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            }
          );

          if (error) throw error;
        }

        refresh();
      },
      {
        successMessage: currentlyExempt ? undefined : "User exempted from moderation",
        errorMessage: "Failed to update moderation exemption",
        context: {
          component: "UsersManager",
          operation: "handleToggleModerationExempt",
          userId,
          currentlyExempt,
        },
      }
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    const result = await exportToCSV();
    setIsExporting(false);

    if (result.success) {
      toast.success(`Exported ${result.count} users to CSV`);
    } else {
      toast.error(result.message || "Export failed");
    }
  };

  const hasActiveFilters =
    searchTerm || filters.plan || filters.status || filters.role || filters.emailVerified;

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1" />
    );
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black mb-2">USERS MANAGEMENT</h1>
          <p className="text-muted-foreground">
            View and manage user accounts, tokens, and roles
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {isLoadingStats ? "..." : stats?.total_users.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {isLoadingStats ? "..." : stats?.active_users.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Admins</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {isLoadingStats ? "..." : stats?.admin_count.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Verified</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {isLoadingStats ? "..." : stats?.verified_users.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 hidden lg:block">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Freemium</span>
            <p className="text-2xl font-bold mt-1">
              {isLoadingStats ? "..." : stats?.freemium_users.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 hidden lg:block">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Premium</span>
            <p className="text-2xl font-bold mt-1">
              {isLoadingStats ? "..." : stats?.premium_users.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 hidden lg:block">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Pro</span>
            <p className="text-2xl font-bold mt-1">
              {isLoadingStats ? "..." : stats?.pro_users.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-2">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={filters.plan} onValueChange={(v) => updateFilter("plan", v === "all" ? "" : v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="freemium">Freemium</SelectItem>
                  <SelectItem value="explorer">Explorer</SelectItem>
                  <SelectItem value="creators">Creators</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="ultimate">Ultimate</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(v) => updateFilter("status", v === "all" ? "" : v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.role} onValueChange={(v) => updateFilter("role", v === "all" ? "" : v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.emailVerified}
                onValueChange={(v) => updateFilter("emailVerified", v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Verified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Verified</SelectItem>
                  <SelectItem value="false">Not Verified</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {isLoading ? (
              "Loading..."
            ) : (
              <>
                {pagination.totalCount.toLocaleString()} users
                {hasActiveFilters && " (filtered)"}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="font-bold cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center">
                    Email
                    <SortIcon column="email" />
                  </div>
                </TableHead>
                <TableHead className="font-bold">Profile Name</TableHead>
                <TableHead
                  className="font-bold cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("tokens_remaining")}
                >
                  <div className="flex items-center">
                    Credits
                    <SortIcon column="tokens_remaining" />
                  </div>
                </TableHead>
                <TableHead className="font-bold">Plan</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Role</TableHead>
                <TableHead
                  className="font-bold cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("last_activity_at")}
                >
                  <div className="flex items-center">
                    Last Active
                    <SortIcon column="last_activity_at" />
                  </div>
                </TableHead>
                <TableHead
                  className="font-bold cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center">
                    Joined
                    <SortIcon column="created_at" />
                  </div>
                </TableHead>
                <TableHead className="font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading users...</p>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {hasActiveFilters ? "No users match your filters" : "No users found"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      <div className="flex items-center gap-1">
                        {user.email || "N/A"}
                        {user.email_verified && (
                          <Shield className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {user.profile_name || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-primary" />
                        <span className="font-bold">
                          {Number(user.tokens_remaining || 0).toFixed(0)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {user.plan || "freemium"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.subscription_status === "active" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {user.subscription_status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.is_admin && (
                          <Badge className="bg-purple-500">
                            <Crown className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {user.is_mod_exempt && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/20 text-amber-600 border-amber-500/30"
                          >
                            <ShieldOff className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(user.last_activity_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/users/${user.id}/generations`)}
                          title="View Generations"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setDialogOpen(true);
                          }}
                          title="Add Credits"
                        >
                          <Coins className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={user.is_admin ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                          title={user.is_admin ? "Remove Admin" : "Make Admin"}
                        >
                          <Crown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={user.is_mod_exempt ? "destructive" : "outline"}
                          size="sm"
                          onClick={() =>
                            handleToggleModerationExempt(user.id, user.is_mod_exempt)
                          }
                          title={user.is_mod_exempt ? "Remove Exemption" : "Exempt from Moderation"}
                        >
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              pageSize={pagination.pageSize}
              hasPrevious={pagination.hasPrevious}
              hasNext={pagination.hasNext}
              onPageChange={pagination.goToPage}
              onFirstPage={pagination.firstPage}
              onLastPage={pagination.lastPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Tokens Dialog */}
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
                Current balance: {Number(selectedUser?.tokens_remaining || 0).toFixed(2)} credits
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
