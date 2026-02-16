import { useQuery } from "@tanstack/react-query";
import { fetchClosedOrdersToday, fetchAllClosedOrders } from "@/lib/supabase-helpers";
import { BarChart3, TrendingUp, Clock, DollarSign, Banknote, QrCode, CreditCard } from "lucide-react";
import { useState } from "react";

const Admin = () => {
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">("dashboard");

  const { data: todayOrders = [] } = useQuery({
    queryKey: ["closed-orders-today"],
    queryFn: fetchClosedOrdersToday,
    refetchInterval: 15000,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ["all-closed-orders"],
    queryFn: fetchAllClosedOrders,
  });

  // Financials
  const totalRevenue = todayOrders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
  const byPayment = todayOrders.reduce((acc: any, o: any) => {
    acc[o.payment_method] = (acc[o.payment_method] || 0) + Number(o.total);
    return acc;
  }, {});

  // Top products
  const productCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  todayOrders.forEach((o: any) => {
    (o.order_items || []).forEach((item: any) => {
      const key = item.product_name;
      if (!productCounts[key]) productCounts[key] = { name: key, count: 0, revenue: 0 };
      productCounts[key].count += item.quantity;
      productCounts[key].revenue += Number(item.total);
    });
  });
  const topProducts = Object.values(productCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Average kitchen time
  const kitchenTimes: number[] = [];
  todayOrders.forEach((o: any) => {
    (o.order_items || []).forEach((item: any) => {
      if (item.created_at && item.ready_at) {
        kitchenTimes.push(
          (new Date(item.ready_at).getTime() - new Date(item.created_at).getTime()) / 60000
        );
      }
    });
  });
  const avgKitchenTime = kitchenTimes.length > 0
    ? Math.round(kitchenTimes.reduce((a, b) => a + b, 0) / kitchenTimes.length)
    : 0;

  const paymentIcons: Record<string, any> = {
    dinheiro: Banknote,
    pix: QrCode,
    cartao: CreditCard,
  };

  const paymentLabels: Record<string, string> = {
    dinheiro: "Dinheiro",
    pix: "Pix",
    cartao: "Cartão",
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl text-primary">Admin</h1>
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === "dashboard" ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}>
          Dashboard
        </button>
        <button onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === "history" ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}>
          Histórico
        </button>
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-4 animate-fade-in">
          {/* Revenue card */}
          <div className="glass-card p-5 glow-primary">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Faturamento Hoje</span>
            </div>
            <p className="text-4xl font-bold text-primary">
              R$ {totalRevenue.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{todayOrders.length} comanda(s) encerrada(s)</p>
          </div>

          {/* Payment breakdown */}
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(byPayment).map(([method, amount]: [string, any]) => {
              const Icon = paymentIcons[method] || DollarSign;
              return (
                <div key={method} className="glass-card p-4 text-center">
                  <Icon className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">{paymentLabels[method] || method}</p>
                  <p className="text-lg font-bold text-foreground">R$ {Number(amount).toFixed(2)}</p>
                </div>
              );
            })}
          </div>

          {/* Avg kitchen time */}
          <div className="glass-card p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Tempo Médio Cozinha</p>
              <p className="text-2xl font-bold text-foreground">{avgKitchenTime} min</p>
            </div>
          </div>

          {/* Top products */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Top 5 Produtos</h3>
            </div>
            {topProducts.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma venda hoje ainda</p>
            )}
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-primary font-bold text-lg w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{p.name}</p>
                    <div className="h-2 bg-secondary rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full gradient-primary rounded-full transition-all"
                        style={{ width: `${(p.count / topProducts[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{p.count}x</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-3 animate-fade-in">
          {allOrders.length === 0 && (
            <p className="text-muted-foreground text-center py-10">Nenhuma comanda encerrada</p>
          )}
          {allOrders.map((order: any) => (
            <div key={order.id} className="glass-card p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-foreground">
                    Mesa {String(order.table_number).padStart(2, "0")}
                    {order.client_name && ` — ${order.client_name}`}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {order.closed_at && new Date(order.closed_at).toLocaleString("pt-BR")}
                    {" · "}
                    {paymentLabels[order.payment_method] || order.payment_method}
                  </p>
                </div>
                <span className="text-lg font-bold text-primary">
                  R$ {Number(order.total).toFixed(2)}
                </span>
              </div>
              <div className="space-y-1">
                {(order.order_items || []).map((item: any) => (
                  <div key={item.id} className="text-xs text-muted-foreground flex justify-between">
                    <span>
                      {item.quantity}x {item.product_name}
                      {item.order_item_extras?.length > 0 && ` (+${item.order_item_extras.map((e: any) => e.extra_name).join(", ")})`}
                    </span>
                    <span>R$ {Number(item.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Admin;
