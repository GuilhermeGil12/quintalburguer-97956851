import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, Truck, Store, Package, ChefHat } from "lucide-react";

const statusSteps = [
  { key: "pending", label: "Recebido", icon: Package },
  { key: "confirmed", label: "Confirmado", icon: CheckCircle2 },
  { key: "preparing", label: "Preparando", icon: ChefHat },
  { key: "out_for_delivery", label: "Saiu p/ Entrega", icon: Truck },
  { key: "delivered", label: "Entregue", icon: CheckCircle2 },
];

const statusStepsPickup = [
  { key: "pending", label: "Recebido", icon: Package },
  { key: "confirmed", label: "Confirmado", icon: CheckCircle2 },
  { key: "preparing", label: "Preparando", icon: ChefHat },
  { key: "delivered", label: "Pronto p/ Retirada", icon: Store },
];

const TrackOrder = () => {
  const { id } = useParams();

  const { data: order, isLoading } = useQuery({
    queryKey: ["track-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("online_orders")
        .select("*, online_order_items(*, online_order_item_extras(*))")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="glass-card p-8 text-center max-w-sm">
          <p className="text-xl text-foreground">Pedido não encontrado</p>
          <p className="text-sm text-muted-foreground mt-2">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  const steps = order.delivery_type === "delivery" ? statusSteps : statusStepsPickup;
  const currentIdx = steps.findIndex(s => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-8 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl text-primary">🍔 Quintal Burguer</h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhe seu pedido</p>
      </div>

      {isCancelled ? (
        <div className="glass-card p-6 text-center border-destructive/50">
          <p className="text-xl text-destructive font-bold">Pedido Cancelado</p>
          <p className="text-sm text-muted-foreground mt-2">Entre em contato conosco para mais informações.</p>
        </div>
      ) : (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Status do Pedido</h2>
          <div className="space-y-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isCurrent ? "gradient-primary text-primary-foreground" :
                    isActive ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs px-2 py-1 rounded-full gradient-primary text-primary-foreground animate-pulse">Agora</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="glass-card p-5">
        <h2 className="text-lg font-bold text-foreground mb-3">Detalhes do Pedido</h2>
        <p className="text-sm text-muted-foreground mb-1">{order.customer_name} · {order.customer_phone}</p>
        <p className="text-sm text-muted-foreground mb-3">
          {order.delivery_type === "delivery" ? `📍 ${order.address}` : "🏪 Retirada no local"}
        </p>
        <div className="space-y-2 border-t border-border pt-3">
          {(order.online_order_items || []).map((item: any) => (
            <div key={item.id} className="text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-foreground">{item.quantity}x {item.product_name}</span>
                <span className="text-muted-foreground">R$ {Number(item.total).toFixed(2)}</span>
              </div>
              {item.online_order_item_extras?.length > 0 && (
                <p className="text-xs text-primary ml-4">+ {item.online_order_item_extras.map((e: any) => e.extra_name).join(", ")}</p>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-3 pt-3 space-y-1">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>R$ {Number(order.subtotal).toFixed(2)}</span></div>
          {order.delivery_fee > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Entrega</span><span>R$ {Number(order.delivery_fee).toFixed(2)}</span></div>}
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">R$ {Number(order.total).toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;
