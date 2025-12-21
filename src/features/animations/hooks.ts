import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnimationJob, CreateAnimationRequest, AnimationJobResponse } from "./types";

/**
 * Hook to track a single animation job with real-time updates
 */
export function useAnimationJob(jobId: string | null) {
  const [job, setJob] = useState<AnimationJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch initial job data
    const fetchJob = async () => {
      const { data, error: fetchError } = await supabase
        .from("animation_jobs")
        .select("*")
        .eq("id", jobId)
        .single();
      
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setJob(data as AnimationJob);
      }
      setLoading(false);
    };
    
    fetchJob();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`animation_job_${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "animation_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          setJob(payload.new as AnimationJob);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [jobId]);

  return { job, loading, error };
}

/**
 * Hook to create a new animation job
 */
export function useCreateAnimation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAnimation = useCallback(
    async (request: CreateAnimationRequest): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error("Not authenticated");
        }

        const response = await supabase.functions.invoke<AnimationJobResponse>(
          "generate-animation",
          { body: request }
        );

        if (response.error) {
          throw new Error(response.error.message);
        }

        const { jobId } = response.data!;

        // Trigger render asynchronously
        supabase.functions
          .invoke("render-animation", { body: { jobId } })
          .catch((err) => console.error("Render trigger error:", err));

        setLoading(false);
        return jobId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create animation";
        setError(errorMessage);
        setLoading(false);
        return null;
      }
    },
    []
  );

  return { createAnimation, loading, error };
}

/**
 * Hook to list user's animation jobs with real-time updates
 */
export function useAnimationJobs(limit = 10) {
  const [jobs, setJobs] = useState<AnimationJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    const fetchJobs = async () => {
      const { data } = await supabase
        .from("animation_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      
      setJobs((data as AnimationJob[]) || []);
      setLoading(false);
    };
    
    fetchJobs();

    // Subscribe to all changes for the user's jobs
    const channel = supabase
      .channel("animation_jobs_list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "animation_jobs",
        },
        async () => {
          // Refetch on any change
          const { data } = await supabase
            .from("animation_jobs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);
          
          setJobs((data as AnimationJob[]) || []);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [limit]);

  return { jobs, loading };
}
