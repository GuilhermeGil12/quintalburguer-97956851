import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Kitchen from "./pages/Kitchen";
import Inventory from "./pages/Inventory";
import Admin from "./pages/Admin";
import TableOrders from "./pages/TableOrders";
import Ingredients from "./pages/Ingredients";
import OnlineOrders from "./pages/OnlineOrders";
import OnlineOrder from "./pages/OnlineOrder";
import Login from "./pages/Login";
import TrackOrder from "./pages/TrackOrder";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/pedido" element={<OnlineOrder />} />
        <Route path="/acompanhar/:id" element={<TrackOrder />} />
        <Route path="/login" element={user && !loading ? <Navigate to="/" replace /> : <Login />} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/mesa/:number" element={<ProtectedRoute><TableOrders /></ProtectedRoute>} />
        <Route path="/cozinha" element={<ProtectedRoute><Kitchen /></ProtectedRoute>} />
        <Route path="/estoque" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/ingredientes" element={<ProtectedRoute><Ingredients /></ProtectedRoute>} />
        <Route path="/online" element={<ProtectedRoute><OnlineOrders /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
