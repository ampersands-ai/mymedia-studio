import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Coins, Sparkles, TrendingUp, Video, Image as ImageIcon, Music, FileText, DollarSign, TrendingDown } from "lucide-react";
import { useTokenUsage } from "@/hooks/useTokenUsage";

interface Subscription {
  plan: string;
  status: string;
  tokens_remaining: number;
  tokens_total: number;
  current_period_end?: string;
}

interface SavingsData {
  userPlanPrice: number;
  competitorTotal: number;
  monthlySavings: number;
  totalSavings: number;
  monthsAsMember: number;
  savingsPercentage: number;
}

interface SavingsData {
  userPlanPrice: number;
  competitorTotal: number;
  monthlySavings: number;
  totalSavings: number;
  monthsAsMember: number;
  savingsPercentage: number;
}

interface SubscriptionSectionProps {
  subscription: Subscription | null;
  savings: SavingsData | null;
}

export function SubscriptionSection({ subscription, savings }: SubscriptionSectionProps) {
  const {
    currentMonth,
    isLoadingCurrent,
  } = useTokenUsage();

  return (
    <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Subscription & Tokens</CardTitle>
            <CardDescription>Manage your subscription and view token usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Current Plan</Label>
                    <div className="flex items-center gap-2">
                      <Badge className="text-base px-4 py-1 capitalize">{subscription.plan}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="text-base px-4 py-1 capitalize">
                        {subscription.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-card rounded-lg border-[3px] border-primary">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">Credits Remaining</p>
                        <p className="text-3xl font-black text-foreground">{Number(subscription.tokens_remaining).toFixed(2)}</p>
                      </div>
                      <Coins className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div className="p-4 bg-card rounded-lg border-[3px] border-secondary">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">Total Credits</p>
                        <p className="text-3xl font-black text-foreground">{subscription.tokens_total.toLocaleString()}</p>
                      </div>
                      <Sparkles className="h-8 w-8 text-secondary" />
                    </div>
                  </div>
                </div>

                {subscription.current_period_end && (
                  <div className="space-y-2">
                    <Label>Next Billing Date</Label>
                    <p className="text-sm">{new Date(subscription.current_period_end).toLocaleDateString()}</p>
                  </div>
                )}
              </>
            )}

            <Link to="/pricing">
              <Button className="w-full bg-secondary hover:bg-secondary/90 text-black font-bold" aria-label="View all pricing plans">
                Upgrade Plan
              </Button>
            </Link>
          </CardContent>
        </Card>

        {savings && savings.monthlySavings > 0 && (
          <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <DollarSign className="h-6 w-6" />
                Your Savings
              </CardTitle>
              <CardDescription>See how much you're saving with Artifio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-6 bg-white/50 dark:bg-black/20 rounded-lg border-2 border-green-500/30">
                <p className="text-sm font-semibold text-muted-foreground mb-2">
                  You're Saving
                </p>
                <p className="text-5xl font-black text-green-600 dark:text-green-400 mb-1">
                  ${savings.monthlySavings}
                </p>
                <p className="text-lg font-bold text-green-700 dark:text-green-500">
                  per month
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                  Competitor Pricing
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
                    <span className="text-sm font-semibold">Runway ML</span>
                    <span className="font-mono text-sm text-muted-foreground">$35/mo</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
                    <span className="text-sm font-semibold">Midjourney</span>
                    <span className="font-mono text-sm text-muted-foreground">$30/mo</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
                    <span className="text-sm font-semibold">ElevenLabs</span>
                    <span className="font-mono text-sm text-muted-foreground">$22/mo</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 rounded-lg border-2 border-red-300 dark:border-red-800">
                    <span className="text-sm font-bold">Total Competitor Cost</span>
                    <span className="font-mono text-lg font-black text-red-700 dark:text-red-400">
                      ${savings.competitorTotal}/mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/30 rounded-lg border-2 border-green-500">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-bold">Your Artifio Plan</span>
                    </div>
                    <span className="font-mono text-lg font-black text-green-700 dark:text-green-400">
                      ${savings.userPlanPrice}/mo
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-muted-foreground">Your Plan vs Competitors</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {savings.savingsPercentage.toFixed(0)}% savings
                  </span>
                </div>
                <Progress
                  value={100 - savings.savingsPercentage}
                  className="h-3 bg-red-200 dark:bg-red-950"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Your cost: ${savings.userPlanPrice}</span>
                  <span>Competitors: ${savings.competitorTotal}</span>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/40 dark:to-emerald-950/40 rounded-lg border-2 border-green-500/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
                      Total Saved Since Signup
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {savings.monthsAsMember} month{savings.monthsAsMember !== 1 ? 's' : ''} as a member
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-green-600 dark:text-green-400">
                      ${savings.totalSavings}
                    </p>
                    <p className="text-xs text-muted-foreground">and counting!</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Credit Usage</CardTitle>
            <CardDescription>Track your credit consumption and creation statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/30">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                Current Credit Balance
              </p>
              <p className="text-6xl font-black text-foreground mb-2">
                {Number(subscription?.tokens_remaining || 0).toFixed(2)}
              </p>
              <p className="text-sm text-primary flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4" />
                Credits never expire
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                This Month's Activity
              </h3>

              {isLoadingCurrent ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : currentMonth ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-card rounded-lg border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Total Creations
                      </p>
                      <p className="text-3xl font-black text-foreground mt-1">
                        {currentMonth.totalCreations}
                      </p>
                    </div>
                    <div className="p-4 bg-card rounded-lg border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Credits Used
                      </p>
                      <p className="text-3xl font-black text-foreground mt-1">
                        {currentMonth.totalTokens.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Breakdown by Type
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-card rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold">Videos</span>
                        </div>
                        <p className="text-xl font-black">{currentMonth.byType.video.count}</p>
                        <p className="text-xs text-muted-foreground">
                          {currentMonth.byType.video.tokens} tokens
                        </p>
                      </div>
                      <div className="p-3 bg-card rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon className="h-4 w-4 text-secondary" />
                          <span className="text-xs font-semibold">Images</span>
                        </div>
                        <p className="text-xl font-black">{currentMonth.byType.image.count}</p>
                        <p className="text-xs text-muted-foreground">
                          {currentMonth.byType.image.tokens} tokens
                        </p>
                      </div>
                      <div className="p-3 bg-card rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Music className="h-4 w-4 text-accent" />
                          <span className="text-xs font-semibold">Audio</span>
                        </div>
                        <p className="text-xl font-black">{currentMonth.byType.audio.count}</p>
                        <p className="text-xs text-muted-foreground">
                          {currentMonth.byType.audio.tokens} tokens
                        </p>
                      </div>
                      <div className="p-3 bg-card rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-semibold">Text</span>
                        </div>
                        <p className="text-xl font-black">{currentMonth.byType.text.count}</p>
                        <p className="text-xs text-muted-foreground">
                          {currentMonth.byType.text.tokens} tokens
                        </p>
                      </div>
                    </div>
                  </div>

                  {currentMonth.mostUsedModel && (
                    <div className="p-4 bg-accent/10 rounded-lg border border-accent">
                      <p className="text-xs font-semibold text-accent-foreground uppercase tracking-wide mb-2">
                        Most Used AI Model
                      </p>
                      <p className="text-lg font-bold">{currentMonth.mostUsedModel.model_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Used {currentMonth.mostUsedModel.count} time{currentMonth.mostUsedModel.count !== 1 ? 's' : ''} this month
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No usage data for this month yet. Start creating!
                </p>
              )}
            </div>

            <Link to="/dashboard/history">
              <Button
                className="w-full bg-secondary hover:bg-secondary/90 text-black font-bold"
                size="lg"
              >
                View Full History
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
  );
}
