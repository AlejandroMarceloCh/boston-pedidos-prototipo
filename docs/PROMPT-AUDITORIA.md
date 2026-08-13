# Prompt para la auditoría externa

Copiar el bloque completo y pegarlo en el modelo que hará la auditoría, con acceso
al repositorio `BostonPedidos`.

---

Actúas como auditor técnico independiente. Vas a revisar un prototipo de sistema de toma de
pedidos y **no debes confiar en su documentación**: parte de tu trabajo es comprobar si dice
la verdad. Ya ocurrió antes que los estados de los requisitos estuvieran mal en ambas
direcciones.

## El problema que el sistema debe resolver

Boston es un fabricante peruano de ropa interior y pijamas que vende al por mayor a
distribuidoras y boutiques. Hoy sus vendedores toman los pedidos **en un cuaderno de papel**
frente al cliente y los cargan horas después; si hay apuro, fotografían la hoja y otra
persona la digita. De ahí salen errores como *"yo pedí 18, no 7 y 5"*, *"no pedí XS, pedí L"*,
*"me gusta el negro, no el marrón"*.

El problema de fondo es el stock: el vendedor ve disponibilidad de la mañana y sus compañeros
ya vendieron eso. La fuente primaria es la transcripción de una reunión de dirección, ventas
y sistemas del 7 de agosto de 2026:

`Transcripciones/output/REU-SALAVENTAS-INVENTARIO_20260807.txt`

**Léela completa antes de auditar.** Es el criterio contra el que hay que medir todo. Está
fuera del repositorio del proyecto, un nivel arriba, en la carpeta de Transcripciones.

## Qué hay construido

Un frontend en React 19 + TypeScript + Vite + Tailwind, **sin backend** (la carpeta
`backend/` tiene solo directorios vacíos). El estado vive en `localStorage` mediante un store
propio con Context + useReducer, en `frontend/src/store/`.

Documentos del proyecto, en `docs/`:

| Archivo | Qué contiene |
|---|---|
| `REQUISITOS.md` | Los 53 requisitos con su origen citado y su estado declarado |
| `requisitos-audio-inventario.md` | Análisis detallado del audio con citas largas |
| `flujos.md` | Cinco diagramas Mermaid de los flujos |
| `P7-guion-validacion-asunciones.md` | Guion de entrevistas pendientes |
| `decision-matriz-carga.html` | Decisión de diseño de la pantalla de carga |

## Cómo verificar de verdad

**Atención con esto:** `npx tsc --noEmit` a secas **no revisa ni un solo archivo**. El
`tsconfig.json` raíz tiene `"files": []` y solo referencias, así que sale limpio siempre. Ya
se dieron por buenos commits que rompían el build usando ese comando.

```bash
cd frontend
npx tsc -p tsconfig.app.json --noEmit   # chequeo real de tipos
npm run build                            # tsc -b && vite build
npx vitest run                           # 53 tests
npm run lint
npm run dev                              # y recorrer el flujo en el navegador
```

## Qué auditar

1. **Correctitud del dinero.** El cálculo vive en `src/lib/pedido-calc.ts`. Verifica que los
   descuentos se apliquen sobre lo atendible y no sobre lo solicitado, que el IGV sea 18%, que
   los importes por línea sumen el subtotal en todas las pantallas, y que nada quede
   descuadrado entre lo que se muestra y lo que se guarda.

2. **Coherencia del modelo.** Un pedido se parte en dos documentos al confirmar: el pedido con
   lo atendible y una solicitud con el excedente. Comprueba que la solicitud no reserve stock,
   que la numeración no se descuadre, que nada se pierda entre ambos, y que anular devuelva
   exactamente lo que reservó.

3. **Transiciones de estado.** `borrador → confirmado → facturado → entregado`, más `anulado`.
   Busca transiciones que dejen el pedido en un estado imposible, eventos que no se registren,
   o acciones disponibles donde no corresponde.

4. **Requisito por requisito.** Toma `REQUISITOS.md` y verifica **cada** estado declarado
   contra el código. Interesan sobre todo los marcados ✅ que no lo estén. Reporta también los
   falsos negativos: cosas marcadas como faltantes que sí están.

5. **Fidelidad al audio.** ¿Hay algo que la reunión pidió y no está recogido en ningún
   requisito? ¿Hay requisitos inventados que nadie pidió?

6. **Lo que se rompe en una demo.** Números que no cuadran entre pantallas, botones que no
   hacen nada, títulos que mienten sobre lo que muestran, textos que prometen comportamiento
   inexistente.

## Debilidades que ya conozco

No las listo para que las pases por alto, sino para que confirmes si son peores de lo que creo
y busques las que no vi:

- **No hay tests de interfaz.** Los 53 tests cubren lógica; ninguno renderiza un componente.
  Los dos de `src/pages/responsive.test.ts` inspeccionan el texto del archivo fuente, lo cual
  es frágil ante cualquier refactor.
- **Las "48 horas" de reserva son un supuesto.** Se implementó el vencimiento con ese número
  porque era el que ya se comunicaba, pero nadie lo confirmó.
- **La base del descuento manual está sin definir.** Se aplica sobre el subtotal bruto mientras
  los otros dos van en cascada. Hay un `TODO` en el código; en un pedido de S/ 13.000 la
  diferencia son unos S/ 500.
- **Las curvas de talla son una suposición** sobre el negocio textil, no un dato validado.
- **Nadie midió** si el sistema es más rápido que el cuaderno, que es la única comparación que
  importa para que lo adopten.

## Qué entregar

Un informe con:

1. **Defectos**, cada uno con archivo y línea, cómo reproducirlo, y qué se rompe. Ordenados por
   impacto real en el negocio, no por gravedad técnica.
2. **Requisitos mal declarados**, en ambas direcciones, con la evidencia en el código.
3. **Lo que el audio pide y no está** en ningún requisito.
4. **Riesgos de la arquitectura** de cara a construir el backend encima.

Prioriza lo que le costaría dinero o credibilidad a la empresa por sobre lo que es incómodo
para el programador. Si algo está bien resuelto, dilo en una línea y sigue: el informe es para
encontrar problemas, no para repartir elogios.
