import { supabase } from "@/integrations/supabase/client";

// Products
export const fetchProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("category")
    .order("name");
  if (error) throw error;
  return data;
};

export const fetchAvailableProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("available", true)
    .order("category")
    .order("name");
  if (error) throw error;
  return data;
};

export const upsertProduct = async (product: {
  id?: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  available?: boolean;
}) => {
  const { data, error } = await supabase
    .from("products")
    .upsert(product as any)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
};

// Extras
export const fetchExtras = async () => {
  const { data, error } = await supabase.from("extras").select("*").order("name");
  if (error) throw error;
  return data;
};

export const upsertExtra = async (extra: { id?: string; name: string; price: number; available?: boolean }) => {
  const { data, error } = await supabase.from("extras").upsert(extra as any).select().single();
  if (error) throw error;
  return data;
};

// Tables
export const fetchTables = async () => {
  const { data, error } = await supabase.from("tables").select("*").order("number");
  if (error) throw error;
  return data;
};

export const updateTableStatus = async (id: string, status: string) => {
  const { error } = await supabase.from("tables").update({ status }).eq("id", id);
  if (error) throw error;
};

// Orders
export const fetchOpenOrders = async () => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, order_item_extras(*))")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const fetchOrdersByTable = async (tableNumber: number) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, order_item_extras(*))")
    .eq("table_number", tableNumber)
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const createOrder = async (tableId: string, tableNumber: number, clientName?: string) => {
  const { data, error } = await supabase
    .from("orders")
    .insert({ table_id: tableId, table_number: tableNumber, client_name: clientName || `Mesa ${tableNumber}` } as any)
    .select()
    .single();
  if (error) throw error;
  // Mark table as occupied
  await updateTableStatus(tableId, "occupied");
  return data;
};

export const closeOrder = async (orderId: string, paymentMethod: string, total: number) => {
  const { error } = await supabase
    .from("orders")
    .update({ status: "closed", payment_method: paymentMethod, total, closed_at: new Date().toISOString() } as any)
    .eq("id", orderId);
  if (error) throw error;
};

// Order Items
export const addOrderItem = async (item: {
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  extras_total: number;
  total: number;
  for_whom?: string;
  observations?: string;
}) => {
  const { data, error } = await supabase
    .from("order_items")
    .insert(item as any)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const addOrderItemExtras = async (
  orderItemId: string,
  extras: { extra_id: string; extra_name: string; extra_price: number }[]
) => {
  if (extras.length === 0) return;
  const rows = extras.map((e) => ({ order_item_id: orderItemId, ...e }));
  const { error } = await supabase.from("order_item_extras").insert(rows as any);
  if (error) throw error;
};

export const updateOrderTotal = async (orderId: string) => {
  const { data: items } = await supabase
    .from("order_items")
    .select("total")
    .eq("order_id", orderId);
  const total = (items || []).reduce((sum, i) => sum + Number(i.total), 0);
  await supabase.from("orders").update({ total } as any).eq("id", orderId);
  return total;
};

// Kitchen
export const fetchKitchenItems = async () => {
  const { data, error } = await supabase
    .from("order_items")
    .select("*, order_item_extras(*), orders!inner(table_number, client_name)")
    .in("kitchen_status", ["pending", "preparing"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
};

export const updateKitchenStatus = async (itemId: string, status: string) => {
  const updates: any = { kitchen_status: status };
  if (status === "preparing") updates.started_at = new Date().toISOString();
  if (status === "ready") updates.ready_at = new Date().toISOString();
  const { error } = await supabase.from("order_items").update(updates).eq("id", itemId);
  if (error) throw error;
};

// Admin / Analytics
export const fetchClosedOrdersToday = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, order_item_extras(*))")
    .eq("status", "closed")
    .gte("closed_at", today.toISOString())
    .order("closed_at", { ascending: false });
  if (error) throw error;
  return data;
};

export const fetchAllClosedOrders = async () => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, order_item_extras(*))")
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
};
