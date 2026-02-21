
-- Profiles table for staff users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Service insert profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add attendant_name to orders
ALTER TABLE public.orders ADD COLUMN attendant_name TEXT;

-- Ingredients table
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL DEFAULT 'un',
  stock_qty NUMERIC NOT NULL DEFAULT 0,
  min_alert NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access ingredients" ON public.ingredients FOR ALL USING (true) WITH CHECK (true);

-- Product recipes (what ingredients each product uses)
CREATE TABLE public.product_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE NOT NULL,
  qty_used NUMERIC NOT NULL DEFAULT 1,
  UNIQUE(product_id, ingredient_id)
);

ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access product_ingredients" ON public.product_ingredients FOR ALL USING (true) WITH CHECK (true);

-- Online orders table
CREATE TABLE public.online_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  address TEXT,
  delivery_type TEXT NOT NULL DEFAULT 'delivery', -- 'delivery' or 'pickup'
  payment_method TEXT NOT NULL DEFAULT 'pix',
  needs_change BOOLEAN NOT NULL DEFAULT false,
  change_for NUMERIC,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, preparing, out_for_delivery, delivered, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access online_orders" ON public.online_orders FOR ALL USING (true) WITH CHECK (true);

-- Online order items
CREATE TABLE public.online_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  online_order_id UUID REFERENCES public.online_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  extras_total NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL,
  observations TEXT
);

ALTER TABLE public.online_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access online_order_items" ON public.online_order_items FOR ALL USING (true) WITH CHECK (true);

-- Online order item extras
CREATE TABLE public.online_order_item_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  online_order_item_id UUID REFERENCES public.online_order_items(id) ON DELETE CASCADE NOT NULL,
  extra_id UUID REFERENCES public.extras(id) NOT NULL,
  extra_name TEXT NOT NULL,
  extra_price NUMERIC NOT NULL
);

ALTER TABLE public.online_order_item_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access online_order_item_extras" ON public.online_order_item_extras FOR ALL USING (true) WITH CHECK (true);

-- Settings table for delivery fee etc
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Authenticated write settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default delivery fee
INSERT INTO public.settings (key, value) VALUES ('delivery_fee', '5.00');

-- Enable realtime for online orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_orders;
