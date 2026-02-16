import { useQuery } from "@tanstack/react-query";
import { fetchTables, fetchOpenOrders } from "@/lib/supabase-helpers";
import { useNavigate } from "react-router-dom";
import { Users, Plus } from "lucide-react";
import { useState } from "react";
import NewOrderDialog from "@/components/NewOrderDialog";

const Index = () => {
  const navigate = useNavigate();
  const [selectedTable, setSelectedTable] = useState<any>(null);

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

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-3xl text-primary">🍔 BurgerCommand</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestão de Mesas & Comandas</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {tables.map((table: any) => {
          const orders = getTableOrders(table.number);
          const isOccupied = orders.length > 0;

          return (
            <button
              key={table.id}
              onClick={() => {
                if (isOccupied) {
                  navigate(`/mesa/${table.number}`);
                } else {
                  setSelectedTable(table);
                }
              }}
              className={`glass-card p-4 touch-target flex flex-col items-center gap-2 transition-all active:scale-95 ${
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
    </div>
  );
};

export default Index;
