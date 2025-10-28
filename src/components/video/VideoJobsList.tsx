import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, RotateCcw, ExternalLink } from 'lucide-react';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { VideoJobCard } from './VideoJobCard';
import { VideoPreviewModal } from './VideoPreviewModal';
import { VideoJob } from '@/types/video';
import { OptimizedGenerationPreview } from '@/components/generation/OptimizedGenerationPreview';
import { useNavigate } from 'react-router-dom';

export function VideoJobsList() {
  const { jobs, isLoading, pinnedJobId, clearPinnedJob } = useVideoJobs();
  const [previewJob, setPreviewJob] = useState<VideoJob | null>(null);
  const navigate = useNavigate();
  
  const currentJob = jobs && jobs.length > 0 ? jobs[0] : null;
  const isPinnedJob = currentJob && pinnedJobId === currentJob.id;
  const isJobFinished = currentJob && (currentJob.status === 'completed' || currentJob.status === 'failed');
  const showCompletedVideo = isPinnedJob && currentJob?.status === 'completed' && currentJob.final_video_url;

  if (isLoading) {
    return (
      <Card className="border-2 w-full">
        <CardContent className="flex justify-center items-center py-8 md:py-12">
          <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 w-full overflow-hidden">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl sm:text-2xl font-black">CURRENT GENERATION</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {jobs && jobs.length > 0 && !isJobFinished && (
            <Alert className="mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">Auto-Timeout Policy</AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                Jobs taking longer than 5 minutes will automatically move to My Creations to allow you to generate other content.
              </AlertDescription>
            </Alert>
          )}
          {isPinnedJob && isJobFinished && (
            <Alert className="mb-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-900 dark:text-green-100">Generation Complete</AlertTitle>
              <AlertDescription className="text-green-800 dark:text-green-200 text-sm flex items-center justify-between">
                <span>Your video is ready! View it below or in My Creations.</span>
                <div className="flex gap-2 ml-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => navigate('/dashboard/history')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    My Creations
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={clearPinnedJob}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-3 md:space-y-4">
            {(() => {
              // Only show the pinned job if one exists
              const jobsToDisplay = pinnedJobId && jobs 
                ? jobs.filter(job => job.id === pinnedJobId)
                : jobs;
              
              return !jobsToDisplay || jobsToDisplay.length === 0 ? (
                <div className="text-center py-8 md:py-12">
                  <div className="text-4xl md:text-6xl mb-3 md:mb-4">🎬</div>
                  <p className="text-sm md:text-base text-muted-foreground">
                    No active generation. Create your first video!
                  </p>
                </div>
              ) : (
                jobsToDisplay.map(job => (
                  <VideoJobCard 
                    key={job.id} 
                    job={job as VideoJob}
                    onPreview={setPreviewJob}
                  />
                ))
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {previewJob && (
        <VideoPreviewModal
          job={previewJob}
          open={!!previewJob}
          onOpenChange={(open) => !open && setPreviewJob(null)}
        />
      )}
    </>
  );
}
