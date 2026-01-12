-- Allow additional storyboard style: pop-art
-- Existing generate-storyboard can send style='pop-art' which currently violates storyboards_style_check

ALTER TABLE public.storyboards
DROP CONSTRAINT IF EXISTS storyboards_style_check;

ALTER TABLE public.storyboards
ADD CONSTRAINT storyboards_style_check
CHECK (
  style = ANY (
    ARRAY[
      'hyper-realistic'::text,
      'cinematic'::text,
      'animated'::text,
      'cartoon'::text,
      'natural'::text,
      'sketch'::text,
      'pop-art'::text
    ]
  )
);
