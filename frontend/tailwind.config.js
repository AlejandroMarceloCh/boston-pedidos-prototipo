import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          soft: "hsl(var(--primary-soft))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          soft: "hsl(var(--success-soft))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          soft: "hsl(var(--warning-soft))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Sombras con tinte cálido (30 25% 10%) en vez de negro puro: sobre el fondo
      // crema el negro se ve sucio y gris. Escala de 4 pasos, cada una con una capa
      // de contacto corta y otra de difusión.
      boxShadow: {
        subtle: "0 1px 2px -1px hsl(30 25% 10% / 0.10), 0 1px 1px -1px hsl(30 25% 10% / 0.06)",
        card: "0 1px 2px -1px hsl(30 25% 10% / 0.10), 0 4px 8px -3px hsl(30 25% 10% / 0.10)",
        lifted: "0 2px 4px -2px hsl(30 25% 10% / 0.12), 0 8px 16px -6px hsl(30 25% 10% / 0.14)",
        elevated: "0 4px 8px -4px hsl(30 25% 10% / 0.14), 0 16px 32px -12px hsl(30 25% 10% / 0.18)",
        // Botón: sombra de apoyo + una línea de luz arriba que simula el bisel.
        raised:
          "inset 0 1px 0 0 hsl(0 0% 100% / 0.16), 0 1px 2px 0 hsl(30 25% 10% / 0.18), 0 2px 5px -1px hsl(30 25% 10% / 0.14)",
        "raised-hover":
          "inset 0 1px 0 0 hsl(0 0% 100% / 0.20), 0 2px 4px -1px hsl(30 25% 10% / 0.20), 0 5px 10px -2px hsl(30 25% 10% / 0.18)",
        "raised-press": "inset 0 2px 4px 0 hsl(30 25% 10% / 0.22)",
        // Campos de texto: hundidos, no elevados.
        sunken:
          "inset 0 1px 2px 0 hsl(30 25% 10% / 0.09), inset 0 0 0 1px hsl(30 25% 10% / 0.02)",
        // Barras fijas: la sombra cae hacia el contenido que scrollea debajo.
        bar: "0 1px 0 0 hsl(30 16% 88% / 1), 0 4px 12px -6px hsl(30 25% 10% / 0.16)",
        rail: "1px 0 0 0 hsl(30 16% 88% / 1), 4px 0 14px -8px hsl(30 25% 10% / 0.14)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in": "slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
