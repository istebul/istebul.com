-- Vacation scenario destination images (replace placeholder.svg with demo assets)

UPDATE public.vacation_scenarios
SET image_url = '/assets/images/demo/lara-resort.svg'
WHERE slug = 'antalya-belek'
  AND image_url = '/assets/images/placeholder.svg';

UPDATE public.vacation_scenarios
SET image_url = '/assets/images/demo/urla-villa.svg'
WHERE slug = 'kusadasi-didim'
  AND image_url = '/assets/images/placeholder.svg';

UPDATE public.vacation_scenarios
SET image_url = '/assets/images/demo/karadeniz-yayla.svg'
WHERE slug = 'bodrum-torba'
  AND image_url = '/assets/images/placeholder.svg';
