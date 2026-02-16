import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertExtra } from "@/lib/supabase-helpers";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ExtraFormDialog = ({ open, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !price) { toast.error("Preencha nome e preço"); return; }
    setLoading(true);
    try {
      await upsertExtra({ name, price: parseFloat(price) });
      queryClient.invalidateQueries({ queryKey: ["extras"] });
      toast.success("Adicional criado!");
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
          <DialogTitle className="text-2xl text-primary">Novo Adicional</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input placeholder="Nome (ex: Bacon)" value={name} onChange={(e) => setName(e.target.value)}
            className="bg-secondary border-border text-foreground h-12" />
          <Input placeholder="Preço" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
            className="bg-secondary border-border text-foreground h-12" />
          <Button onClick={handleSubmit} disabled={loading}
            className="w-full h-14 text-lg font-semibold gradient-primary text-primary-foreground touch-target">
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExtraFormDialog;
