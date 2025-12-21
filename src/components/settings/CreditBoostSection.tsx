import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  BOOST_CREDITS, 
  BOOST_PRICING, 
  normalizePlanName, 
  getPlanDisplayName,
  getPerCreditCost,
  type BillingPeriod 
} from "@/lib/config/payment-providers";

interface CreditBoostSectionProps {
  plan: string;
  billingPeriod: BillingPeriod;
}

export function CreditBoostSection({ plan, billingPeriod }: CreditBoostSectionProps) {
  const [isLoading, setIsLoading] = useState(false);

  const normalizedPlan = normalizePlanName(plan);
  
  // Don't show for freemium users
  if (normalizedPlan === 'freemium' || !normalizedPlan) {
    return null;
  }

  const credits = BOOST_CREDITS[normalizedPlan as keyof typeof BOOST_CREDITS];
  const pricing = BOOST_PRICING[normalizedPlan as keyof typeof BOOST_PRICING];
  
  if (!credits || !pricing) {
    return null;
  }

  const price = billingPeriod === 'annual' ? pricing.annual : pricing.monthly;
  const perCreditCost = getPerCreditCost(normalizedPlan, billingPeriod);
  const displayName = getPlanDisplayName(normalizedPlan);

  const handlePurchaseBoost = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-one-time-payment', {
        body: {
          appOrigin: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.checkout_url) {
        window.open(data.checkout_url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating boost checkout:', error);
      toast.error('Failed to create checkout session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="brutal-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Coins className="h-5 w-5 text-primary" />
          Need More Credits?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Subscribers can purchase additional credits anytime at their current plan rate. 
          Your existing credits stay in your account. You receive full new tier credits on top of your current balance.
        </p>
        
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-bold">{credits.toLocaleString()} Credits</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {displayName} {billingPeriod === 'annual' ? 'Annual' : 'Monthly'} Rate
            </div>
            <div className="text-xs text-primary font-medium">
              {perCreditCost} per credit
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-black">${price.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">one-time</div>
          </div>
        </div>

        <Button 
          onClick={handlePurchaseBoost}
          disabled={isLoading}
          className="w-full font-bold"
          variant="default"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Coins className="mr-2 h-4 w-4" />
              Buy {credits.toLocaleString()} Credits for ${price.toFixed(2)}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
