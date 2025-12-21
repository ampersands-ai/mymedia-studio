import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, Sparkles, TrendingUp, Video, Image as ImageIcon, Music, FileText, Settings2 } from "lucide-react";
import { useTokenUsage } from "@/hooks/useTokenUsage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditBoostSection } from "./CreditBoostSection";
import { normalizePlanName, type BillingPeriod } from "@/lib/config/payment-providers";
interface Subscription {
  plan: string;
  status: string;
  tokens_remaining: number;
  tokens_total: number;
  current_period_end?: string;
  billing_period?: BillingPeriod;
}

interface SubscriptionSectionProps {
  subscription: Subscription | null;
}

export function SubscriptionSection({ subscription }: SubscriptionSectionProps) {
  const [managingSubscription, setManagingSubscription] = useState(false);
  const {
    currentMonth,
    isLoadingCurrent,
  } = useTokenUsage();

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast.error('Failed to open subscription management. Please try again.');
    } finally {
      setManagingSubscription(false);
    }
  };

  const isPaidPlan = subscription?.plan && subscription.plan !== 'freemium';

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

            <div className="flex flex-col sm:flex-row gap-2">
              <Link to="/pricing" className="flex-1">
                <Button className="w-full bg-secondary hover:bg-secondary/90 text-black font-bold" aria-label="View all pricing plans">
                  {isPaidPlan ? 'Change Plan' : 'Upgrade Plan'}
                </Button>
              </Link>
              {isPaidPlan && (
                <Button 
                  variant="outline" 
                  onClick={handleManageSubscription}
                  disabled={managingSubscription}
                  className="flex-1"
                >
                  {managingSubscription ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Settings2 className="h-4 w-4 mr-2" />
                  )}
                  Manage Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {isPaidPlan && subscription && (
          <CreditBoostSection 
            plan={normalizePlanName(subscription.plan)} 
            billingPeriod={subscription.billing_period || 'monthly'} 
          />
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
                Credits never expire while subscribed
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
