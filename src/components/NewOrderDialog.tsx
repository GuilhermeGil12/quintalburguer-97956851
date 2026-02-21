import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOrder } from "@/lib/supabase-helpers";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  table: { id: string; number: number };
  open: boolean;
  onClose: () => void;
}

const NewOrderDialog = ({ table, open, onClose }: Props) => {
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleCreate = async () => {
    setLoading(true);
    try {
      await createOrder(table.id, table.number, clientName || undefined, profile?.display_name);
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      toast.success("Comanda aberta!");
      onClose();
      navigate(`/mesa/${table.number}`);
    } catch {
      toast.error("Erro ao abrir comanda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">
            Mesa {String(table.number).padStart(2, "0")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Nome do cliente (opcional)
            </label>
            <Input
              placeholder="Ex: Guilherme"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="bg-secondary border-border text-foreground h-12 text-base"
              autoFocus
            />
          </div>
          {profile && (
            <p className="text-xs text-muted-foreground">Atendente: {profile.display_name}</p>
          )}
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="w-full h-14 text-lg font-semibold gradient-primary text-primary-foreground touch-target"
          >
            {loading ? "Abrindo..." : "Abrir Comanda"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewOrderDialog;
