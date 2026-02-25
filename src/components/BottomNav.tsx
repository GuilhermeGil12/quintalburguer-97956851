import { LayoutGrid, ChefHat, BarChart3, Package, Beaker, LogOut, Globe } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { path: "/", label: "Mesas", icon: LayoutGrid },
  { path: "/cozinha", label: "Cozinha", icon: ChefHat },
  { path: "/estoque", label: "Estoque", icon: Package },
  { path: "/ingredientes", label: "Itens", icon: Beaker },
  { path: "/online", label: "Online", icon: Globe },
  { path: "/admin", label: "Admin", icon: BarChart3 },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, profile } = useAuth();

  // Hide on certain pages
  if (location.pathname.startsWith("/mesa/") || location.pathname === "/pedido" || location.pathname === "/login") return null;
  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card rounded-none border-t border-border/50 px-2 pb-safe">
      <div className="flex items-center justify-around">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 py-3 px-2 touch-target transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "drop-shadow-[0_0_8px_hsl(32,95%,50%,0.5)]" : ""}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
        <button onClick={() => signOut()} className="flex flex-col items-center gap-1 py-3 px-2 touch-target text-muted-foreground hover:text-destructive transition-colors">
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-medium">Sair</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
