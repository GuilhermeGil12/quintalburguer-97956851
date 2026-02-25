import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Store, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  out_for_delivery: "Saiu p/ Entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const paymentLabels: Record<string, string> = { dinheiro: "Dinheiro", pix: "Pix", cartao: "Cartão" };

const OnlineOrders = () => {
  const queryClient = useQueryClient();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const { data: onlineOrders = [] } = useQuery({
    queryKey: ["online-orders-page"],
    queryFn: async () => {
      const { data } = await supabase
        .from("online_orders")
        .select("*, online_order_items(*, online_order_item_extras(*))")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    refetchInterval: 5000,
  });

  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    await supabase.from("online_orders").update({ status, updated_at: new Date().toISOString() } as any).eq("id", orderId);
    queryClient.invalidateQueries({ queryKey: ["online-orders-page"] });
    toast.success("Status atualizado!");
  };

  const activeOrders = onlineOrders.filter((o: any) => !["delivered", "cancelled"].includes(o.status));
  const completedOrders = onlineOrders.filter((o: any) => ["delivered", "cancelled"].includes(o.status));

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Globe className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl text-primary">Pedidos Online</h1>
          <p className="text-muted-foreground text-sm">{activeOrders.length} pedido(s) ativo(s)</p>
        </div>
      </div>

      {activeOrders.length === 0 && completedOrders.length === 0 && (
        <p className="text-muted-foreground text-center py-10">Nenhum pedido online</p>
      )}

      {activeOrders.length > 0 && (
        <div className="space-y-3 mb-6">
          <h2 className="text-lg font-bold text-foreground">Ativos</h2>
          {activeOrders.map((order: any) => (
            <OrderCard key={order.id} order={order} expanded={expandedOrders.has(order.id)} onToggle={toggleExpand} onUpdateStatus={handleUpdateStatus} />
          ))}
        </div>
      )}

      {completedOrders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-muted-foreground">Concluídos / Cancelados</h2>
          {completedOrders.map((order: any) => (
            <OrderCard key={order.id} order={order} expanded={expandedOrders.has(order.id)} onToggle={toggleExpand} onUpdateStatus={handleUpdateStatus} />
          ))}
        </div>
      )}
    </div>
  );
};

const OrderCard = ({ order, expanded, onToggle, onUpdateStatus }: { order: any; expanded: boolean; onToggle: (id: string) => void; onUpdateStatus: (id: string, status: string) => void }) => (
  <div className="glass-card p-4">
    <button onClick={() => onToggle(order.id)} className="w-full text-left">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            {order.delivery_type === "delivery" ? <Truck className="h-4 w-4 text-primary" /> : <Store className="h-4 w-4 text-primary" />}
            {order.customer_name}
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </h4>
          <p className="text-xs text-muted-foreground">{order.customer_phone} · {new Date(order.created_at).toLocaleString("pt-BR")}</p>
        </div>
        <span className="text-lg font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
      </div>
    </button>

    {expanded && (
      <div className="space-y-2 mb-3 pt-2 border-t border-border">
        <div className="text-xs space-y-1">
          <p className="text-foreground font-medium">
            {order.delivery_type === "delivery" ? "🚛 Entrega" : "🏪 Retirada no local"}
          </p>
          {order.address && <p className="text-muted-foreground">📍 {order.address}</p>}
          <p className="text-muted-foreground">
            💰 {paymentLabels[order.payment_method] || order.payment_method}
            {order.needs_change && ` · Troco para R$ ${Number(order.change_for).toFixed(2)}`}
          </p>
          {order.notes && <p className="text-warning">Obs: {order.notes}</p>}
        </div>
        {(order.online_order_items || []).map((item: any) => (
          <div key={item.id} className="text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span className="font-medium text-foreground">{item.quantity}x {item.product_name}</span>
              <span>R$ {Number(item.total).toFixed(2)}</span>
            </div>
            {item.online_order_item_extras?.length > 0 && (
              <p className="text-primary ml-4">+ {item.online_order_item_extras.map((e: any) => e.extra_name).join(", ")}</p>
            )}
            {item.observations && <p className="text-warning ml-4">Obs: {item.observations}</p>}
          </div>
        ))}
        {order.delivery_type === "delivery" && order.delivery_fee > 0 && (
          <p className="text-xs text-muted-foreground">Taxa de entrega: R$ {Number(order.delivery_fee).toFixed(2)}</p>
        )}
      </div>
    )}

    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-xs px-3 py-1 rounded-full border ${order.status === "delivered" || order.status === "cancelled" ? "bg-muted text-muted-foreground" : "status-preparing"}`}>
        {statusLabels[order.status] || order.status}
      </span>
      {order.status !== "delivered" && order.status !== "cancelled" && (
        <select value={order.status} onChange={e => onUpdateStatus(order.id, e.target.value)}
          className="h-8 rounded-md bg-secondary border border-border text-foreground px-2 text-xs">
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmado</option>
          <option value="preparing">Preparando</option>
          <option value="out_for_delivery">Saiu p/ Entrega</option>
          <option value="delivered">Entregue</option>
          <option value="cancelled">Cancelado</option>
        </select>
      )}
    </div>
  </div>
);

export default OnlineOrders;
