-- Güncel haberler vs blog ayrımı + kapak görseli depolama (yüklenen dosya).

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'news';

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
  ON public.posts (content_type, category, is_published, is_featured DESC, created_at DESC);

UPDATE public.posts SET content_type = 'news' WHERE content_type IS NULL OR content_type = '';

-- Public cover images bucket (admin upload, world-readable).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-covers',
  'content-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read content covers" ON storage.objects;
CREATE POLICY "Public read content covers"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'content-covers');

DROP POLICY IF EXISTS "Admins insert content covers" ON storage.objects;
CREATE POLICY "Admins insert content covers"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'content-covers' AND public.is_admin());

DROP POLICY IF EXISTS "Admins update content covers" ON storage.objects;
CREATE POLICY "Admins update content covers"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'content-covers' AND public.is_admin())
  WITH CHECK (bucket_id = 'content-covers' AND public.is_admin());

DROP POLICY IF EXISTS "Admins delete content covers" ON storage.objects;
CREATE POLICY "Admins delete content covers"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'content-covers' AND public.is_admin());
