import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Clock, DollarSign, Banknote, QrCode, CreditCard, CalendarDays, Users, Plus, Trash2, Settings, Truck, Store, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Admin = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "users" | "online" | "settings">("dashboard");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [historyMonths, setHistoryMonths] = useState("1");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // User management
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [userLoading, setUserLoading] = useState(false);

  // Settings
  const [deliveryFee, setDeliveryFee] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Fetch orders for selected date
  const { data: dateOrders = [] } = useQuery({
    queryKey: ["closed-orders-date", selectedDate],
    queryFn: async () => {
      const start = new Date(selectedDate + "T00:00:00");
      const end = new Date(selectedDate + "T23:59:59");
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, order_item_extras(*))")
        .eq("status", "closed")
        .gte("closed_at", start.toISOString())
        .lte("closed_at", end.toISOString())
        .order("closed_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 15000,
  });

  // Fetch closed online orders for the selected date (for dashboard revenue)
  const { data: dateOnlineOrders = [] } = useQuery({
    queryKey: ["closed-online-orders-date", selectedDate],
    queryFn: async () => {
      const start = new Date(selectedDate + "T00:00:00");
      const end = new Date(selectedDate + "T23:59:59");
      const { data } = await supabase
        .from("online_orders")
        .select("*, online_order_items(*, online_order_item_extras(*))")
        .eq("status", "delivered")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 15000,
  });

  // History with flexible months
  const { data: allOrders = [] } = useQuery({
    queryKey: ["all-closed-orders", historyMonths],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - Number(historyMonths));
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*, order_item_extras(*))")
        .eq("status", "closed")
        .gte("closed_at", since.toISOString())
        .order("closed_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const { data: allOnlineOrdersHistory = [] } = useQuery({
    queryKey: ["all-online-orders-history", historyMonths],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - Number(historyMonths));
      const { data } = await supabase
        .from("online_orders")
        .select("*, online_order_items(*, online_order_item_extras(*))")
        .eq("status", "delivered")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at");
      return data || [];
    },
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*");
      return data || [];
    },
  });

  const { data: onlineOrders = [] } = useQuery({
    queryKey: ["online-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("online_orders").select("*, online_order_items(*, online_order_item_extras(*))").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    refetchInterval: 10000,
  });

  // Financials for selected date - include both presential and online
  const presentialRevenue = dateOrders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
  const onlineRevenue = dateOnlineOrders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
  const totalRevenue = presentialRevenue + onlineRevenue;

  const byPayment = dateOrders.reduce((acc: any, o: any) => {
    acc[o.payment_method] = (acc[o.payment_method] || 0) + Number(o.total);
    return acc;
  }, {} as Record<string, number>);
  dateOnlineOrders.forEach((o: any) => {
    byPayment[o.payment_method] = (byPayment[o.payment_method] || 0) + Number(o.total);
  });

  // Top products (both presential + online)
  const productCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  dateOrders.forEach((o: any) => {
    (o.order_items || []).forEach((item: any) => {
      const key = item.product_name;
      if (!productCounts[key]) productCounts[key] = { name: key, count: 0, revenue: 0 };
      productCounts[key].count += item.quantity;
      productCounts[key].revenue += Number(item.total);
    });
  });
  dateOnlineOrders.forEach((o: any) => {
    (o.online_order_items || []).forEach((item: any) => {
      const key = item.product_name;
      if (!productCounts[key]) productCounts[key] = { name: key, count: 0, revenue: 0 };
      productCounts[key].count += item.quantity;
      productCounts[key].revenue += Number(item.total);
    });
  });
  const topProducts = Object.values(productCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  // Avg kitchen time
  const kitchenTimes: number[] = [];
  dateOrders.forEach((o: any) => {
    (o.order_items || []).forEach((item: any) => {
      if (item.created_at && item.ready_at) {
        kitchenTimes.push((new Date(item.ready_at).getTime() - new Date(item.created_at).getTime()) / 60000);
      }
    });
  });
  const avgKitchenTime = kitchenTimes.length > 0 ? Math.round(kitchenTimes.reduce((a, b) => a + b, 0) / kitchenTimes.length) : 0;

  const paymentIcons: Record<string, any> = { dinheiro: Banknote, pix: QrCode, cartao: CreditCard };
  const paymentLabels: Record<string, string> = { dinheiro: "Dinheiro", pix: "Pix", cartao: "Cartão" };
  const statusLabels: Record<string, string> = { pending: "Pendente", confirmed: "Confirmado", preparing: "Preparando", out_for_delivery: "Saiu p/ Entrega", delivered: "Entregue", cancelled: "Cancelado" };

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword || !newDisplayName) return;
    setUserLoading(true);
    try {
      const res = await supabase.functions.invoke("create-user", {
        body: { username: newUsername, password: newPassword, display_name: newDisplayName },
      });
      if (res.error) throw res.error;
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Usuário criado!");
      setShowUserForm(false);
      setNewUsername("");
      setNewPassword("");
      setNewDisplayName("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    } finally {
      setUserLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (username === "quintaladmin") {
      toast.error("Não é possível deletar o admin principal");
      return;
    }
    try {
      const res = await supabase.functions.invoke("create-user", {
        body: { action: "delete", user_id: userId },
      });
      if (res.error) throw res.error;
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Usuário removido!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover usuário");
    }
  };

  const handleSaveDeliveryFee = async () => {
    await supabase.from("settings").upsert({ key: "delivery_fee", value: deliveryFee, updated_at: new Date().toISOString() } as any, { onConflict: "key" });
    queryClient.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Taxa atualizada!");
  };

  const handleSaveWhatsappNumber = async () => {
    await supabase.from("settings").upsert({ key: "whatsapp_number", value: whatsappNumber, updated_at: new Date().toISOString() } as any, { onConflict: "key" });
    queryClient.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Número do WhatsApp atualizado!");
  };

  const handleUpdateOnlineOrderStatus = async (orderId: string, status: string) => {
    await supabase.from("online_orders").update({ status, updated_at: new Date().toISOString() } as any).eq("id", orderId);
    queryClient.invalidateQueries({ queryKey: ["online-orders"] });
    toast.success("Status atualizado!");
  };

  const currentDeliveryFee = settings.find((s: any) => s.key === "delivery_fee")?.value || "5.00";
  const currentWhatsappNumber = settings.find((s: any) => s.key === "whatsapp_number")?.value || "";

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl text-primary">Admin</h1>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {([["dashboard", "Dashboard"], ["history", "Histórico"], ["online", "Online"], ["users", "Usuários"], ["settings", "Config"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setActiveTab(key as any); if (key === "settings") { setDeliveryFee(currentDeliveryFee); setWhatsappNumber(currentWhatsappNumber); } }}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === key ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-card p-4 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="bg-secondary border-border text-foreground h-10 flex-1" />
          </div>

          <div className="glass-card p-5 glow-primary">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Faturamento {selectedDate === new Date().toISOString().split("T")[0] ? "Hoje" : selectedDate}</span>
            </div>
            <p className="text-4xl font-bold text-primary">R$ {totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{dateOrders.length} comanda(s) + {dateOnlineOrders.length} online</p>
          </div>

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

          <div className="glass-card p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Tempo Médio Cozinha</p>
              <p className="text-2xl font-bold text-foreground">{avgKitchenTime} min</p>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Top 5 Produtos</h3>
            </div>
            {topProducts.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma venda neste dia</p>}
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-primary font-bold text-lg w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{p.name}</p>
                    <div className="h-2 bg-secondary rounded-full mt-1 overflow-hidden">
                      <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${(p.count / topProducts[0].count) * 100}%` }} />
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
          <div className="glass-card p-4 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Mostrar últimos (meses)</label>
              <Input type="number" min="1" value={historyMonths} onChange={e => setHistoryMonths(e.target.value)}
                className="bg-secondary border-border text-foreground h-10" placeholder="Qtd de meses" />
            </div>
          </div>

          {allOrders.length === 0 && allOnlineOrdersHistory.length === 0 && <p className="text-muted-foreground text-center py-10">Nenhuma comanda encerrada</p>}

          {/* Presential orders */}
          {allOrders.map((order: any) => {
            const isExpanded = expandedOrders.has(order.id);
            return (
              <div key={order.id} className="glass-card p-4">
                <button onClick={() => toggleExpand(order.id)} className="w-full text-left">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        Mesa {String(order.table_number).padStart(2, "0")}
                        {order.client_name && ` — ${order.client_name}`}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {order.closed_at && new Date(order.closed_at).toLocaleString("pt-BR")} · {paymentLabels[order.payment_method] || order.payment_method}
                        {order.attendant_name && ` · Atendente: ${order.attendant_name}`}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="space-y-1 mt-3 pt-3 border-t border-border">
                    {(order.order_items || []).map((item: any) => (
                      <div key={item.id} className="text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span className="font-medium text-foreground">{item.quantity}x {item.product_name}</span>
                          <span>R$ {Number(item.total).toFixed(2)}</span>
                        </div>
                        {item.order_item_extras?.length > 0 && (
                          <p className="text-primary ml-4">+ {item.order_item_extras.map((e: any) => e.extra_name).join(", ")}</p>
                        )}
                        {item.observations && <p className="text-warning ml-4">Obs: {item.observations}</p>}
                        {item.for_whom && <p className="ml-4">→ {item.for_whom}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Online orders in history */}
          {allOnlineOrdersHistory.map((order: any) => {
            const isExpanded = expandedOrders.has(order.id);
            return (
              <div key={order.id} className="glass-card p-4 border-l-4 border-l-primary">
                <button onClick={() => toggleExpand(order.id)} className="w-full text-left">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        {order.delivery_type === "delivery" ? <Truck className="h-4 w-4 text-primary" /> : <Store className="h-4 w-4 text-primary" />}
                        {order.customer_name} (Online)
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString("pt-BR")} · {paymentLabels[order.payment_method] || order.payment_method}
                        {order.delivery_type === "delivery" ? " · Entrega" : " · Retirada"}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="space-y-1 mt-3 pt-3 border-t border-border">
                    {order.address && <p className="text-xs text-muted-foreground">📍 {order.address}</p>}
                    {order.customer_phone && <p className="text-xs text-muted-foreground">📱 {order.customer_phone}</p>}
                    {order.needs_change && <p className="text-xs text-warning">💵 Troco para R$ {Number(order.change_for).toFixed(2)}</p>}
                    {order.notes && <p className="text-xs text-muted-foreground">Obs: {order.notes}</p>}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "online" && (
        <div className="space-y-3 animate-fade-in">
          {onlineOrders.length === 0 && <p className="text-muted-foreground text-center py-10">Nenhum pedido online</p>}
          {onlineOrders.map((order: any) => {
            const isExpanded = expandedOrders.has(order.id);
            return (
              <div key={order.id} className="glass-card p-4">
                <button onClick={() => toggleExpand(order.id)} className="w-full text-left">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        {order.delivery_type === "delivery" ? <Truck className="h-4 w-4 text-primary" /> : <Store className="h-4 w-4 text-primary" />}
                        {order.customer_name}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </h4>
                      <p className="text-xs text-muted-foreground">{order.customer_phone} · {new Date(order.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                    <span className="text-lg font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
                  </div>
                </button>

                {isExpanded && (
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
                    <select value={order.status} onChange={e => handleUpdateOnlineOrderStatus(order.id, e.target.value)}
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
          })}
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-3 animate-fade-in">
          <Button onClick={() => setShowUserForm(true)} className="gradient-primary text-primary-foreground touch-target">
            <Plus className="h-5 w-5 mr-1" /> Novo Usuário
          </Button>
          {users.map((u: any) => (
            <div key={u.id} className="glass-card p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{u.display_name}</h4>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
              {u.username !== "quintaladmin" && (
                <button onClick={() => handleDeleteUser(u.user_id, u.username)} className="touch-target p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Taxa de Entrega</h3>
            </div>
            <div className="flex gap-2">
              <Input type="number" step="0.01" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)}
                className="bg-secondary border-border text-foreground h-12 flex-1" placeholder="Ex: 5.00" />
              <Button onClick={handleSaveDeliveryFee} className="h-12 gradient-primary text-primary-foreground touch-target">Salvar</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Valor atual: R$ {currentDeliveryFee}</p>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">WhatsApp do Estabelecimento</h3>
            </div>
            <div className="flex gap-2">
              <Input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
                className="bg-secondary border-border text-foreground h-12 flex-1" placeholder="Ex: 5511999999999" />
              <Button onClick={handleSaveWhatsappNumber} className="h-12 gradient-primary text-primary-foreground touch-target">Salvar</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {currentWhatsappNumber ? `Número atual: ${currentWhatsappNumber}` : "Nenhum número cadastrado"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Use formato internacional com código do país (ex: 5511999999999)</p>
          </div>
        </div>
      )}

      {showUserForm && (
        <Dialog open={showUserForm} onOpenChange={o => !o && setShowUserForm(false)}>
          <DialogContent className="bg-card border-border max-w-sm mx-auto">
            <DialogHeader><DialogTitle className="text-xl text-primary">Novo Usuário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><label className="text-sm text-muted-foreground mb-1 block">Nome de exibição</label><Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="bg-secondary border-border h-12" placeholder="Ex: João" /></div>
              <div><label className="text-sm text-muted-foreground mb-1 block">Usuário (login)</label><Input value={newUsername} onChange={e => setNewUsername(e.target.value)} className="bg-secondary border-border h-12" placeholder="Ex: joao" /></div>
              <div><label className="text-sm text-muted-foreground mb-1 block">Senha</label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-secondary border-border h-12" /></div>
              <Button onClick={handleCreateUser} disabled={userLoading} className="w-full h-12 gradient-primary text-primary-foreground touch-target">
                {userLoading ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Admin;
