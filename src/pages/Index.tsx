import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTables, fetchOpenOrders } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import NewOrderDialog from "@/components/NewOrderDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showAddTables, setShowAddTables] = useState(false);
  const [tablesToAdd, setTablesToAdd] = useState("1");
  const [editingTable, setEditingTable] = useState<any>(null);
  const [editNumber, setEditNumber] = useState("");

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: fetchTables,
  });

  const { data: openOrders = [] } = useQuery({
    queryKey: ["open-orders"],
    queryFn: fetchOpenOrders,
    refetchInterval: 5000,
  });

  const getTableOrders = (tableNumber: number) =>
    openOrders.filter((o: any) => o.table_number === tableNumber && o.status === "open");

  const handleAddTables = async () => {
    const qty = parseInt(tablesToAdd);
    if (!qty || qty < 1) return;
    const maxNumber = tables.length > 0 ? Math.max(...tables.map((t: any) => t.number)) : 0;
    const newTables = Array.from({ length: qty }, (_, i) => ({ number: maxNumber + i + 1 }));
    const { error } = await supabase.from("tables").insert(newTables as any);
    if (error) { toast.error("Erro ao adicionar mesas"); return; }
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    toast.success(`${qty} mesa(s) adicionada(s)!`);
    setShowAddTables(false);
  };

  const handleEditTable = async () => {
    const num = parseInt(editNumber);
    if (!num || num < 1) { toast.error("Número inválido"); return; }
    const exists = tables.some((t: any) => t.id !== editingTable.id && t.number === num);
    if (exists) { toast.error("Já existe uma mesa com esse número"); return; }
    await supabase.from("tables").update({ number: num } as any).eq("id", editingTable.id);
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    toast.success("Mesa atualizada!");
    setEditingTable(null);
  };

  const handleDeleteTable = async (table: any) => {
    const orders = getTableOrders(table.number);
    if (orders.length > 0) { toast.error("Não é possível remover mesa com comandas abertas"); return; }
    await supabase.from("tables").delete().eq("id", table.id);
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    toast.success("Mesa removida!");
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-3xl text-primary">🍔 Quintal Burguer</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestão de Mesas & Comandas</p>
        </div>
        <Button onClick={() => setShowAddTables(true)} size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
          <Plus className="h-4 w-4 mr-1" /> Mesas
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {tables.map((table: any) => {
          const orders = getTableOrders(table.number);
          const isOccupied = orders.length > 0;

          return (
            <div key={table.id} className="relative group">
              <button
                onClick={() => {
                  if (isOccupied) {
                    navigate(`/mesa/${table.number}`);
                  } else {
                    setSelectedTable(table);
                  }
                }}
                className={`w-full glass-card p-4 touch-target flex flex-col items-center gap-2 transition-all active:scale-95 ${
                  isOccupied
                    ? "border-primary/40 glow-primary"
                    : "border-border/30 hover:border-primary/20"
                }`}
              >
                <span className="text-2xl font-bold font-sans">
                  {String(table.number).padStart(2, "0")}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isOccupied
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isOccupied ? "Ocupada" : "Livre"}
                </span>
                {isOccupied && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{orders.length}</span>
                  </div>
                )}
                {!isOccupied && (
                  <Plus className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {!isOccupied && (
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setEditingTable(table); setEditNumber(String(table.number)); }}
                    className="p-1.5 rounded-md bg-secondary/80 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteTable(table); }}
                    className="p-1.5 rounded-md bg-secondary/80 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedTable && (
        <NewOrderDialog
          table={selectedTable}
          open={!!selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      )}

      {showAddTables && (
        <Dialog open={showAddTables} onOpenChange={o => !o && setShowAddTables(false)}>
          <DialogContent className="bg-card border-border max-w-xs mx-auto">
            <DialogHeader><DialogTitle className="text-xl text-primary">Adicionar Mesas</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Quantidade de mesas</label>
                <Input type="number" min="1" value={tablesToAdd} onChange={e => setTablesToAdd(e.target.value)} className="bg-secondary border-border h-12" />
              </div>
              <Button onClick={handleAddTables} className="w-full h-12 gradient-primary text-primary-foreground touch-target">
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editingTable && (
        <Dialog open={!!editingTable} onOpenChange={o => !o && setEditingTable(null)}>
          <DialogContent className="bg-card border-border max-w-xs mx-auto">
            <DialogHeader><DialogTitle className="text-xl text-primary">Editar Mesa</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Número da mesa</label>
                <Input type="number" min="1" value={editNumber} onChange={e => setEditNumber(e.target.value)} className="bg-secondary border-border h-12" />
              </div>
              <Button onClick={handleEditTable} className="w-full h-12 gradient-primary text-primary-foreground touch-target">
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Index;
