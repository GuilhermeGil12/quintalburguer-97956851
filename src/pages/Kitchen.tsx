import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchKitchenItems, updateKitchenStatus } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import { ChefHat, Clock, CheckCircle2, AlertTriangle, Volume2, VolumeX, Truck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const notificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "triangle";
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = "triangle";
      gain2.gain.value = 0.3;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.3);
    }, 300);
  } catch {}
};

const Kitchen = () => {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevCountRef = useRef<number>(0);
  const [newItemFlash, setNewItemFlash] = useState(false);

  // Presential kitchen items
  const { data: items = [] } = useQuery({
    queryKey: ["kitchen-items"],
    queryFn: fetchKitchenItems,
    refetchInterval: 10000,
  });

  // Online order items that need kitchen attention
  const { data: onlineOrders = [] } = useQuery({
    queryKey: ["kitchen-online-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("online_orders")
        .select("*, online_order_items(*, online_order_item_extras(*))")
        .in("status", ["pending", "confirmed", "preparing"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  // Combine counts for notification
  const totalCount = items.length + onlineOrders.length;

  useEffect(() => {
    if (prevCountRef.current > 0 && totalCount > prevCountRef.current && soundEnabled) {
      notificationSound();
      setNewItemFlash(true);
      toast.info("🔔 Novo pedido na cozinha!");
      setTimeout(() => setNewItemFlash(false), 2000);
    }
    prevCountRef.current = totalCount;
  }, [totalCount, soundEnabled]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("kitchen-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        queryClient.invalidateQueries({ queryKey: ["kitchen-items"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "online_orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["kitchen-online-orders"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Timer for elapsed time
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (createdAt: string) => {
    const totalSeconds = Math.floor((now - new Date(createdAt).getTime()) / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getElapsedMinutes = (createdAt: string) => Math.floor((now - new Date(createdAt).getTime()) / 60000);

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateKitchenStatus(id, status);
      queryClient.invalidateQueries({ queryKey: ["kitchen-items"] });
      toast.success(status === "preparing" ? "Iniciando preparo!" : "Pedido pronto!");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleOnlineStatus = async (orderId: string, status: string) => {
    try {
      await supabase.from("online_orders").update({ status, updated_at: new Date().toISOString() } as any).eq("id", orderId);
      queryClient.invalidateQueries({ queryKey: ["kitchen-online-orders"] });
      toast.success("Status do pedido online atualizado!");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const pendingItems = items.filter((i: any) => i.kitchen_status === "pending");
  const preparingItems = items.filter((i: any) => i.kitchen_status === "preparing");

  return (
    <div className={`min-h-screen pb-24 px-4 pt-6 ${newItemFlash ? "animate-pulse" : ""}`}>
      <div className="flex items-center gap-3 mb-6">
        <ChefHat className="h-8 w-8 text-primary" />
        <div className="flex-1">
          <h1 className="text-3xl text-primary">Cozinha</h1>
          <p className="text-sm text-muted-foreground">
            {pendingItems.length} pendente(s) · {preparingItems.length} em preparo · {onlineOrders.length} online
          </p>
        </div>
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="touch-target p-2 text-muted-foreground hover:text-foreground">
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </div>

      {items.length === 0 && onlineOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CheckCircle2 className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg">Nenhum pedido no momento</p>
        </div>
      )}

      {/* Online orders section */}
      {onlineOrders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl text-primary mb-3 flex items-center gap-2">
            <Truck className="h-5 w-5" /> Pedidos Online
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {onlineOrders.map((order: any) => {
              const elapsed = getElapsedMinutes(order.created_at);
              const isAlert = elapsed >= 20;
              return (
                <div key={order.id} className={`glass-card p-4 animate-slide-up transition-all border-2 border-primary/40 ${isAlert ? "status-alert" : ""}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {order.delivery_type === "delivery" ? <Truck className="h-5 w-5 text-primary" /> : <Store className="h-5 w-5 text-primary" />}
                      <span className="text-lg font-bold text-foreground">{order.customer_name}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-mono ${isAlert ? "text-destructive" : "text-muted-foreground"}`}>
                      {isAlert && <AlertTriangle className="h-4 w-4" />}
                      <Clock className="h-4 w-4" />
                      {formatElapsed(order.created_at)}
                    </div>
                  </div>
                  <div className="mb-3 space-y-1">
                    {(order.online_order_items || []).map((item: any) => (
                      <div key={item.id}>
                        <h3 className="text-base font-bold text-foreground">{item.quantity}x {item.product_name}</h3>
                        {item.online_order_item_extras?.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            Adicionais: {item.online_order_item_extras.map((e: any) => e.extra_name).join(", ")}
                          </p>
                        )}
                        {item.observations && <p className="text-sm text-warning font-medium">⚠ {item.observations}</p>}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {order.delivery_type === "delivery" ? `📍 ${order.address}` : "🏪 Retirada no local"}
                    {" · "}{order.payment_method === "dinheiro" ? "💵 Dinheiro" : order.payment_method === "pix" ? "📱 Pix" : "💳 Cartão"}
                    {order.needs_change && ` · Troco p/ R$ ${Number(order.change_for).toFixed(2)}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-3 py-1 rounded-full border status-preparing">
                      {order.status === "pending" ? "Pendente" : order.status === "confirmed" ? "Confirmado" : "Preparando"}
                    </span>
                    <div className="flex-1" />
                    {order.status === "pending" && (
                      <Button onClick={() => handleOnlineStatus(order.id, "preparing")} size="sm" className="h-10 px-4 gradient-primary text-primary-foreground touch-target">
                        Iniciar Preparo
                      </Button>
                    )}
                    {(order.status === "confirmed" || order.status === "preparing") && (
                      <Button onClick={() => handleOnlineStatus(order.id, order.delivery_type === "delivery" ? "out_for_delivery" : "delivered")} size="sm"
                        className="h-10 px-4 bg-success text-success-foreground hover:bg-success/90 touch-target">
                        <CheckCircle2 className="h-4 w-4 mr-1" /> {order.delivery_type === "delivery" ? "Saiu Entrega" : "Pronto!"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Presential orders section */}
      {items.length > 0 && (
        <>
          {onlineOrders.length > 0 && <h2 className="text-xl text-primary mb-3">🍔 Pedidos Presenciais</h2>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item: any) => {
              const elapsed = getElapsedMinutes(item.created_at);
              const isAlert = elapsed >= 20;
              const isPreparing = item.kitchen_status === "preparing";

              return (
                <div key={item.id} className={`glass-card p-4 animate-slide-up transition-all ${isAlert ? "status-alert border" : isPreparing ? "border border-primary/30" : ""}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">
                        Mesa {String(item.orders?.table_number).padStart(2, "0")}
                      </span>
                      {item.orders?.client_name && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">
                          {item.orders.client_name}
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-mono ${isAlert ? "text-destructive" : "text-muted-foreground"}`}>
                      {isAlert && <AlertTriangle className="h-4 w-4" />}
                      <Clock className="h-4 w-4" />
                      {formatElapsed(item.created_at)}
                    </div>
                  </div>

                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-foreground">
                      {item.quantity}x {item.product_name}
                    </h3>
                    {item.for_whom && <p className="text-sm text-primary mt-1">→ {item.for_whom}</p>}
                    {item.order_item_extras?.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Adicionais: {item.order_item_extras.map((e: any) => e.extra_name).join(", ")}
                      </p>
                    )}
                    {item.observations && <p className="text-sm text-warning mt-1 font-medium">⚠ {item.observations}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full border ${isPreparing ? "status-preparing" : "status-pending"}`}>
                      {isPreparing ? "Em Preparo" : "Pendente"}
                    </span>
                    <div className="flex-1" />
                    {!isPreparing ? (
                      <Button onClick={() => handleStatus(item.id, "preparing")} size="sm" className="h-10 px-4 gradient-primary text-primary-foreground touch-target">
                        Iniciar Preparo
                      </Button>
                    ) : (
                      <Button onClick={() => handleStatus(item.id, "ready")} size="sm" className="h-10 px-4 bg-success text-success-foreground hover:bg-success/90 touch-target">
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Pronto!
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Kitchen;
