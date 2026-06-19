-- Public site contact email (admin Ayarlar → Site Bilgileri mirrors this key)
INSERT INTO public.site_settings (key, value, updated_at)
VALUES ('email', 'info@istebul.com', now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();
