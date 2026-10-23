create unique index if not exists warehouse_picking_tasks_active_exact_unique
on public.warehouse_picking_tasks (
  account_id,
  picking_id,
  coalesce(
    picking_item_id,
    '00000000-0000-0000-0000-000000000000'::uuid
  ),
  warehouse_id,
  source_location_id,
  coalesce(
    destination_location_id,
    '00000000-0000-0000-0000-000000000000'::uuid
  )
)
where status in (
  'pending',
  'assigned',
  'in_progress',
  'partially_completed'
);
