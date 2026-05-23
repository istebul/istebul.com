-- Allow authenticated users to read their own subscription row (client account page).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
    CREATE POLICY "Users can read own subscription"
      ON public.subscriptions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
