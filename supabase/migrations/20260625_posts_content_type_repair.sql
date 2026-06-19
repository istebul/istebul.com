-- Repair: posts.content_type (idempotent when 20260624 not applied via db push)

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'news';

UPDATE public.posts
SET content_type = 'news'
WHERE content_type IS NULL OR content_type = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_content_type_check'
  ) THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_content_type_check
      CHECK (content_type IN ('news', 'blog'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS posts_content_type_published_idx
  ON public.posts (content_type, is_published, is_featured DESC, created_at DESC);

NOTIFY pgrst, 'reload schema';
