import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogIn } from "lucide-react";

const Login = () => {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      await signIn(username, password);
      toast.success("Bem-vindo!");
    } catch {
      toast.error("Usuário ou senha inválidos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="glass-card p-8 w-full max-w-sm overflow-hidden">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🍔</div>
          <h1 className="text-4xl text-primary leading-tight">Quintal Burguer</h1>
          <p className="text-muted-foreground text-sm mt-1">Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Usuário</label>
            <Input
              placeholder="Digite seu usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-secondary border-border text-foreground h-12 text-base"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Senha</label>
            <Input
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary border-border text-foreground h-12 text-base"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full h-14 text-lg font-semibold gradient-primary text-primary-foreground touch-target"
          >
            <LogIn className="h-5 w-5 mr-2" />
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
