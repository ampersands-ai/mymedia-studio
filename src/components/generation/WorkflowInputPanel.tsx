import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowLeft, Loader2, Clock, Camera, Sparkles, Coins, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNativeCamera } from "@/hooks/useNativeCamera";
import { useUserTokens } from "@/hooks/useUserTokens";
import { useWorkflowTokenCost } from "@/hooks/useWorkflowTokenCost";
import { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { formatEstimatedTime } from "@/lib/time-utils";
import { WorkflowPromptInput } from "./WorkflowPromptInput";
import { useWorkflowSurpriseMe } from "@/hooks/useWorkflowSurpriseMe";
import { usePromptEnhancement } from "@/hooks/usePromptEnhancement";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { logger } from '@/lib/logger';

interface WorkflowInputPanelProps {
  workflow: WorkflowTemplate;
  onExecute: (inputs: Record<string, any>, shouldGenerateCaption?: boolean) => void;
  onBack: () => void;
  isExecuting: boolean;
  onReset?: () => void;
}

export const WorkflowInputPanel = ({ workflow, onExecute, onBack, isExecuting, onReset }: WorkflowInputPanelProps) => {
  const { user } = useAuth();
  const { pickImage, pickMultipleImages, isLoading: cameraLoading } = useNativeCamera();
  const { data: userTokens } = useUserTokens();
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Enhancement states
  const [enhancePrompt, setEnhancePrompt] = useState(false);
  const [generateCaption, setGenerateCaption] = useState(false);
  const [generatingSurprise, setGeneratingSurprise] = useState(false);
  const { enhancePrompt: enhancePromptFn, isEnhancing } = usePromptEnhancement();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  const { getSurprisePrompt } = useWorkflowSurpriseMe(workflow.category);

  const requiredFields = workflow.user_input_fields?.filter(f => f.required) || [];
  const { estimatedTokens, isCalculating } = useWorkflowTokenCost(workflow, inputs);
  
  const creditBalance = userTokens?.tokens_remaining || 0;
  const hasEnoughCredits = creditBalance >= estimatedTokens;

  const handleInputChange = async (fieldName: string, value: any, shouldEnhance: boolean = false) => {
    // If prompt enhancement is enabled and this is a prompt field
    if (shouldEnhance && enhancePrompt && value && typeof value === 'string') {
      const enhanced = await enhancePromptFn(value, workflow?.name);
      if (enhanced) {
        setInputs(prev => ({
          ...prev,
          [fieldName]: enhanced
        }));
        return;
      }
    }
    
    setInputs(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleFileUpload = async (fieldName: string, files: FileList | null, isMultiple: boolean) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate file types for image uploads
    const invalidFiles = fileArray.filter(f => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast.error(`Invalid file type: ${invalidFiles[0].name}`);
      return;
    }

    setUploadedFiles(prev => ({ ...prev, [fieldName]: fileArray }));
    setIsUploading(true);
    setUploadingField(fieldName);

    try {
      // Upload to storage and get signed URLs
      const timestamp = Date.now();
      const imageUrls: string[] = [];

      for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/uploads/${timestamp}/${i}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        toast.error(`Failed to upload: ${file.name}`);
        logger.error('Workflow file upload failed', uploadError as Error, {
          component: 'WorkflowInputPanel',
          fieldName,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        });
        return;
      }

      const { data: signedData, error: signedError } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(filePath, 3600);

      if (signedError || !signedData) {
        toast.error(`Failed to create URL for: ${file.name}`);
        return;
      }

      imageUrls.push(signedData.signedUrl);
      }

      // Find which parameter this user input maps to across ALL workflow steps
    let targetParameterName: string | null = null;
    let targetParameterSchema: any = null;

    // Check ALL workflow steps to find where this user input is mapped
    for (const step of workflow.workflow_steps || []) {
      for (const [paramKey, mappingSource] of Object.entries(step.input_mappings || {})) {
        if (mappingSource === `user_input.${fieldName}`) {
          targetParameterName = paramKey;
          
          // Get the model schema for this step
          const { data: stepModelData } = await supabase
            .from('ai_models')
            .select('input_schema')
            .eq('record_id', step.model_record_id)
            .single();
          
          const schema = stepModelData?.input_schema as any;
          targetParameterSchema = schema?.properties?.[paramKey];
          break;
        }
      }
      if (targetParameterName) break;
    }

    // Check if target parameter expects an array
    const expectsArray = targetParameterSchema?.type === 'array';

    logger.debug('Workflow parameter array detection', {
      component: 'WorkflowInputPanel',
      userInputField: fieldName,
      targetParameter: targetParameterName,
      targetSchemaType: targetParameterSchema?.type,
      expectsArray,
      storingAs: expectsArray ? 'array' : 'single',
      imageCount: imageUrls.length
    });

      // Store as array or single value based on target parameter type
      if (expectsArray) {
        handleInputChange(fieldName, imageUrls);  // Store as array
      } else {
        handleInputChange(fieldName, imageUrls[0]); // Store as single string
      }
    } finally {
      setIsUploading(false);
      setUploadingField(null);
    }
  };

  const handleNativeCamera = async (fieldName: string, isMultiple: boolean) => {
    const files = isMultiple ? await pickMultipleImages() : [await pickImage()];
    if (files.length > 0 && files[0]) {
      const fileList = new DataTransfer();
      files.forEach(f => f && fileList.items.add(f));
      await handleFileUpload(fieldName, fileList.files, isMultiple);
    }
  };

  const handleExecute = () => {
    // Validate required fields
    for (const field of requiredFields) {
      if (!inputs[field.name]) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    onExecute(inputs, generateCaption);
  };

  const handleSurpriseMe = () => {
    setGeneratingSurprise(true);
    const surprisePrompt = getSurprisePrompt();
    if (surprisePrompt) {
      // Find the first textarea field (usually the prompt field)
      const promptField = workflow.user_input_fields?.find(f => f.type === 'textarea');
      if (promptField) {
        handleInputChange(promptField.name, surprisePrompt);
      }
    }
    setGeneratingSurprise(false);
  };

  const renderInputField = (field: any) => {
    const isMultiple = field.max_files && field.max_files > 1;

    switch (field.type) {
      case 'textarea':
        return (
          <WorkflowPromptInput
            value={inputs[field.name] || ''}
            onChange={(value) => handleInputChange(field.name, value, true)}
            isRequired={field.required || false}
            maxLength={5000}
            onSurpriseMe={handleSurpriseMe}
            onEnhance={setEnhancePrompt}
            enhanceEnabled={enhancePrompt}
            disabled={isExecuting || isUploading || isEnhancing}
            generateCaption={generateCaption}
            onGenerateCaptionChange={setGenerateCaption}
            generatingSurprise={generatingSurprise}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={inputs[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, parseFloat(e.target.value))}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            disabled={isExecuting}
          />
        );

      case 'select':
        return (
          <Select
            value={inputs[field.name] || ''}
            onValueChange={(value) => handleInputChange(field.name, value)}
            disabled={isExecuting}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={inputs[field.name] || false}
              onCheckedChange={(checked) => handleInputChange(field.name, checked)}
              disabled={isExecuting}
            />
            <Label className="text-sm cursor-pointer">{field.label}</Label>
          </div>
        );

      case 'upload-image':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRefs.current[field.name]?.click()}
                disabled={isExecuting || isUploading || cameraLoading}
                className="flex-1"
              >
                {isUploading && uploadingField === field.name ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {isMultiple ? 'Upload Images' : 'Upload Image'}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleNativeCamera(field.name, isMultiple)}
                disabled={isExecuting || isUploading || cameraLoading}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <input
              ref={(el) => (fileInputRefs.current[field.name] = el)}
              type="file"
              accept="image/*"
              multiple={isMultiple}
              onChange={(e) => handleFileUpload(field.name, e.target.files, isMultiple)}
              className="hidden"
            />
            {uploadedFiles[field.name] && uploadedFiles[field.name].length > 0 && (
              <div className="flex flex-wrap gap-2">
                {uploadedFiles[field.name].map((file, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <Input
            type="text"
            value={inputs[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            disabled={isExecuting}
          />
        );
    }
  };

  return (
    <Card className="bg-card border border-border shadow-sm rounded-xl">
      <div className="border-b border-border px-6 py-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{workflow.name}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              disabled={isExecuting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Clear local inputs and uploads
                setInputs({});
                setUploadedFiles({});
                Object.values(fileInputRefs.current).forEach((ref) => {
                  if (ref) ref.value = '';
                });
                onReset?.();
                toast.success('Inputs reset');
              }}
            >
              Reset
            </Button>
          </div>
        </div>
        {workflow.description && (
          <p className="text-sm text-muted-foreground mt-2">{workflow.description}</p>
        )}
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Input Fields */}
        <div className="space-y-4">
          {(() => {
            // Define which fields are "advanced"
            const advancedFieldNames = ['number_of_images', 'numberOfImages', 'output_format', 'outputFormat', 'outputType'];
            
            const regularFields = workflow.user_input_fields?.filter(
              f => !advancedFieldNames.includes(f.name)
            ) || [];
            
            const advancedFields = workflow.user_input_fields?.filter(
              f => advancedFieldNames.includes(f.name)
            ) || [];
            
            return (
              <>
                {/* Render regular fields */}
                {regularFields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    {field.type !== 'textarea' && (
                      <Label className="text-sm font-medium">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                    )}
                    {renderInputField(field)}
                  </div>
                ))}
                
                {/* Advanced options - only show collapsible if 3+ fields */}
                {advancedFields.length >= 3 ? (
                  <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between px-0 hover:bg-transparent"
                      >
                        <span className="text-sm font-medium">Advanced Options</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            advancedOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-4">
                      {advancedFields.map((field) => (
                        <div key={field.name} className="space-y-2">
                          <Label className="text-sm font-medium">
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          {renderInputField(field)}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  /* If less than 3 advanced fields, render them normally */
                  advancedFields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label className="text-sm font-medium">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {renderInputField(field)}
                    </div>
                  ))
                )}
              </>
            );
          })()}
        </div>

        {/* Credit Cost Info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              Estimated Cost
            </span>
            <Badge variant="secondary">{Number(estimatedTokens).toFixed(2)} credits</Badge>
          </div>
        </div>

        {/* Execute Button */}
        <Button
          onClick={handleExecute}
          disabled={isExecuting || isUploading}
          className="w-full"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Uploading images...
            </>
          ) : isExecuting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Create
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
