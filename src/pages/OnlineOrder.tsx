import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAvailableProducts, fetchExtras } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShoppingCart, ArrowLeft, Plus, Minus, Trash2, MapPin, Banknote, QrCode, CreditCard, Store, Truck, CheckCircle2 } from "lucide-react";

const categoryLabels: Record<string, string> = {
  lanches: "🍔 Lanches",
  bebidas: "🥤 Bebidas",
  porcoes: "🍟 Porções",
  sobremesas: "🍫 Sobremesas",
};

interface CartItem {
  product: any;
  quantity: number;
  selectedExtras: any[];
  observations: string;
}

const OnlineOrder = () => {
  const [step, setStep] = useState<"menu" | "cart" | "checkout" | "done">("menu");
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("lanches");
  const [configuringProduct, setConfiguringProduct] = useState<any>(null);
  const [tempQty, setTempQty] = useState(1);
  const [tempExtras, setTempExtras] = useState<string[]>([]);
  const [tempObs, setTempObs] = useState("");

  // Checkout fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: products = [] } = useQuery({ queryKey: ["available-products"], queryFn: fetchAvailableProducts });
  const { data: extras = [] } = useQuery({ queryKey: ["extras"], queryFn: fetchExtras });
  const { data: settings } = useQuery({
    queryKey: ["settings-delivery-fee"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").eq("key", "delivery_fee").single();
      return data;
    },
  });

  const deliveryFee = deliveryType === "delivery" ? Number(settings?.value || 5) : 0;
  const categories = [...new Set(products.map((p: any) => p.category))];
  const filteredProducts = products.filter((p: any) => p.category === activeCategory);

  const subtotal = cart.reduce((sum, item) => {
    const extrasTotal = item.selectedExtras.reduce((s: number, e: any) => s + Number(e.price), 0);
    return sum + (Number(item.product.price) + extrasTotal) * item.quantity;
  }, 0);

  const total = subtotal + deliveryFee;

  const addToCart = () => {
    if (!configuringProduct) return;
    const selectedExtrasData = tempExtras.map(id => extras.find((e: any) => e.id === id)).filter(Boolean);
    setCart(prev => [...prev, { product: configuringProduct, quantity: tempQty, selectedExtras: selectedExtrasData, observations: tempObs }]);
    setConfiguringProduct(null);
    setTempQty(1);
    setTempExtras([]);
    setTempObs("");
    toast.success("Item adicionado ao carrinho!");
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = async () => {
    if (!customerName.trim()) {
      toast.error("Preencha seu nome");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Preencha o telefone");
      return;
    }
    if (deliveryType === "delivery" && !address.trim()) {
      toast.error("Preencha o endereço de entrega");
      return;
    }
    if (cart.length === 0) {
      toast.error("Adicione itens ao carrinho");
      return;
    }

    setLoading(true);
    try {
      const { data: order, error } = await supabase.from("online_orders").insert({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        address: deliveryType === "delivery" ? address.trim() : null,
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        needs_change: needsChange,
        change_for: needsChange ? Number(changeFor) : null,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        notes: notes.trim() || null,
      } as any).select().single();

      if (error) throw error;

      for (const item of cart) {
        const extrasTotal = item.selectedExtras.reduce((s: number, e: any) => s + Number(e.price), 0);
        const itemTotal = (Number(item.product.price) + extrasTotal) * item.quantity;

        const { data: orderItem, error: itemError } = await supabase.from("online_order_items").insert({
          online_order_id: order.id,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: Number(item.product.price),
          extras_total: extrasTotal * item.quantity,
          total: itemTotal,
          observations: item.observations || null,
        } as any).select().single();

        if (itemError) throw itemError;

        if (item.selectedExtras.length > 0) {
          await supabase.from("online_order_item_extras").insert(
            item.selectedExtras.map((e: any) => ({
              online_order_item_id: orderItem.id,
              extra_id: e.id,
              extra_name: e.name,
              extra_price: Number(e.price),
            })) as any
          );
        }
      }

      // Deduct ingredients from stock
      await deductIngredients(cart);

      setLastOrderId(order.id);
      setStep("done");
      toast.success("Pedido enviado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar pedido");
    } finally {
      setLoading(false);
    }
  };

  const { data: whatsappSetting } = useQuery({
    queryKey: ["settings-whatsapp-number"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").eq("key", "whatsapp_number").single();
      return data;
    },
    enabled: step === "done",
  });

  if (step === "done") {
    const trackUrl = lastOrderId ? `${window.location.origin}/acompanhar/${lastOrderId}` : "";
    const storePhone = whatsappSetting?.value || "";
    const cleanPhone = storePhone.replace(/\D/g, "");
    const whatsappMsg = encodeURIComponent(`Olá! Acabei de fazer um pedido no Quintal Burguer.\n\nNome: ${customerName}\nAcompanhe aqui: ${trackUrl}`);
    const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${whatsappMsg}` : "";
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="glass-card p-8 text-center max-w-sm w-full">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl text-primary mb-2">Pedido Enviado!</h1>
          <p className="text-muted-foreground mb-6">Seu pedido foi recebido e logo será preparado.</p>
          {lastOrderId && (
            <a href={trackUrl} className="block mb-3 text-sm text-primary underline">
              📍 Acompanhar meu pedido
            </a>
          )}
          {cleanPhone && (
            <div className="flex gap-2 mb-3">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 h-12 rounded-lg bg-[#25D366] text-white font-bold flex items-center justify-center gap-2 touch-target">
                📱 Enviar no WhatsApp
              </a>
            </div>
          )}
          <Button onClick={() => { setStep("menu"); setCart([]); setCustomerName(""); setCustomerPhone(""); setAddress(""); setNotes(""); setLastOrderId(null); }} className="gradient-primary text-primary-foreground h-12 w-full touch-target">
            Fazer Novo Pedido
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 px-4 pt-6 bg-background max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {step !== "menu" && (
          <button onClick={() => setStep(step === "checkout" ? "cart" : "menu")} className="touch-target p-2 -ml-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
        )}
        <div>
          <h1 className="text-3xl text-primary">🍔 Quintal Burguer</h1>
          <p className="text-sm text-muted-foreground">
            {step === "menu" ? "Faça seu pedido" : step === "cart" ? "Seu carrinho" : "Finalizar pedido"}
          </p>
        </div>
        {step === "menu" && cart.length > 0 && (
          <button onClick={() => setStep("cart")} className="ml-auto relative touch-target p-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {cart.length}
            </span>
          </button>
        )}
      </div>

      {/* MENU STEP */}
      {step === "menu" && !configuringProduct && (
        <>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {categories.map((cat: string) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors touch-target ${
                  activeCategory === cat ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}>
                {categoryLabels[cat] || cat}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filteredProducts.map((product: any) => (
              <button key={product.id} onClick={() => { setConfiguringProduct(product); setTempQty(1); setTempExtras([]); setTempObs(""); }}
                className="w-full glass-card p-4 flex justify-between items-center touch-target active:scale-[0.98] transition-transform">
                <div className="text-left">
                  <h4 className="font-semibold text-foreground">{product.name}</h4>
                  {product.description && <p className="text-xs text-muted-foreground mt-0.5">{product.description}</p>}
                </div>
                <span className="text-primary font-bold text-lg whitespace-nowrap ml-3">R$ {Number(product.price).toFixed(2)}</span>
              </button>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
              <Button onClick={() => setStep("cart")} className="w-full h-14 text-lg font-bold gradient-primary text-primary-foreground touch-target">
                <ShoppingCart className="h-5 w-5 mr-2" /> Ver Carrinho ({cart.length}) — R$ {subtotal.toFixed(2)}
              </Button>
            </div>
          )}
        </>
      )}

      {/* CONFIGURING PRODUCT */}
      {step === "menu" && configuringProduct && (
        <div className="space-y-5 animate-fade-in">
          <button onClick={() => setConfiguringProduct(null)} className="flex items-center gap-2 text-muted-foreground touch-target">
            <ArrowLeft className="h-5 w-5" /> Voltar
          </button>
          <h2 className="text-2xl text-foreground">{configuringProduct.name}</h2>
          <p className="text-primary text-xl font-bold">R$ {Number(configuringProduct.price).toFixed(2)}</p>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Quantidade</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setTempQty(Math.max(1, tempQty - 1))} className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center touch-target"><Minus className="h-5 w-5 text-foreground" /></button>
              <span className="text-2xl font-bold text-foreground w-8 text-center">{tempQty}</span>
              <button onClick={() => setTempQty(tempQty + 1)} className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center touch-target"><Plus className="h-5 w-5 text-foreground" /></button>
            </div>
          </div>

          {configuringProduct.category === "lanches" && extras.filter((e: any) => e.available).length > 0 && (
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Adicionais</label>
              <div className="grid grid-cols-2 gap-2">
                {extras.filter((e: any) => e.available).map((extra: any) => {
                  const checked = tempExtras.includes(extra.id);
                  return (
                    <button key={extra.id} onClick={() => setTempExtras(prev => checked ? prev.filter(id => id !== extra.id) : [...prev, extra.id])}
                      className={`p-3 rounded-lg border transition-colors text-left touch-target ${checked ? "border-primary bg-primary/10" : "border-border bg-secondary/50"}`}>
                      <span className="font-medium text-sm text-foreground">{extra.name}</span>
                      <span className="block text-xs text-primary mt-0.5">+ R$ {Number(extra.price).toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Observações (opcional)</label>
            <Textarea placeholder="Ex: Sem cebola..." value={tempObs} onChange={e => setTempObs(e.target.value)} className="bg-secondary border-border text-foreground" rows={2} />
          </div>

          <Button onClick={addToCart} className="w-full h-14 text-lg font-bold gradient-primary text-primary-foreground touch-target">
            Adicionar ao Carrinho
          </Button>
        </div>
      )}

      {/* CART STEP */}
      {step === "cart" && (
        <div className="space-y-4 animate-fade-in">
          {cart.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">Carrinho vazio</p>
          ) : (
            <>
              {cart.map((item, i) => {
                const extrasTotal = item.selectedExtras.reduce((s: number, e: any) => s + Number(e.price), 0);
                const itemTotal = (Number(item.product.price) + extrasTotal) * item.quantity;
                return (
                  <div key={i} className="glass-card p-4 flex items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{item.quantity}x {item.product.name}</h4>
                      {item.selectedExtras.length > 0 && <p className="text-xs text-muted-foreground">+ {item.selectedExtras.map((e: any) => e.name).join(", ")}</p>}
                      {item.observations && <p className="text-xs text-warning">Obs: {item.observations}</p>}
                      <p className="text-sm text-primary font-bold mt-1">R$ {itemTotal.toFixed(2)}</p>
                    </div>
                    <button onClick={() => removeFromCart(i)} className="touch-target p-2 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                );
              })}
              <div className="glass-card p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">R$ {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxa de entrega</span><span className="text-foreground">R$ {deliveryFee.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold border-t border-border pt-2"><span className="text-foreground">Total</span><span className="text-primary">R$ {total.toFixed(2)}</span></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setStep("menu")} variant="outline" className="flex-1 h-12 touch-target border-border">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Mais
                </Button>
                <Button onClick={() => setStep("checkout")} className="flex-1 h-12 touch-target gradient-primary text-primary-foreground">
                  Finalizar Pedido
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* CHECKOUT STEP */}
      {step === "checkout" && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Seu nome *</label>
            <Input placeholder="Nome completo" value={customerName} onChange={e => setCustomerName(e.target.value)} className="bg-secondary border-border text-foreground h-12" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Telefone / WhatsApp *</label>
            <Input placeholder="(00) 00000-0000" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="bg-secondary border-border text-foreground h-12" />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Tipo de pedido</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDeliveryType("delivery")} className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors touch-target ${deliveryType === "delivery" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground"}`}>
                <Truck className="h-6 w-6" /><span className="text-sm font-medium">Entrega</span>
              </button>
              <button onClick={() => setDeliveryType("pickup")} className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors touch-target ${deliveryType === "pickup" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground"}`}>
                <Store className="h-6 w-6" /><span className="text-sm font-medium">Retirada</span>
              </button>
            </div>
          </div>

          {deliveryType === "delivery" && (
            <div>
              <label className="text-sm text-muted-foreground mb-1 block"><MapPin className="h-4 w-4 inline mr-1" />Endereço de entrega *</label>
              <Textarea placeholder="Rua, número, bairro, complemento..." value={address} onChange={e => setAddress(e.target.value)} className="bg-secondary border-border text-foreground" rows={2} />
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Forma de pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ value: "dinheiro", label: "Dinheiro", icon: Banknote }, { value: "pix", label: "Pix", icon: QrCode }, { value: "cartao", label: "Cartão", icon: CreditCard }].map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => { setPaymentMethod(value); if (value !== "dinheiro") setNeedsChange(false); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors touch-target ${paymentMethod === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground"}`}>
                  <Icon className="h-6 w-6" /><span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "dinheiro" && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={needsChange} onChange={e => setNeedsChange(e.target.checked)} className="accent-primary w-5 h-5" />
                Precisa de troco?
              </label>
              {needsChange && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Troco para quanto?</label>
                  <Input type="number" placeholder="Ex: 50.00" value={changeFor} onChange={e => setChangeFor(e.target.value)} className="bg-secondary border-border text-foreground h-12" />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Observações (opcional)</label>
            <Textarea placeholder="Alguma observação sobre o pedido?" value={notes} onChange={e => setNotes(e.target.value)} className="bg-secondary border-border text-foreground" rows={2} />
          </div>

          <div className="glass-card p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">R$ {subtotal.toFixed(2)}</span></div>
            {deliveryType === "delivery" && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxa de entrega</span><span className="text-foreground">R$ {deliveryFee.toFixed(2)}</span></div>}
            <div className="flex justify-between text-lg font-bold border-t border-border pt-2"><span className="text-foreground">Total</span><span className="text-primary">R$ {total.toFixed(2)}</span></div>
          </div>

          <Button onClick={handleSubmitOrder} disabled={loading} className="w-full h-14 text-lg font-bold gradient-primary text-primary-foreground touch-target">
            {loading ? "Enviando..." : "Confirmar Pedido"}
          </Button>
        </div>
      )}
    </div>
  );
};

// Helper: deduct ingredients from stock based on product recipes
async function deductIngredients(cart: CartItem[]) {
  try {
    const { data: recipes } = await supabase.from("product_ingredients").select("*");
    if (!recipes || recipes.length === 0) return;

    const deductions: Record<string, number> = {};
    for (const item of cart) {
      const productRecipe = recipes.filter(r => r.product_id === item.product.id);
      for (const r of productRecipe) {
        deductions[r.ingredient_id] = (deductions[r.ingredient_id] || 0) + r.qty_used * item.quantity;
      }
    }

    for (const [ingredientId, qty] of Object.entries(deductions)) {
      const { data: ing } = await supabase.from("ingredients").select("stock_qty").eq("id", ingredientId).single();
      if (ing) {
        const newQty = Math.max(0, Number(ing.stock_qty) - qty);
        await supabase.from("ingredients").update({ stock_qty: newQty } as any).eq("id", ingredientId);
      }
    }
  } catch (err) {
    console.error("Error deducting ingredients:", err);
  }
}

export default OnlineOrder;
