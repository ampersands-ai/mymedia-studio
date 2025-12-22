import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VideoInstructions } from '../editor/types';
import { toast } from 'sonner';

interface AnimationProject {
  id: string;
  user_id: string;
  name: string;
  instructions: VideoInstructions;
  audio_url: string | null;
  audio_duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useAnimationProject() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [project, setProject] = useState<AnimationProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const loadProject = useCallback(async (id: string) => {
    if (!user) return null;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('animation_projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      const parsed: AnimationProject = {
        ...data,
        instructions: data.instructions as VideoInstructions,
      };
      setProject(parsed);
      return parsed;
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveProject = useCallback(async (
    instructions: VideoInstructions,
    name?: string
  ): Promise<string | null> => {
    if (!user) {
      toast.error('Please sign in to save');
      return null;
    }

    setSaving(true);
    try {
      if (project?.id) {
        // Update existing
        const { error } = await supabase
          .from('animation_projects')
          .update({
            name: name || instructions.name || project.name,
            instructions: instructions as unknown as Record<string, unknown>,
          })
          .eq('id', project.id);

        if (error) throw error;
        toast.success('Project saved');
        return project.id;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('animation_projects')
          .insert({
            user_id: user.id,
            name: name || instructions.name || 'Untitled Project',
            instructions: instructions as unknown as Record<string, unknown>,
          })
          .select('id')
          .single();

        if (error) throw error;
        toast.success('Project created');
        return data.id;
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project');
      return null;
    } finally {
      setSaving(false);
    }
  }, [user, project]);

  const deleteProject = useCallback(async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('animation_projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Project deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
      return false;
    }
  }, [user]);

  return {
    project,
    loading,
    saving,
    loadProject,
    saveProject,
    deleteProject,
    setProject,
  };
}

export function useAnimationProjects() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [projects, setProjects] = useState<AnimationProject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const fetchProjects = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('animation_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      setProjects(data.map((p: Record<string, unknown>) => ({
        ...p,
        instructions: p.instructions as VideoInstructions,
      })) as AnimationProject[]);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { projects, loading, fetchProjects };
}