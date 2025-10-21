-- Add before/after image URLs to workflow_templates for image comparison slider
ALTER TABLE workflow_templates
ADD COLUMN before_image_url TEXT,
ADD COLUMN after_image_url TEXT;

COMMENT ON COLUMN workflow_templates.before_image_url IS 'URL of the original/input image for before/after comparison';
COMMENT ON COLUMN workflow_templates.after_image_url IS 'URL of the enhanced/output image for before/after comparison';