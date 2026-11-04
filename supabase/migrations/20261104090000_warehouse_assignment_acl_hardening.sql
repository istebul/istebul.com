REVOKE ALL
ON TABLE public.warehouse_user_warehouse_assignments
FROM authenticated;

GRANT SELECT, INSERT, DELETE
ON TABLE public.warehouse_user_warehouse_assignments
TO authenticated;
