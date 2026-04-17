-- Fix 1: Restrict purchases public read - the existing ALL policy used USING(true) which exposed customer emails publicly
DROP POLICY IF EXISTS "Service role can manage purchases" ON public.purchases;

CREATE POLICY "Service role can manage purchases"
ON public.purchases
FOR ALL
TO public
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- "Users can view own purchases" already exists and stays; admins should also be able to read
CREATE POLICY "Admins can view all purchases"
ON public.purchases
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Fix 2: Add explicit SELECT policy for admins on admin_library so authenticated admins can read it
CREATE POLICY "Admins can view admin library"
ON public.admin_library
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert admin library"
ON public.admin_library
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete admin library"
ON public.admin_library
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Fix 3: Tighten subscriptions table (also had USING(true) ALL policy)
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions
FOR ALL
TO public
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));