-- Repair: full posts schema for Güncel haberler / blog (when db push drift blocks 20260621+)

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  slug text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false
);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'auto';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS excerpt text NOT NULL DEFAULT '';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS source_label text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'news';

UPDATE public.posts SET content_type = 'news' WHERE content_type IS NULL OR content_type = '';
UPDATE public.posts SET excerpt = '' WHERE excerpt IS NULL;
UPDATE public.posts SET category = 'auto' WHERE category IS NULL OR category = '';
UPDATE public.posts SET is_featured = false WHERE is_featured IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_slug_key') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_slug_key UNIQUE (slug);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_category_check') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_category_check
      CHECK (category IN ('auto', 'konut', 'tatil', 'finans', 'sigorta'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_content_type_check') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_content_type_check
      CHECK (content_type IN ('news', 'blog'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS posts_category_published_idx
  ON public.posts (category, is_published, is_featured DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS posts_content_type_published_idx
  ON public.posts (content_type, is_published, is_featured DESC, created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published posts" ON public.posts;
CREATE POLICY "Public read published posts"
  ON public.posts FOR SELECT TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "Admins manage posts" ON public.posts;
CREATE POLICY "Admins manage posts"
  ON public.posts FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.posts TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
