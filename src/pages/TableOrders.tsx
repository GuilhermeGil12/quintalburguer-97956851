import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchOrdersByTable, closeOrder, fetchAvailableProducts, fetchExtras, addOrderItem, addOrderItemExtras, updateOrderTotal, updateTableStatus } from "@/lib/supabase-helpers";
import { ArrowLeft, Plus, X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import AddItemSheet from "@/components/AddItemSheet";
import CloseOrderDialog from "@/components/CloseOrderDialog";
import NewOrderDialog from "@/components/NewOrderDialog";
import { toast } from "sonner";

const TableOrders = () => {
  const { number } = useParams();
  const tableNumber = parseInt(number || "0");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addingToOrder, setAddingToOrder] = useState<string | null>(null);
  const [closingOrder, setClosingOrder] = useState<any>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);

  const { data: orders = [], refetch } = useQuery({
    queryKey: ["table-orders", tableNumber],
    queryFn: () => fetchOrdersByTable(tableNumber),
    refetchInterval: 5000,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.from("tables").select("*").eq("number", tableNumber).single();
      return data;
    },
  });

  const handleCloseOrder = async (orderId: string, paymentMethod: string, total: number) => {
    try {
      await closeOrder(orderId, paymentMethod, total);
      toast.success("Comanda encerrada!");
      queryClient.invalidateQueries({ queryKey: ["table-orders", tableNumber] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      // Check if this was the last order for the table
      const remaining = orders.filter((o: any) => o.id !== orderId);
      if (remaining.length === 0 && tables) {
        await updateTableStatus((tables as any).id, "available");
        queryClient.invalidateQueries({ queryKey: ["tables"] });
        navigate("/");
      }
      setClosingOrder(null);
    } catch {
      toast.error("Erro ao encerrar comanda");
    }
  };

  return (
    <div className="min-h-screen pb-8 px-4 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/")} className="touch-target p-2 -ml-2">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>
        <div>
          <h1 className="text-3xl text-primary">Mesa {String(tableNumber).padStart(2, "0")}</h1>
          <p className="text-sm text-muted-foreground">{orders.length} comanda(s) aberta(s)</p>
        </div>
        <Button
          onClick={() => setShowNewOrder(true)}
          variant="outline"
          size="sm"
          className="ml-auto border-primary/30 text-primary hover:bg-primary/10"
        >
          <Plus className="h-4 w-4 mr-1" /> Nova Comanda
        </Button>
      </div>

      <div className="space-y-4">
        {orders.map((order: any) => (
          <div key={order.id} className="glass-card p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {order.client_name || `Comanda`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className="text-xl font-bold text-primary">
                R$ {Number(order.total).toFixed(2)}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              {(order.order_items || []).map((item: any) => (
                <div key={item.id} className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-foreground">{item.quantity}x {item.product_name}</span>
                      {item.for_whom && (
                        <span className="text-xs text-primary ml-2">→ {item.for_whom}</span>
                      )}
                      {item.order_item_extras?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          + {item.order_item_extras.map((e: any) => e.extra_name).join(", ")}
                        </p>
                      )}
                      {item.observations && (
                        <p className="text-xs text-warning mt-0.5">Obs: {item.observations}</p>
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      R$ {Number(item.total).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      item.kitchen_status === "ready" ? "status-ready" :
                      item.kitchen_status === "preparing" ? "status-preparing" : "status-pending"
                    }`}>
                      {item.kitchen_status === "ready" ? "Pronto" :
                       item.kitchen_status === "preparing" ? "Em Preparo" : "Pendente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setAddingToOrder(order.id)}
                className="flex-1 h-12 touch-target gradient-primary text-primary-foreground"
              >
                <Plus className="h-5 w-5 mr-1" /> Adicionar Item
              </Button>
              <Button
                onClick={() => setClosingOrder(order)}
                variant="outline"
                className="h-12 touch-target border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <ShoppingBag className="h-5 w-5 mr-1" /> Fechar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {addingToOrder && (
        <AddItemSheet
          orderId={addingToOrder}
          open={!!addingToOrder}
          onClose={() => {
            setAddingToOrder(null);
            refetch();
          }}
        />
      )}

      {closingOrder && (
        <CloseOrderDialog
          order={closingOrder}
          open={!!closingOrder}
          onClose={() => setClosingOrder(null)}
          onConfirm={handleCloseOrder}
        />
      )}

      {showNewOrder && tables && (
        <NewOrderDialog
          table={{ id: (tables as any).id, number: tableNumber }}
          open={showNewOrder}
          onClose={() => {
            setShowNewOrder(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default TableOrders;
