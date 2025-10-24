import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { VideoJobCard } from './VideoJobCard';
import { VideoPreviewModal } from './VideoPreviewModal';
import { VideoJob } from '@/types/video';

export function VideoJobsList() {
  const { jobs, isLoading } = useVideoJobs();
  const [previewJob, setPreviewJob] = useState<VideoJob | null>(null);

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
      <Card className="border-2 w-full">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl sm:text-2xl font-black">YOUR VIDEOS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:space-y-4">
            {!jobs || jobs.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <div className="text-4xl md:text-6xl mb-3 md:mb-4">🎬</div>
                <p className="text-sm md:text-base text-muted-foreground">
                  No videos yet. Create your first one!
                </p>
              </div>
            ) : (
              jobs.map(job => (
                <VideoJobCard 
                  key={job.id} 
                  job={job}
                  onPreview={setPreviewJob}
                />
              ))
            )}
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
