REVOKE ALL ON FUNCTION public.claim_subscription_workflow(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heartbeat_subscription_workflow(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_subscription_workflow(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_subscription_workflow(uuid, text, integer) TO service_role;