import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProducts, fetchExtras, upsertProduct, upsertExtra, deleteProduct } from "@/lib/supabase-helpers";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import ProductFormDialog from "@/components/ProductFormDialog";
import ExtraFormDialog from "@/components/ExtraFormDialog";

const categoryLabels: Record<string, string> = {
  lanches: "🍔 Lanches",
  bebidas: "🥤 Bebidas",
  porcoes: "🍟 Porções",
  sobremesas: "🍫 Sobremesas",
};

const Inventory = () => {
  const queryClient = useQueryClient();
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "extras">("products");

  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: extras = [] } = useQuery({ queryKey: ["extras"], queryFn: fetchExtras });

  const handleToggleAvailable = async (product: any) => {
    try {
      await upsertProduct({ ...product, available: !product.available });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(product.available ? "Produto esgotado" : "Produto disponível");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleToggleExtraAvailable = async (extra: any) => {
    try {
      await upsertExtra({ ...extra, available: !extra.available });
      queryClient.invalidateQueries({ queryKey: ["extras"] });
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const grouped = products.reduce((acc: any, p: any) => {
    acc[p.category] = acc[p.category] || [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Package className="h-8 w-8 text-primary" />
        <h1 className="text-3xl text-primary">Estoque</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === "products" ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}
        >
          Produtos
        </button>
        <button
          onClick={() => setActiveTab("extras")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === "extras" ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}
        >
          Adicionais
        </button>
      </div>

      {activeTab === "products" && (
        <>
          <Button
            onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
            className="mb-4 gradient-primary text-primary-foreground touch-target"
          >
            <Plus className="h-5 w-5 mr-1" /> Novo Produto
          </Button>

          {Object.entries(grouped).map(([cat, prods]: [string, any]) => (
            <div key={cat} className="mb-6">
              <h3 className="text-lg font-bold text-foreground mb-3">{categoryLabels[cat] || cat}</h3>
              <div className="space-y-2">
                {prods.map((product: any) => (
                  <div key={product.id} className="glass-card p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-foreground ${!product.available ? "opacity-50 line-through" : ""}`}>
                        {product.name}
                      </h4>
                      <p className="text-sm text-primary">R$ {Number(product.price).toFixed(2)}</p>
                    </div>
                    <Switch
                      checked={product.available}
                      onCheckedChange={() => handleToggleAvailable(product)}
                    />
                    <button
                      onClick={() => { setEditingProduct(product); setShowProductForm(true); }}
                      className="touch-target p-2 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="touch-target p-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {activeTab === "extras" && (
        <>
          <Button
            onClick={() => setShowExtraForm(true)}
            className="mb-4 gradient-primary text-primary-foreground touch-target"
          >
            <Plus className="h-5 w-5 mr-1" /> Novo Adicional
          </Button>

          <div className="space-y-2">
            {extras.map((extra: any) => (
              <div key={extra.id} className="glass-card p-4 flex items-center gap-3">
                <div className="flex-1">
                  <h4 className={`font-semibold text-foreground ${!extra.available ? "opacity-50 line-through" : ""}`}>
                    {extra.name}
                  </h4>
                  <p className="text-sm text-primary">R$ {Number(extra.price).toFixed(2)}</p>
                </div>
                <Switch
                  checked={extra.available}
                  onCheckedChange={() => handleToggleExtraAvailable(extra)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {showProductForm && (
        <ProductFormDialog
          product={editingProduct}
          open={showProductForm}
          onClose={() => setShowProductForm(false)}
        />
      )}

      {showExtraForm && (
        <ExtraFormDialog open={showExtraForm} onClose={() => setShowExtraForm(false)} />
      )}
    </div>
  );
};

export default Inventory;
