# P7 — Guion de validación de riskiest assumptions

> Objetivo: cerrar los 3 supuestos que pueden invalidar todo el diseño del asistente si resultan falsos. Tiempo total estimado: 3 sesiones de 45-60 min cada una. Llevar el asistente corriendo en una laptop o tablet para mostrar en vivo.

## Sesión 1 · Vendedores (Miguel + 2 vendedores más) — 60 min

**Marco:** basado en NEGDIG Sesión 11 (Entrevistas a usuarios) + The Mom Test (Rob Fitzpatrick, INGSOFT Semana 3). La regla: NO liderar al entrevistado, NO mostrar la solución primero, dejar que cuenten.

### Bloque 1 · Observación (15 min) — sin mostrar el sistema

1. Cuéntame el último pedido que tomaste, desde que llegaste con el cliente hasta que cargaste el sistema. Paso a paso.
2. ¿En qué momento decides qué producto ofrecer? ¿Te acuerdas del código o lo consultas?
3. Cuando el cliente te dicta el pedido, ¿cómo lo registras? (papel, memoria, foto).
4. Si tienes que modificar una cantidad o un precio al final, ¿cómo lo haces?
5. Muéstrame 3 casos del último mes donde el sistema actual te hizo perder tiempo o causó un error.

### Bloque 2 · Demo guiada (15 min) — muestras el asistente

Abre el asistente en tablet o laptop. Diles: "Esto es lo que estamos probando. Toma un pedido real que tengas pendiente, hazlo con esto y dime en voz alta qué piensas".

NO los ayudes. Toma nota de:
- En qué pantalla dudan.
- Qué buscan y no encuentran.
- Si preguntan "¿y dónde hago X?".
- Cuánto tardan en completar el pedido (cronómetro).

### Bloque 3 · Entrevista post-demo (20 min)

1. ¿Usarías esto con el cliente presente o lo cargarías después? ¿Por qué?
2. Si tuvieras que elegir entre este asistente y el papel + foto, ¿cuál? ¿Por qué?
3. ¿Qué paso del asistente te parece innecesario? ¿Cuál te parece que falta?
4. ¿Cómo resuelves hoy los SKU que no tienen stock? ¿Aceptas el pedido igual?
5. Si tuvieras 3 clientes esperando al mismo tiempo, ¿cómo manejarías los 3 pedidos con esto?
6. ¿El descuento inicial del 38% se aplica siempre? ¿O hay casos en los que no?

### Bloque 4 · Cierre (10 min)

1. Si tuvieras que priorizar 1 mejora, ¿cuál?
2. ¿Conoces a otros 2 vendedores que podríamos entrevistar?

### Red flags a escuchar

- "Eso ya lo hago en el cuaderno más rápido" → el asistente no aporta valor real.
- "No tengo tiempo de aprender esto" → el training cost es alto.
- "El cliente se impacienta si tardo" → el JTBD de tiempo no se cumple.
- "¿Y dónde está X?" → pantallas faltantes o no discoverables.

---

## Sesión 2 · Comercial — 45 min

**Marco:** NEGDIG Sesión 26 (Riskiest Assumptions). Búsqueda de supuestos no validados.

### Preguntas clave (slots 3/4)

1. En la tabla `tblpedidoswebdescuentos`, los slots 3 y 4 guardan valores 5%, 10%, 15% que NO aparecen en la tabla de escalas. ¿Qué son?
2. ¿Los aplica el vendedor libremente o requieren autorización?
3. Si requieren autorización, ¿quién la da y cómo se registra?
4. ¿Hay un tope máximo de descuento manual por pedido/cliente?

### Preguntas clave (descuento inicial 38%)

1. El descuento inicial del 38% (tipo `01` en `tblpedidoswebdescuentos`), ¿se aplica siempre? ¿En qué casos no?
2. ¿Es por tipo de cliente (distribuidor vs minorista)?
3. ¿Es por línea de producto? ¿O por temporada?
4. Si un cliente nuevo pide su primer pedido, ¿recibe el 38%?

### Preguntas clave (condiciones de venta)

1. Hoy existen `E/C/L/O/D` (contra entrega, contado, letras, obsequio, donación). ¿Cuándo aplica cada una?
2. ¿Hay clientes bloqueados por mal comportamiento de pago? ¿Quién decide?
3. ¿Las notas de crédito (si existen) afectan descuentos en el pedido siguiente?

### Output esperado

Documento de 1 página con:
- Definición de slots 3/4 (qué son, cómo se aplican, tope).
- Reglas del descuento inicial 38% (cuándo aplica, excepciones).
- Tabla de condiciones de venta con criterios de uso.

---

## Sesión 3 · Finanzas / Administración — 30-45 min

**Marco:** cerrar la pregunta 3 de la auditoría (§5): "no hay crédito, ni saldo, ni facturas, ni notas de crédito en ninguna de las dos BD".

### Preguntas

1. ¿Dónde se registra el crédito otorgado a cada cliente? (¿SAP? ¿Excel? ¿Concar? ¿Otro?)
2. ¿Cómo saben que un cliente tiene saldo a favor (nota de crédito)?
3. ¿Cómo bloquean a un cliente moroso? ¿Manual? ¿Automático?
4. Si un cliente paga con nota de crédito, ¿se respeta el precio de la nota o se actualiza?
5. ¿El sistema actual de pedidos se conecta con el sistema contable? ¿Cómo?

### Output esperado

Definir **SI** o **NO** para cada pregunta. Si NO, marca la pregunta original de la auditoría como bloqueante para el sprint S6 (scoring automático).

---

## Reglas de la entrevista (NEGDIG Sesión 11)

- Modo aprendiz: no vendas la solución.
- Evidencia mata opinión: anota hechos, no interpretaciones.
- Diversidad: si los 3 vendedores dicen lo mismo, suma 2 más distintos (un nuevo, un antiguo).
- 1 hora máxima. Más que eso cansa al entrevistado.
- Grabar con consentimiento. Si no, tomar notas detalladas.

## Cómo procesar los resultados

Después de las 3 sesiones, en 1 hora:

1. Transcribe los 3 momentos donde cada entrevistado dudó o se quejó.
2. Anota qué supuesto crítico se invalidó (si alguna).
3. Si un supuesto se invalida → re-pensar esa parte del diseño.
4. Si todos se confirman → seguir con P5 (Modo Express) y P9 (backend).

Documento final: 1 página con 3 supuestos, 3 resultados, 3 decisiones (seguir / iterar / pivotar).
