import React from 'react';
import { AnimationEditor } from '@/features/animations/editor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Download, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

const AnimationEditorPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSave = (project: unknown) => {
    // TODO: Save to database
    console.log('Saving project:', project);
    toast.success('Project saved successfully!');
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon!');
  };

  const handleLoad = () => {
    toast.info('Load functionality coming soon!');
  };

  return (
    <>
      <Helmet>
        <title>Animation Editor | Artifio</title>
        <meta name="description" content="Create stunning animated explainer videos with the ARTIFIO Animation Editor" />
      </Helmet>
      
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 border-b bg-card">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Animation Editor</h1>
              <p className="text-xs text-muted-foreground">Create animated explainer videos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleLoad}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Load
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={() => handleSave({})}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </header>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <AnimationEditor onSave={handleSave} />
        </div>
      </div>
    </>
  );
};

export default AnimationEditorPage;
