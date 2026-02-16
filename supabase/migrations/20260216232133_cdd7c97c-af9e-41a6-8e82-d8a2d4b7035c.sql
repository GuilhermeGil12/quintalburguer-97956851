
-- Categories enum
CREATE TYPE public.product_category AS ENUM ('lanches', 'bebidas', 'sobremesas', 'porcoes');

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category product_category NOT NULL DEFAULT 'lanches',
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extras/Adicionais table
CREATE TABLE public.extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tables (mesas)
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders (comandas)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES public.tables(id),
  table_number INTEGER NOT NULL,
  client_name TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  payment_method TEXT CHECK (payment_method IN ('dinheiro', 'pix', 'cartao', NULL)),
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  extras_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  for_whom TEXT,
  observations TEXT,
  kitchen_status TEXT NOT NULL DEFAULT 'pending' CHECK (kitchen_status IN ('pending', 'preparing', 'ready')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ
);

-- Order item extras (junction)
CREATE TABLE public.order_item_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE NOT NULL,
  extra_id UUID REFERENCES public.extras(id) NOT NULL,
  extra_name TEXT NOT NULL,
  extra_price NUMERIC(10,2) NOT NULL
);

-- Enable RLS on all tables (public access for now - restaurant internal system)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_extras ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (internal restaurant system, no auth needed)
CREATE POLICY "Public access" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.extras FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.tables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.order_item_extras FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for kitchen display
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Seed initial tables (10 mesas)
INSERT INTO public.tables (number) VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10);

-- Seed some extras
INSERT INTO public.extras (name, price) VALUES 
  ('Bacon', 4.00),
  ('Queijo Extra', 3.00),
  ('Ovo', 2.50),
  ('Cheddar', 3.50),
  ('Catupiry', 3.50),
  ('Cebola Caramelizada', 3.00);

-- Seed some products
INSERT INTO public.products (name, description, price, category) VALUES
  ('X-Burger', 'Hambúrguer artesanal com queijo', 25.00, 'lanches'),
  ('X-Bacon', 'Hambúrguer com bacon crocante', 28.00, 'lanches'),
  ('X-Tudo', 'Hambúrguer completo com tudo', 32.00, 'lanches'),
  ('Smash Burger', 'Duplo smash com blend especial', 30.00, 'lanches'),
  ('Coca-Cola', 'Lata 350ml', 6.00, 'bebidas'),
  ('Guaraná', 'Lata 350ml', 6.00, 'bebidas'),
  ('Suco Natural', 'Laranja ou Limão', 8.00, 'bebidas'),
  ('Água', 'Mineral 500ml', 4.00, 'bebidas'),
  ('Batata Frita', 'Porção grande', 18.00, 'porcoes'),
  ('Onion Rings', 'Porção de anéis de cebola', 16.00, 'porcoes'),
  ('Brownie', 'Com sorvete de baunilha', 15.00, 'sobremesas'),
  ('Milkshake', 'Chocolate, Morango ou Baunilha', 14.00, 'sobremesas');
