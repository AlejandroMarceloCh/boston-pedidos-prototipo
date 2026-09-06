import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, ClipboardList, Eye, EyeOff, LockKeyhole, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/store/app-store";
import { type DemoRole, useRoleStore } from "@/store/role-store";

const DEMO_ACCOUNTS: Record<string, { password: string; role: DemoRole; path: string }> = {
  "cliente.boston": { password: "cliente2026", role: "cliente", path: "/cliente" },
  "vendedor.boston": { password: "vendedor2026", role: "vendedor", path: "/vendedor" },
  "mesa.boston": { password: "mesa2026", role: "mesa", path: "/mesa" },
  "comercial.boston": { password: "comercial2026", role: "comercial", path: "/comercial" },
};
const portalOptions = [
  { icon: BookOpen, label: "Consultar el catálogo vigente" },
  { icon: ClipboardList, label: "Registrar y revisar solicitudes" },
  { icon: Truck, label: "Dar seguimiento a los pedidos" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { entrar } = useStore();
  const { setRole } = useRoleStore();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"usuario" | "password">("usuario");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (step === "usuario") {
      if (!usuario.trim()) return setError("Ingresa tu usuario para continuar.");
      setLoading(true);
      // En producción: iniciar precarga segura con un identificador opaco,
      // sin entregar datos privados ni confirmar si el usuario existe.
      setTimeout(() => {
        setLoading(false);
        setStep("password");
      }, 350);
      return;
    }

    if (!password) return setError("Ingresa tu contraseña.");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const account = DEMO_ACCOUNTS[usuario.trim().toLowerCase()];
      if (!account || password !== account.password) {
        setError("Usuario o contraseña incorrectos.");
        return;
      }
      entrar(usuario.trim().toLowerCase());
      setRole(account.role);
      toast.success("Acceso confirmado");
      navigate(account.path);
    }, 500);
  };

  return (
    <main className="login-experience">
      <section className="login-story" aria-label="Información del portal Boston">
        <video className="login-brand-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
          <source src="/boston-login.mp4" type="video/mp4" media="(min-width: 761px)" />
        </video>
        <div className="login-video-overlay" aria-hidden="true" />
        <div className="login-story-grid" aria-hidden="true" />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }} className="login-story-content">
          <img src="/boston-logo.png" alt="Boston - Calidad en confecciones" className="login-official-logo" />
          <div className="login-portal-copy">
            <span className="login-kicker">Portal de pedidos</span>
            <h1>Un solo lugar para gestionar tus pedidos Boston.</h1>
            <p className="login-story-lead">Accede con las credenciales asignadas a tu empresa o equipo comercial.</p>
          </div>
          <div className="login-flow" aria-label="Funciones disponibles">
            {portalOptions.map(({ icon: Icon, label }, index) => (
              <motion.div key={label} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .2 + index * .08 }} className="login-flow-item">
                <span className="login-flow-icon"><Icon aria-hidden="true" /></span>
                <strong>{label}</strong>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <div className="login-story-footer"><span>Boston · Portal comercial</span><span className="login-live"><i /> Servicio disponible</span></div>
      </section>

      <section className="login-access">
        <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5, delay: .08 }} className="login-access-card">
          <div className="login-mobile-brand"><img src="/boston-logo.png" alt="Boston" /></div>
          <div className="login-access-heading">
            <span className="login-access-number">ACCESO AL PORTAL</span>
            <h2>{step === "usuario" ? "Ingresa a Boston Pedidos" : "Confirma tu acceso"}</h2>
            <p>{step === "usuario" ? "Escribe tu usuario para comenzar." : "Ingresa tu contraseña para continuar al portal."}</p>
          </div>
          <form onSubmit={submit} className="login-form" noValidate>
            {error && <p role="alert" className="login-error">{error}</p>}
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="login-step">
              {step === "usuario" ? (
                <div className="login-field">
                  <Label htmlFor="user">Usuario</Label>
                  <Input id="user" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="usuario.apellido" autoComplete="username" autoFocus />
                </div>
              ) : (
                <>
                  <div className="login-user-confirmed">
                    <span><small>Usuario</small><strong>{usuario}</strong></span>
                    <button type="button" onClick={() => { setStep("usuario"); setPassword(""); setError(null); }}><ArrowLeft /> Cambiar</button>
                  </div>
                  <div className="login-field">
                    <div className="login-label-row">
                      <Label htmlFor="pwd">Contraseña</Label>
                      <button type="button" onClick={() => toast("Recuperación de contraseña", { description: "Solicita una nueva clave al responsable del portal en tu empresa." })}>Recuperar acceso</button>
                    </div>
                    <div className="login-password">
                      <Input id="pwd" type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
                      <button type="button" onClick={() => setShowPwd((shown) => !shown)} aria-label={showPwd ? "Ocultar clave" : "Mostrar clave"}>{showPwd ? <EyeOff /> : <Eye />}</button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
            <Button type="submit" disabled={loading} className="login-submit"><span>{loading ? "Preparando acceso…" : step === "usuario" ? "Continuar" : "Ingresar al portal"}</span><ArrowRight aria-hidden="true" /></Button>
          </form>
          <div className="login-security"><LockKeyhole aria-hidden="true" /><span><strong>Acceso seguro</strong> · Uso exclusivo para usuarios autorizados</span></div>
        </motion.div>
        <footer className="login-access-footer"><span>Boston Pedidos</span><span>Soporte de acceso</span></footer>
      </section>
    </main>
  );
}
