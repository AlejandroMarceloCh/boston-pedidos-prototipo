# Boston Pedidos

Prototipo de un sistema de toma de pedidos mayoristas para **Boston**, fabricante peruano de
ropa interior y pijamas.

Hoy sus vendedores toman los pedidos en un cuaderno de papel frente al cliente y los cargan
horas después; si hay apuro, fotografían la hoja y otra persona la digita. De ahí salen los
errores que se repiten: *"yo pedí 18, no 7 y 5"*, *"pedí L, no XS"*, *"quería negro, no
marrón"*. Y el problema de fondo es el stock: el vendedor ve la disponibilidad de la mañana
y para entonces sus compañeros ya vendieron eso.

> **Es un prototipo, no un producto.** No hay backend: todo el estado vive en el navegador de
> cada persona. Sirve para validar los flujos con vendedores reales antes de construir el
> sistema de verdad. Ver [Limitaciones](#limitaciones).

---

## Arrancar

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Credenciales de demostración:

- Cliente: `cliente.boston` / `cliente2026`
- Vendedor: `vendedor.boston` / `vendedor2026`
- Mesa: `mesa.boston` / `mesa2026`
- Panel comercial: `comercial.boston` / `comercial2026`

```bash
npm run build        # compila a dist/
npm test             # 75 tests
npm run lint
```

Para publicarlo en un servidor, ver **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)** — hace falta
configurar el fallback de rutas o recargar la página dará 404.

---

## Qué hace

- **Asistente de pedido en 4 pasos** — cliente, ítems, descuentos, confirmación.
- **Matriz color × talla** para cargar variantes sin ambigüedad, en docenas, con el stock
  disponible a la vista y navegación de hoja de cálculo.
- **Pedido y solicitud como documentos distintos.** Si el cliente quiere 500 y hay 20, al
  confirmar salen dos documentos: un pedido por las 20, que reserva stock, y una solicitud
  por las 480, que no reserva y se aprueba o se rechaza. Es el concepto central que pidió el
  cliente, y lo que permite registrar la demanda que hoy se pierde.
- **Stock que se descuenta al confirmar**, no al facturar, con reserva que vence.
- **Facturación partida y multi-destino** — el mismo artículo repartido entre varios RUC, cada
  parte con su dirección de entrega, su factura y su guía.
- **Informe de demanda no atendida**, agrupado por artículo, que es lo que se le muestra a
  producción para justificar qué reponer.

---

## Cómo está armado

`React 19` · `TypeScript` · `Vite` · `Tailwind` · `Radix` · `Vitest`

```
frontend/src/
  pages/          una por pantalla; armado-pedido.tsx es el asistente
  features/       matriz de carga, detalle de pedido, detalle de cliente
  components/ui/  primitivas (shadcn)
  store/          estado, persistencia y lecturas derivadas
  lib/            cálculo de totales y datos de ejemplo
docs/             requisitos, flujos, guion de entrevistas, despliegue
```

Dos decisiones que explican el resto:

**El estado vive en un solo lugar** (`store/app-store.tsx`), con un reducer que valida las
transiciones. Las reglas de negocio están ahí y no en las pantallas: confirmar un pedido
reparte contra el stock, valida el estado de origen y registra el evento, todo dentro del
reducer. Las pantallas solo despachan.

**El stock no se guarda, se deriva.** Se calcula sumando los pedidos vivos. Así anular
devuelve stock por definición, no por una resta a mano que se puede descuadrar.

---

## Documentación

| | |
|---|---|
| [docs/REQUISITOS.md](docs/REQUISITOS.md) | Los 53 requisitos, con la cita que los origina y su estado real |
| [docs/flujos.md](docs/flujos.md) | Cinco diagramas de los flujos principales |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | Cómo publicarlo |
| [docs/P7-guion-validacion-asunciones.md](docs/P7-guion-validacion-asunciones.md) | Guion de las entrevistas pendientes |

---

## Limitaciones

Están declaradas a propósito: es lo que hay que saber antes de mostrarlo.

- **No hay backend.** Cada navegador es independiente: dos vendedores no comparten stock ni se
  ven entre sí. La concurrencia real —que es el problema que el sistema viene a resolver— no
  se puede probar sin servidor.
- **Los descuentos no están validados.** El 38% inicial, la escala por volumen y el descuento
  manual vienen de una sesión anterior y nadie confirmó de dónde salieron. Si alguien va a
  mirar los importes, hay que decírselo antes.
- **No hay seguridad.** La credencial está en el código y los datos se pueden alterar desde el
  navegador. Red interna solamente.
- **Los datos son de ejemplo.** Clientes, artículos y stock son inventados; los pedidos de
  muestra se reproyectan sobre la fecha actual.
- **Sin validar con usuarios.** Nadie midió todavía si esto es más rápido que el cuaderno,
  que es la única comparación que decide si lo adoptan.

## Qué falta

Lo que sigue no depende de programar más, sino de tres conversaciones: con **Comercial**
(descuentos y bonificaciones), con **Finanzas** (crédito y documentos) y con los
**vendedores** (si esto les sirve). El guion está en `docs/P7`.

Después de eso, el backend — que no es "conectar una API": exige reserva transaccional,
correlativos del lado del servidor, dinero en enteros y la máquina de estados validada ahí.
