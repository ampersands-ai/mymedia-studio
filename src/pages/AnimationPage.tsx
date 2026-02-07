import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { AnimatedBackgroundSelector, useAnimationJobs } from "@/features/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Sparkles, Video, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageTitle } from '@/config/brand';

export default function AnimationPage() {
  const navigate = useNavigate();
  const [script, setScript] = useState("");
  const [duration, setDuration] = useState(60);
  const [showGenerator, setShowGenerator] = useState(false);
  const [completedVideoUrl, setCompletedVideoUrl] = useState<string | null>(null);

  const { jobs, loading: jobsLoading } = useAnimationJobs(5);

  const handleVideoReady = (videoUrl: string) => {
    setCompletedVideoUrl(videoUrl);
    setShowGenerator(false);
  };

  const canGenerate = script.length >= 10 && duration >= 5 && duration <= 300;

  return (
    <>
      <Helmet>
        <title>{pageTitle('Animated Backgrounds')}</title>
        <meta
          name="description"
          content="Create custom animated explainer backgrounds for your videos with AI-powered scene analysis."
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard/storyboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Animated Backgrounds
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-powered custom animations for your videos
              </p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Left: Input Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create Animation</CardTitle>
                <CardDescription>
                  Enter your script and we'll generate custom animated backgrounds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="script">Script</Label>
                  <Textarea
                    id="script"
                    placeholder="Enter your video script here (min 10 characters)..."
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {script.length} characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (seconds)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={5}
                    max={300}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    5-300 seconds
                  </p>
                </div>

                {!showGenerator ? (
                  <Button
                    onClick={() => setShowGenerator(true)}
                    disabled={!canGenerate}
                    className="w-full"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Configure Animation
                  </Button>
                ) : (
                  <AnimatedBackgroundSelector
                    script={script}
                    duration={duration}
                    onVideoReady={handleVideoReady}
                  />
                )}

                {completedVideoUrl && (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Animation Ready!</span>
                    </div>
                    <video
                      src={completedVideoUrl}
                      controls
                      className="w-full rounded-md"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Recent Jobs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Recent Animations
                </CardTitle>
                <CardDescription>Your animation history</CardDescription>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : jobs.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No animations yet. Create your first one!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3"
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full text-lg",
                            job.status === "completed" && "bg-green-500/10",
                            job.status === "failed" && "bg-red-500/10",
                            !["completed", "failed"].includes(job.status) && "bg-blue-500/10"
                          )}
                        >
                          {job.status === "completed" && "✅"}
                          {job.status === "failed" && "❌"}
                          {!["completed", "failed"].includes(job.status) && "⏳"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {job.script.slice(0, 50)}...
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{job.duration}s</span>
                            <span>•</span>
                            <span className="capitalize">{job.status.replace("_", " ")}</span>
                          </div>
                        </div>
                        {job.status === "completed" && job.video_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={job.video_url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        )}
                        {job.status === "failed" && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}
