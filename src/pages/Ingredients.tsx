import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProducts } from "@/lib/supabase-helpers";
import { Beaker, Plus, Pencil, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Ingredients = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("un");
  const [stockQty, setStockQty] = useState("");
  const [minAlert, setMinAlert] = useState("0");
  const [showRecipeFor, setShowRecipeFor] = useState<any>(null);
  const [recipeItems, setRecipeItems] = useState<{ ingredient_id: string; qty_used: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"ingredients" | "recipes" | "stock">("stock");

  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: async () => {
      const { data } = await supabase.from("ingredients").select("*").order("name");
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const { data: productIngredients = [] } = useQuery({
    queryKey: ["product-ingredients"],
    queryFn: async () => {
      const { data } = await supabase.from("product_ingredients").select("*");
      return data || [];
    },
  });

  const handleSaveIngredient = async () => {
    if (!name) return;
    try {
      if (editing) {
        await supabase.from("ingredients").update({ name, unit, stock_qty: Number(stockQty), min_alert: Number(minAlert) } as any).eq("id", editing.id);
      } else {
        await supabase.from("ingredients").insert({ name, unit, stock_qty: Number(stockQty), min_alert: Number(minAlert) } as any);
      }
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      toast.success(editing ? "Ingrediente atualizado!" : "Ingrediente criado!");
      resetForm();
    } catch { toast.error("Erro ao salvar"); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("ingredients").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    toast.success("Ingrediente removido");
  };

  const resetForm = () => { setShowForm(false); setEditing(null); setName(""); setUnit("un"); setStockQty(""); setMinAlert("0"); };

  const openEdit = (ing: any) => {
    setEditing(ing); setName(ing.name); setUnit(ing.unit); setStockQty(String(ing.stock_qty)); setMinAlert(String(ing.min_alert)); setShowForm(true);
  };

  const openRecipe = (product: any) => {
    const existing = productIngredients.filter((pi: any) => pi.product_id === product.id);
    setRecipeItems(existing.map((pi: any) => ({ ingredient_id: pi.ingredient_id, qty_used: String(pi.qty_used) })));
    setShowRecipeFor(product);
  };

  const handleSaveRecipe = async () => {
    if (!showRecipeFor) return;
    try {
      await supabase.from("product_ingredients").delete().eq("product_id", showRecipeFor.id);
      const validItems = recipeItems.filter(r => r.ingredient_id && Number(r.qty_used) > 0);
      if (validItems.length > 0) {
        await supabase.from("product_ingredients").insert(
          validItems.map(r => ({ product_id: showRecipeFor.id, ingredient_id: r.ingredient_id, qty_used: Number(r.qty_used) })) as any
        );
      }
      queryClient.invalidateQueries({ queryKey: ["product-ingredients"] });
      toast.success("Receita salva!");
      setShowRecipeFor(null);
    } catch { toast.error("Erro ao salvar receita"); }
  };

  const handleUpdateStock = async (id: string, qty: number) => {
    await supabase.from("ingredients").update({ stock_qty: qty } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["ingredients"] });
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Beaker className="h-8 w-8 text-primary" />
        <h1 className="text-3xl text-primary">Ingredientes</h1>
      </div>

      <div className="flex gap-2 mb-5">
        {(["stock", "ingredients", "recipes"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {tab === "stock" ? "Estoque" : tab === "ingredients" ? "Cadastro" : "Receitas"}
          </button>
        ))}
      </div>

      {/* STOCK TAB */}
      {activeTab === "stock" && (
        <div className="space-y-2 animate-fade-in">
          {ingredients.map((ing: any) => (
            <div key={ing.id} className={`glass-card p-4 flex items-center gap-3 ${Number(ing.stock_qty) <= Number(ing.min_alert) ? "border-destructive/50" : ""}`}>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{ing.name}</h4>
                <p className="text-xs text-muted-foreground">{ing.unit} · Alerta: {ing.min_alert}</p>
              </div>
              <Input type="number" value={ing.stock_qty} onChange={e => handleUpdateStock(ing.id, Number(e.target.value))}
                className="w-24 bg-secondary border-border text-foreground h-10 text-center" />
            </div>
          ))}
          {ingredients.length === 0 && <p className="text-muted-foreground text-center py-10">Cadastre ingredientes primeiro</p>}
        </div>
      )}

      {/* INGREDIENTS TAB */}
      {activeTab === "ingredients" && (
        <div className="animate-fade-in">
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="mb-4 gradient-primary text-primary-foreground touch-target">
            <Plus className="h-5 w-5 mr-1" /> Novo Ingrediente
          </Button>
          <div className="space-y-2">
            {ingredients.map((ing: any) => (
              <div key={ing.id} className="glass-card p-4 flex items-center gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{ing.name}</h4>
                  <p className="text-xs text-muted-foreground">{ing.unit} · Estoque: {ing.stock_qty} · Alerta: {ing.min_alert}</p>
                </div>
                <button onClick={() => openEdit(ing)} className="touch-target p-2 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(ing.id)} className="touch-target p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECIPES TAB */}
      {activeTab === "recipes" && (
        <div className="space-y-2 animate-fade-in">
          {products.filter((p: any) => p.category === "lanches").map((product: any) => {
            const recipe = productIngredients.filter((pi: any) => pi.product_id === product.id);
            return (
              <div key={product.id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground">{product.name}</h4>
                  <Button size="sm" variant="outline" onClick={() => openRecipe(product)} className="border-primary/30 text-primary h-8">
                    <Pencil className="h-3 w-3 mr-1" /> Editar Receita
                  </Button>
                </div>
                {recipe.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem receita definida</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {recipe.map((r: any) => {
                      const ing = ingredients.find((i: any) => i.id === r.ingredient_id);
                      return ing ? (
                        <span key={r.id} className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground">
                          {r.qty_used}x {ing.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ingredient form dialog */}
      {showForm && (
        <Dialog open={showForm} onOpenChange={o => !o && resetForm()}>
          <DialogContent className="bg-card border-border max-w-sm mx-auto">
            <DialogHeader><DialogTitle className="text-xl text-primary">{editing ? "Editar" : "Novo"} Ingrediente</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><label className="text-sm text-muted-foreground mb-1 block">Nome</label><Input value={name} onChange={e => setName(e.target.value)} className="bg-secondary border-border h-12" /></div>
              <div><label className="text-sm text-muted-foreground mb-1 block">Unidade (un, g, ml...)</label><Input value={unit} onChange={e => setUnit(e.target.value)} className="bg-secondary border-border h-12" /></div>
              <div><label className="text-sm text-muted-foreground mb-1 block">Estoque Atual</label><Input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} className="bg-secondary border-border h-12" /></div>
              <div><label className="text-sm text-muted-foreground mb-1 block">Alerta Mínimo</label><Input type="number" value={minAlert} onChange={e => setMinAlert(e.target.value)} className="bg-secondary border-border h-12" /></div>
              <Button onClick={handleSaveIngredient} className="w-full h-12 gradient-primary text-primary-foreground touch-target">{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Recipe editor dialog */}
      {showRecipeFor && (
        <Dialog open={!!showRecipeFor} onOpenChange={o => !o && setShowRecipeFor(null)}>
          <DialogContent className="bg-card border-border max-w-sm mx-auto max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-xl text-primary">Receita: {showRecipeFor.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {recipeItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select value={item.ingredient_id} onChange={e => setRecipeItems(prev => prev.map((r, i) => i === idx ? { ...r, ingredient_id: e.target.value } : r))}
                    className="flex-1 h-10 rounded-md bg-secondary border border-border text-foreground px-2 text-sm">
                    <option value="">Selecione...</option>
                    {ingredients.map((ing: any) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                  </select>
                  <Input type="number" value={item.qty_used} onChange={e => setRecipeItems(prev => prev.map((r, i) => i === idx ? { ...r, qty_used: e.target.value } : r))}
                    className="w-20 bg-secondary border-border h-10 text-center" placeholder="Qtd" />
                  <button onClick={() => setRecipeItems(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setRecipeItems(prev => [...prev, { ingredient_id: "", qty_used: "1" }])} className="w-full border-border touch-target">
                <Plus className="h-4 w-4 mr-1" /> Adicionar Ingrediente
              </Button>
              <Button onClick={handleSaveRecipe} className="w-full h-12 gradient-primary text-primary-foreground touch-target">
                <Save className="h-4 w-4 mr-1" /> Salvar Receita
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Ingredients;
