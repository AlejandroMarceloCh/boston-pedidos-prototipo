import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CheckCircle2, Eye, EyeOff, LockKeyhole, PackageCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENT_USER } from "@/lib/mock-data";
import { useStore } from "@/store/app-store";
import { useRoleStore } from "@/store/role-store";

const CLAVE_DEMO = "boston2026";
const flow = [
  { icon: PackageCheck, label: "Solicitudes", value: "18 activas" },
  { icon: CheckCircle2, label: "Atención", value: "87% completa" },
  { icon: BarChart3, label: "Venta del mes", value: "S/ 2.84M" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { entrar } = useStore();
  const { setRole } = useRoleStore();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usuario, setUsuario] = useState("miguel.quispe");
  const [password, setPassword] = useState("boston2026");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!usuario.trim() || !password) return setError("Completa usuario y contraseña.");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (usuario.trim().toLowerCase() !== CURRENT_USER.usuario || password !== CLAVE_DEMO) {
        setError("Usuario o contraseña incorrectos.");
        return;
      }
      entrar(CURRENT_USER.usuario);
      setRole("vendedor");
      toast.success(`Bienvenido, ${CURRENT_USER.nombre.split(" ")[0]}`);
      navigate("/vendedor");
    }, 500);
  };

  return (
    <main className="login-experience">
      <section className="login-story" aria-label="Boston Gestión Comercial">
        <div className="login-story-grid" aria-hidden="true" />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }} className="login-story-content">
          <img src="/boston-logo.png" alt="Boston - Calidad en confecciones" className="login-official-logo" />
          <div className="login-kicker"><Sparkles aria-hidden="true" /><span>Nueva operación comercial</span></div>
          <h1>Todo Boston,<br />en movimiento.</h1>
          <p className="login-story-lead">Una sola señal conecta lo que el cliente necesita, lo que ventas promete y lo que la mesa puede atender.</p>
          <div className="login-flow" aria-label="Resumen operativo">
            {flow.map(({ icon: Icon, label, value }, index) => (
              <motion.div key={label} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .25 + index * .09 }} className="login-flow-item">
                <span className="login-flow-icon"><Icon aria-hidden="true" /></span>
                <span><small>{label}</small><strong>{value}</strong></span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <div className="login-story-footer"><span>MECSA · MERCADEO COMERCIAL S.A.</span><span className="login-live"><i /> Operación disponible</span></div>
      </section>

      <section className="login-access">
        <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5, delay: .08 }} className="login-access-card">
          <div className="login-mobile-brand"><img src="/boston-logo.png" alt="Boston" /></div>
          <div className="login-access-heading">
            <span className="login-access-number">01 / ACCESO</span>
            <h2>Bienvenido de vuelta.</h2>
            <p>Ingresa al centro de operación comercial Boston.</p>
          </div>
          <form onSubmit={submit} className="login-form" noValidate>
            {error && <p role="alert" className="login-error">{error}</p>}
            <div className="login-field">
              <Label htmlFor="user">Usuario</Label>
              <Input id="user" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="usuario.apellido" autoComplete="username" />
            </div>
            <div className="login-field">
              <div className="login-label-row">
                <Label htmlFor="pwd">Contraseña</Label>
                <button type="button" onClick={() => toast("Recuperación de contraseña", { description: "Escribe a sistemas@boston.com.pe o al anexo 214." })}>Recuperar acceso</button>
              </div>
              <div className="login-password">
                <Input id="pwd" type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPwd((shown) => !shown)} aria-label={showPwd ? "Ocultar clave" : "Mostrar clave"}>{showPwd ? <EyeOff /> : <Eye />}</button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="login-submit"><span>{loading ? "Abriendo espacio…" : "Entrar a la operación"}</span><ArrowRight aria-hidden="true" /></Button>
          </form>
          <div className="login-security"><LockKeyhole aria-hidden="true" /><span><strong>Acceso seguro</strong> · Entorno interno MECSA</span></div>
        </motion.div>
        <footer className="login-access-footer"><span>Boston Comercial</span><span>Experiencia piloto · 2026</span></footer>
      </section>
    </main>
  );
}
