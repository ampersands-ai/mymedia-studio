import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Video, Image as ImageIcon, Music, FileText } from "lucide-react";
import { format } from "date-fns";

interface MonthlyStats {
  totalCreations: number;
  totalTokens: number;
  byType: {
    video: { count: number; tokens: number };
    image: { count: number; tokens: number };
    audio: { count: number; tokens: number };
    text: { count: number; tokens: number };
  };
  mostUsedModel: { model_id: string; count: number } | null;
}

interface MonthlyBreakdown {
  month: string;
  monthLabel: string;
  totalCreations: number;
  totalTokens: number;
}

interface AllTimeStats extends MonthlyStats {
  monthlyBreakdown: MonthlyBreakdown[];
}

interface Generation {
  id: string;
  type: string;
  created_at: string;
  tokens_used: number;
}

interface TokenUsageHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTimeStats: AllTimeStats | undefined;
  isLoading: boolean;
  generations: Generation[];
}

export const TokenUsageHistoryModal = ({
  isOpen,
  onClose,
  allTimeStats,
  isLoading,
  generations,
}: TokenUsageHistoryModalProps) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'text': return <FileText className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black gradient-text">
            Credit Usage History
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : allTimeStats ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/30">
                  <p className="text-sm font-semibold text-primary uppercase tracking-wide">
                    Total Creations
                  </p>
                  <p className="text-4xl font-black text-foreground mt-2">
                    {allTimeStats.totalCreations.toLocaleString()}
                  </p>
                </div>
                <div className="p-6 bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-lg border-2 border-secondary/30">
                  <p className="text-sm font-semibold text-secondary-foreground uppercase tracking-wide">
                    Total Credits Used
                  </p>
                  <p className="text-4xl font-black text-foreground mt-2">
                    {allTimeStats.totalTokens.toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3">Breakdown by Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['video', 'image', 'audio', 'text'] as const).map((type) => (
                    <div
                      key={type}
                      className="p-4 bg-card rounded-lg border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(type)}
                        <span className="text-sm font-semibold capitalize">{type}</span>
                      </div>
                      <p className="text-2xl font-black text-foreground">
                        {allTimeStats.byType[type].count}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {allTimeStats.byType[type].tokens.toLocaleString()} credits
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {allTimeStats.mostUsedModel && (
                <div className="p-4 bg-accent/20 rounded-lg border border-accent">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-accent-foreground" />
                    <h3 className="text-sm font-bold uppercase tracking-wide">
                      Most Used Model
                    </h3>
                  </div>
                  <p className="text-lg font-bold">{allTimeStats.mostUsedModel.model_id}</p>
                  <p className="text-sm text-muted-foreground">
                    Used {allTimeStats.mostUsedModel.count} times
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="monthly" className="space-y-4">
              <div className="space-y-3">
                {allTimeStats.monthlyBreakdown.map((month) => (
                  <div
                    key={month.month}
                    className="p-4 bg-card rounded-lg border hover:border-primary transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg">{month.monthLabel}</p>
                        <p className="text-sm text-muted-foreground">
                          {month.totalCreations} creation{month.totalCreations !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-primary">
                          {month.totalTokens.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">credits</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="recent" className="space-y-3">
              {generations.slice(0, 20).map((gen) => (
                <div
                  key={gen.id}
                  className="p-3 bg-card rounded-lg border flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {getTypeIcon(gen.type)}
                    <div>
                      <p className="font-semibold text-sm capitalize">{gen.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(gen.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {gen.tokens_used} credits
                  </Badge>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No usage data available
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
