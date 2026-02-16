import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertProduct } from "@/lib/supabase-helpers";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  product?: any;
  open: boolean;
  onClose: () => void;
}

const ProductFormDialog = ({ product, open, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [category, setCategory] = useState(product?.category || "lanches");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !price) {
      toast.error("Preencha nome e preço");
      return;
    }
    setLoading(true);
    try {
      await upsertProduct({
        ...(product?.id ? { id: product.id } : {}),
        name,
        description: description || undefined,
        price: parseFloat(price),
        category,
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["available-products"] });
      toast.success(product ? "Produto atualizado!" : "Produto criado!");
      onClose();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">
            {product ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)}
            className="bg-secondary border-border text-foreground h-12" />
          <Input placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)}
            className="bg-secondary border-border text-foreground h-12" />
          <Input placeholder="Preço" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
            className="bg-secondary border-border text-foreground h-12" />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-secondary border-border text-foreground h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="lanches">🍔 Lanches</SelectItem>
              <SelectItem value="bebidas">🥤 Bebidas</SelectItem>
              <SelectItem value="porcoes">🍟 Porções</SelectItem>
              <SelectItem value="sobremesas">🍫 Sobremesas</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSubmit} disabled={loading}
            className="w-full h-14 text-lg font-semibold gradient-primary text-primary-foreground touch-target">
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormDialog;
