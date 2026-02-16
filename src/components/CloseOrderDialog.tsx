import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Banknote, QrCode, CreditCard } from "lucide-react";

interface Props {
  order: any;
  open: boolean;
  onClose: () => void;
  onConfirm: (orderId: string, paymentMethod: string, total: number) => void;
}

const paymentMethods = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "Pix", icon: QrCode },
  { value: "cartao", label: "Cartão", icon: CreditCard },
];

const CloseOrderDialog = ({ order, open, onClose, onConfirm }: Props) => {
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    await onConfirm(order.id, selected, Number(order.total));
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">Fechar Comanda</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="text-center py-3 bg-secondary/50 rounded-xl">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-3xl font-bold text-primary">
              R$ {Number(order.total).toFixed(2)}
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Forma de Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setSelected(value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors touch-target ${
                    selected === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!selected || loading}
            className="w-full h-14 text-lg font-semibold gradient-primary text-primary-foreground touch-target"
          >
            {loading ? "Encerrando..." : "Confirmar Pagamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CloseOrderDialog;
