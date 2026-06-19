-- Canonical posts.category values (auto, housing, finance, insurance, travel).

UPDATE public.posts SET category = 'housing' WHERE category = 'konut';
UPDATE public.posts SET category = 'finance' WHERE category = 'finans';
UPDATE public.posts SET category = 'insurance' WHERE category = 'sigorta';
UPDATE public.posts SET category = 'travel' WHERE category = 'tatil';

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_category_check;

ALTER TABLE public.posts ADD CONSTRAINT posts_category_check
  CHECK (category IN ('auto', 'housing', 'finance', 'insurance', 'travel'));

NOTIFY pgrst, 'reload schema';
