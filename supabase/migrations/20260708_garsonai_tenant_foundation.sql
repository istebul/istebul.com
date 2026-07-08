-- GarsonAI P2-B: Restaurant tenant foundation (multi-tenant SaaS schema)

CREATE TABLE IF NOT EXISTS public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  plan text NOT NULL DEFAULT 'starter',
  onboarding_status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurants_slug_key UNIQUE (slug),
  CONSTRAINT restaurants_status_check CHECK (
    status IN ('active', 'inactive', 'pending', 'suspended')
  ),
  CONSTRAINT restaurants_plan_check CHECK (
    plan IN ('starter', 'growth', 'pro', 'enterprise', 'pilot')
  ),
  CONSTRAINT restaurants_onboarding_status_check CHECK (
    onboarding_status IN ('not_started', 'in_progress', 'completed')
  )
);

CREATE INDEX IF NOT EXISTS restaurants_slug_idx ON public.restaurants (slug);
CREATE INDEX IF NOT EXISTS restaurants_status_idx ON public.restaurants (status);

CREATE TABLE IF NOT EXISTS public.restaurant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_users_role_check CHECK (
    role IN ('owner', 'admin', 'kitchen')
  ),
  CONSTRAINT restaurant_users_restaurant_user_key UNIQUE (restaurant_id, user_id)
);

CREATE INDEX IF NOT EXISTS restaurant_users_user_id_idx ON public.restaurant_users (user_id);
CREATE INDEX IF NOT EXISTS restaurant_users_restaurant_id_idx ON public.restaurant_users (restaurant_id);

CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  preorder_enabled boolean NOT NULL DEFAULT false,
  kitchen_enabled boolean NOT NULL DEFAULT false,
  ai_enabled boolean NOT NULL DEFAULT false,
  CONSTRAINT restaurant_settings_restaurant_id_key UNIQUE (restaurant_id)
);

CREATE INDEX IF NOT EXISTS restaurant_settings_restaurant_id_idx
  ON public.restaurant_settings (restaurant_id);

-- Row level security
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurants member read" ON public.restaurants;
CREATE POLICY "restaurants member read"
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurant_users ru
      WHERE ru.restaurant_id = restaurants.id
        AND ru.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "restaurants member update" ON public.restaurants;
CREATE POLICY "restaurants member update"
  ON public.restaurants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurant_users ru
      WHERE ru.restaurant_id = restaurants.id
        AND ru.user_id = auth.uid()
        AND ru.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.restaurant_users ru
      WHERE ru.restaurant_id = restaurants.id
        AND ru.user_id = auth.uid()
        AND ru.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "restaurant_users member read" ON public.restaurant_users;
CREATE POLICY "restaurant_users member read"
  ON public.restaurant_users
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.restaurant_users ru
      WHERE ru.restaurant_id = restaurant_users.restaurant_id
        AND ru.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "restaurant_users owner admin manage" ON public.restaurant_users;
CREATE POLICY "restaurant_users owner admin manage"
  ON public.restaurant_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurant_users ru
      WHERE ru.restaurant_id = restaurant_users.restaurant_id
        AND ru.user_id = auth.uid()
        AND ru.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.restaurant_users ru
      WHERE ru.restaurant_id = restaurant_users.restaurant_id
        AND ru.user_id = auth.uid()
        AND ru.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "restaurant_settings member read" ON public.restaurant_settings;
CREATE POLICY "restaurant_settings member read"
  ON public.restaurant_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurant_users ru
      WHERE ru.restaurant_id = restaurant_settings.restaurant_id
        AND ru.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "restaurant_settings owner admin manage" ON public.restaurant_settings;
CREATE POLICY "restaurant_settings owner admin manage"
  ON public.restaurant_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurant_users ru
      WHERE ru.restaurant_id = restaurant_settings.restaurant_id
        AND ru.user_id = auth.uid()
        AND ru.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.restaurant_users ru
      WHERE ru.restaurant_id = restaurant_settings.restaurant_id
        AND ru.user_id = auth.uid()
        AND ru.role IN ('owner', 'admin')
    )
  );

-- Demo tenant seed (businessId slug: demo-cafe)
INSERT INTO public.restaurants (
  id,
  name,
  slug,
  status,
  plan,
  onboarding_status
)
VALUES (
  'a0000000-0000-4000-8000-00000000cafe'::uuid,
  'Demo Cafe',
  'demo-cafe',
  'active',
  'pilot',
  'completed'
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  plan = EXCLUDED.plan,
  onboarding_status = EXCLUDED.onboarding_status;

INSERT INTO public.restaurant_settings (
  restaurant_id,
  whatsapp_enabled,
  preorder_enabled,
  kitchen_enabled,
  ai_enabled
)
VALUES (
  'a0000000-0000-4000-8000-00000000cafe'::uuid,
  true,
  true,
  true,
  true
)
ON CONFLICT (restaurant_id) DO UPDATE
SET
  whatsapp_enabled = EXCLUDED.whatsapp_enabled,
  preorder_enabled = EXCLUDED.preorder_enabled,
  kitchen_enabled = EXCLUDED.kitchen_enabled,
  ai_enabled = EXCLUDED.ai_enabled;
