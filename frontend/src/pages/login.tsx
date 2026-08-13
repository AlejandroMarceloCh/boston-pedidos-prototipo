import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENT_USER } from "@/lib/mock-data";
import { useStore } from "@/store/app-store";

// Credencial de la demo. Con backend esto lo valida el servidor.
const CLAVE_DEMO = "boston2026";

export default function LoginPage() {
  const navigate = useNavigate();
  const { entrar } = useStore();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usuario, setUsuario] = useState("miguel.quispe");
  const [password, setPassword] = useState("boston2026");

  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!usuario.trim() || !password) {
      setError("Completá usuario y contraseña.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Prototipo sin backend: se valida contra la credencial de demo.
      const ok =
        usuario.trim().toLowerCase() === CURRENT_USER.usuario && password === CLAVE_DEMO;
      if (!ok) {
        setError("Usuario o contraseña incorrectos.");
        return;
      }
      entrar(CURRENT_USER.usuario);
      toast.success(`Bienvenido, ${CURRENT_USER.nombre.split(" ")[0]}`);
      navigate("/dashboard");
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-[12px] font-semibold">
            B
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Boston Pedidos</span>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive"
            >
              {error}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="user" className="text-[11px] uppercase tracking-widest">
              Usuario
            </Label>
            <Input
              id="user"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="usuario.apellido"
              autoComplete="username"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="pwd" className="text-[11px] uppercase tracking-widest">
                Contraseña
              </Label>
              <button
                type="button"
                onClick={() =>
                  toast("Recuperación de contraseña", {
                    description:
                      "Escribe a sistemas@boston.com.pe o al anexo 214 para que te la restablezcan.",
                  })
                }
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <Input
                id="pwd"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPwd ? "Ocultar" : "Mostrar"}
              >
                {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="w-full h-10 gap-1.5 mt-2"
          >
            {loading ? (
              <>
                <span className="h-1 w-1 rounded-full bg-current animate-pulse" />
                <span>Ingresando…</span>
              </>
            ) : (
              <>
                Ingresar
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-10 text-center text-[10px] text-muted-foreground/60 tabular">
          v0.1 · build 2026.08.11
        </p>
      </motion.div>
    </div>
  );
}
