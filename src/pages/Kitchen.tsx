import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchKitchenItems, updateKitchenStatus } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { ChefHat, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Kitchen = () => {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());

  const { data: items = [] } = useQuery({
    queryKey: ["kitchen-items"],
    queryFn: fetchKitchenItems,
    refetchInterval: 10000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("kitchen-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        queryClient.invalidateQueries({ queryKey: ["kitchen-items"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Timer for elapsed time
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getElapsedMinutes = (createdAt: string) => {
    return Math.floor((now - new Date(createdAt).getTime()) / 60000);
  };

  const formatElapsed = (createdAt: string) => {
    const totalSeconds = Math.floor((now - new Date(createdAt).getTime()) / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateKitchenStatus(id, status);
      queryClient.invalidateQueries({ queryKey: ["kitchen-items"] });
      toast.success(status === "preparing" ? "Iniciando preparo!" : "Pedido pronto!");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const pendingItems = items.filter((i: any) => i.kitchen_status === "pending");
  const preparingItems = items.filter((i: any) => i.kitchen_status === "preparing");

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <ChefHat className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl text-primary">Cozinha</h1>
          <p className="text-sm text-muted-foreground">
            {pendingItems.length} pendente(s) · {preparingItems.length} em preparo
          </p>
        </div>
      </div>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CheckCircle2 className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg">Nenhum pedido no momento</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item: any) => {
          const elapsed = getElapsedMinutes(item.created_at);
          const isAlert = elapsed >= 20;
          const isPreparing = item.kitchen_status === "preparing";

          return (
            <div
              key={item.id}
              className={`glass-card p-4 animate-slide-up transition-all ${
                isAlert ? "status-alert border" : isPreparing ? "border border-primary/30" : ""
              }`}
            >
              {/* Header */}
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

              {/* Item details */}
              <div className="mb-3">
                <h3 className="text-xl font-bold text-foreground">
                  {item.quantity}x {item.product_name}
                </h3>
                {item.for_whom && (
                  <p className="text-sm text-primary mt-1">→ {item.for_whom}</p>
                )}
                {item.order_item_extras?.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Adicionais: {item.order_item_extras.map((e: any) => e.extra_name).join(", ")}
                  </p>
                )}
                {item.observations && (
                  <p className="text-sm text-warning mt-1 font-medium">
                    ⚠ {item.observations}
                  </p>
                )}
              </div>

              {/* Status + Action */}
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full border ${
                  isPreparing ? "status-preparing" : "status-pending"
                }`}>
                  {isPreparing ? "Em Preparo" : "Pendente"}
                </span>
                <div className="flex-1" />
                {!isPreparing ? (
                  <Button
                    onClick={() => handleStatus(item.id, "preparing")}
                    size="sm"
                    className="h-10 px-4 gradient-primary text-primary-foreground touch-target"
                  >
                    Iniciar Preparo
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleStatus(item.id, "ready")}
                    size="sm"
                    className="h-10 px-4 bg-success text-success-foreground hover:bg-success/90 touch-target"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Pronto!
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Kitchen;
