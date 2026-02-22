import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAvailableProducts, fetchExtras, addOrderItem, addOrderItemExtras, updateOrderTotal } from "@/lib/supabase-helpers";
import { toast } from "sonner";
import { Minus, Plus, ArrowLeft } from "lucide-react";

interface Props {
  orderId: string;
  open: boolean;
  onClose: () => void;
}

const categoryLabels: Record<string, string> = {
  lanches: "🍔 Lanches",
  bebidas: "🥤 Bebidas",
  porcoes: "🍟 Porções",
  sobremesas: "🍫 Sobremesas",
};

const AddItemSheet = ({ orderId, open, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [forWhom, setForWhom] = useState("");
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("lanches");

  const { data: products = [] } = useQuery({
    queryKey: ["available-products"],
    queryFn: fetchAvailableProducts,
  });

  const { data: extras = [] } = useQuery({
    queryKey: ["extras"],
    queryFn: fetchExtras,
  });

  const categories = [...new Set(products.map((p: any) => p.category))];
  const filteredProducts = products.filter((p: any) => p.category === activeCategory);

  const toggleExtra = (id: string) => {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    const extrasTotal = selectedExtras.reduce((sum, id) => {
      const extra = extras.find((e: any) => e.id === id);
      return sum + (extra ? Number(extra.price) : 0);
    }, 0);
    return (Number(selectedProduct.price) + extrasTotal) * quantity;
  };

  const extrasTotal = selectedExtras.reduce((sum, id) => {
    const extra = extras.find((e: any) => e.id === id);
    return sum + (extra ? Number(extra.price) : 0);
  }, 0);

  const handleAdd = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const item = await addOrderItem({
        order_id: orderId,
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity,
        unit_price: Number(selectedProduct.price),
        extras_total: extrasTotal * quantity,
        total: calculateTotal(),
        for_whom: forWhom || undefined,
        observations: observations || undefined,
      });

      if (selectedExtras.length > 0) {
        const extrasData = selectedExtras.map((id) => {
          const extra = extras.find((e: any) => e.id === id);
          return { extra_id: id, extra_name: extra.name, extra_price: Number(extra.price) };
        });
        await addOrderItemExtras(item.id, extrasData);
      }

      // Deduct ingredients from stock
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: recipes } = await supabase.from("product_ingredients").select("*").eq("product_id", selectedProduct.id);
        if (recipes && recipes.length > 0) {
          for (const r of recipes) {
            const { data: ing } = await supabase.from("ingredients").select("stock_qty").eq("id", r.ingredient_id).single();
            if (ing) {
              const newQty = Math.max(0, Number(ing.stock_qty) - r.qty_used * quantity);
              await supabase.from("ingredients").update({ stock_qty: newQty } as any).eq("id", r.ingredient_id);
            }
          }
        }
      } catch (e) { console.error("Ingredient deduction error:", e); }

      await updateOrderTotal(orderId);
      queryClient.invalidateQueries({ queryKey: ["table-orders"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      toast.success(`${selectedProduct.name} adicionado!`);
      // Reset for another item
      setSelectedProduct(null);
      setQuantity(1);
      setSelectedExtras([]);
      setForWhom("");
      setObservations("");
    } catch {
      toast.error("Erro ao adicionar item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-card border-border h-[90vh] rounded-t-2xl overflow-y-auto p-0">
        <SheetHeader className="sticky top-0 bg-card z-10 p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {selectedProduct && (
              <button onClick={() => setSelectedProduct(null)} className="touch-target p-1">
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
            )}
            <SheetTitle className="text-xl text-primary">
              {selectedProduct ? selectedProduct.name : "Adicionar Item"}
            </SheetTitle>
          </div>
        </SheetHeader>

        {!selectedProduct ? (
          <div className="p-4">
            {/* Category tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {categories.map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors touch-target ${
                    activeCategory === cat
                      ? "gradient-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {categoryLabels[cat] || cat}
                </button>
              ))}
            </div>

            {/* Product list */}
            <div className="space-y-2">
              {filteredProducts.map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="w-full glass-card p-4 flex justify-between items-center touch-target active:scale-[0.98] transition-transform"
                >
                  <div className="text-left">
                    <h4 className="font-semibold text-foreground">{product.name}</h4>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{product.description}</p>
                    )}
                  </div>
                  <span className="text-primary font-bold text-lg whitespace-nowrap ml-3">
                    R$ {Number(product.price).toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {/* Quantity */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Quantidade</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center touch-target active:scale-95"
                >
                  <Minus className="h-5 w-5 text-foreground" />
                </button>
                <span className="text-2xl font-bold text-foreground w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center touch-target active:scale-95"
                >
                  <Plus className="h-5 w-5 text-foreground" />
                </button>
              </div>
            </div>

            {/* Extras */}
            {activeCategory === "lanches" && extras.length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Adicionais</label>
                <div className="grid grid-cols-2 gap-2">
                  {extras
                    .filter((e: any) => e.available)
                    .map((extra: any) => {
                      const checked = selectedExtras.includes(extra.id);
                      return (
                        <button
                          key={extra.id}
                          onClick={() => toggleExtra(extra.id)}
                          className={`p-3 rounded-lg border transition-colors text-left touch-target active:scale-[0.98] ${
                            checked
                              ? "border-primary bg-primary/10"
                              : "border-border bg-secondary/50"
                          }`}
                        >
                          <span className="font-medium text-sm text-foreground">{extra.name}</span>
                          <span className="block text-xs text-primary mt-0.5">
                            + R$ {Number(extra.price).toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* For whom */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Para quem é este item? (opcional)
              </label>
              <Input
                placeholder="Ex: Lanche da Maria"
                value={forWhom}
                onChange={(e) => setForWhom(e.target.value)}
                className="bg-secondary border-border text-foreground h-12"
              />
            </div>

            {/* Observations */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Observações (opcional)
              </label>
              <Textarea
                placeholder="Ex: Sem cebola, ponto da carne..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="bg-secondary border-border text-foreground"
                rows={2}
              />
            </div>

            {/* Total + Add */}
            <div className="sticky bottom-0 bg-card pt-3 pb-2 border-t border-border -mx-4 px-4">
              <Button
                onClick={handleAdd}
                disabled={loading}
                className="w-full h-14 text-lg font-bold gradient-primary text-primary-foreground touch-target"
              >
                {loading ? "Adicionando..." : `Adicionar — R$ ${calculateTotal().toFixed(2)}`}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AddItemSheet;
