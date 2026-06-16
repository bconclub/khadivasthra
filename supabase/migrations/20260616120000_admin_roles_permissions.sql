-- Admin roles & per-section permissions
-- ---------------------------------------------------------------------------
-- Adds an admin_profiles table linked to auth.users, helper functions, and
-- rewrites every admin write policy so access is enforced PER SECTION in the
-- database (not just hidden in the UI). A staff user with only 'products' can
-- never write categories/orders/etc, even calling the API directly.
--
-- Permission keys (sections): dashboard, products, categories, orders,
-- banners, settings, users. role 'super_admin' implies ALL.
-- ---------------------------------------------------------------------------

-- 1. Profiles table -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'staff')),
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- keep updated_at fresh (reuse the project's existing trigger fn if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_admin_profiles_updated_at ON admin_profiles;
    CREATE TRIGGER update_admin_profiles_updated_at
      BEFORE UPDATE ON admin_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 2. Helper functions (SECURITY DEFINER -> no recursive RLS) -------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = auth.uid() AND is_active AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_can(resource TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = auth.uid()
      AND is_active
      AND (role = 'super_admin' OR resource = ANY(permissions))
  );
$$;

-- 3. RLS on admin_profiles ----------------------------------------------------
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own or all profiles" ON admin_profiles;
DROP POLICY IF EXISTS "super admin manage profiles" ON admin_profiles;

-- a logged-in user can read their own profile (to load permissions);
-- super admins can read everyone.
CREATE POLICY "read own or all profiles" ON admin_profiles
  FOR SELECT USING (id = auth.uid() OR public.is_super_admin());

-- only super admins can write profiles directly (the edge function uses the
-- service role and bypasses RLS anyway; this guards the anon/auth client).
CREATE POLICY "super admin manage profiles" ON admin_profiles
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 4. Rewrite write policies on content tables ---------------------------------
-- Drop every previously-known admin write policy name, then recreate gated.

-- categories
DROP POLICY IF EXISTS "Admin manage categories" ON categories;
CREATE POLICY "Admin manage categories" ON categories
  FOR ALL USING (public.admin_can('categories')) WITH CHECK (public.admin_can('categories'));

-- products
DROP POLICY IF EXISTS "Admin manage products" ON products;
CREATE POLICY "Admin manage products" ON products
  FOR ALL USING (public.admin_can('products')) WITH CHECK (public.admin_can('products'));

-- product_colors (gated under 'products')
DROP POLICY IF EXISTS "Admin manage product colors" ON product_colors;
DROP POLICY IF EXISTS "admin_manage_colors" ON product_colors;
CREATE POLICY "admin_manage_colors" ON product_colors
  FOR ALL USING (public.admin_can('products')) WITH CHECK (public.admin_can('products'));

-- product_variants (gated under 'products')
DROP POLICY IF EXISTS "Admin manage product variants" ON product_variants;
DROP POLICY IF EXISTS "admin_manage_variants" ON product_variants;
CREATE POLICY "admin_manage_variants" ON product_variants
  FOR ALL USING (public.admin_can('products')) WITH CHECK (public.admin_can('products'));

-- orders
DROP POLICY IF EXISTS "Admin manage orders" ON orders;
CREATE POLICY "Admin manage orders" ON orders
  FOR ALL USING (public.admin_can('orders')) WITH CHECK (public.admin_can('orders'));

-- settings
DROP POLICY IF EXISTS "Admin manage settings" ON settings;
CREATE POLICY "Admin manage settings" ON settings
  FOR ALL USING (public.admin_can('settings')) WITH CHECK (public.admin_can('settings'));

-- banners
DROP POLICY IF EXISTS "Admin manage banners" ON banners;
CREATE POLICY "Admin manage banners" ON banners
  FOR ALL USING (public.admin_can('banners')) WITH CHECK (public.admin_can('banners'));

-- product_views (dashboard stats) — readable by anyone who can see the dashboard
DROP POLICY IF EXISTS "Admin read views" ON product_views;
CREATE POLICY "Admin read views" ON product_views
  FOR SELECT USING (public.admin_can('dashboard'));

-- 5. Storage policies — gate uploads per matching section ---------------------
DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;
CREATE POLICY "Admin upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND public.admin_can('products'));
CREATE POLICY "Admin update product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND public.admin_can('products'));
CREATE POLICY "Admin delete product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND public.admin_can('products'));

DROP POLICY IF EXISTS "Admin upload category images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update category images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete category images" ON storage.objects;
CREATE POLICY "Admin upload category images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'category-images' AND public.admin_can('categories'));
CREATE POLICY "Admin update category images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'category-images' AND public.admin_can('categories'));
CREATE POLICY "Admin delete category images" ON storage.objects
  FOR DELETE USING (bucket_id = 'category-images' AND public.admin_can('categories'));

DROP POLICY IF EXISTS "Admin upload banner images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update banner images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete banner images" ON storage.objects;
CREATE POLICY "Admin upload banner images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'banner-images' AND public.admin_can('banners'));
CREATE POLICY "Admin update banner images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'banner-images' AND public.admin_can('banners'));
CREATE POLICY "Admin delete banner images" ON storage.objects
  FOR DELETE USING (bucket_id = 'banner-images' AND public.admin_can('banners'));

-- 6. Bootstrap: promote all EXISTING auth users to super_admin ----------------
-- (At migration time the only accounts are owner/admin accounts. New staff
-- created via the Users page default to role 'staff' with explicit permissions.)
INSERT INTO admin_profiles (id, email, role, permissions, is_active)
SELECT u.id, u.email, 'super_admin',
       ARRAY['dashboard','products','categories','orders','banners','settings','users'],
       true
FROM auth.users u
ON CONFLICT (id) DO UPDATE
  SET role = 'super_admin',
      permissions = EXCLUDED.permissions,
      is_active = true;
