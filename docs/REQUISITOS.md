# Boston Pedidos — Requisitos

Documento único de referencia: **todo lo que se pidió que haga el sistema**, con su origen y
su estado real en el prototipo. Se actualiza cuando aparece una fuente nueva.

**Última revisión:** 13 de agosto de 2026

### Fuentes

| # | Fuente | Fecha |
|---|---|---|
| A | Reunión Sala de Ventas · Inventario — `Transcripciones/output/REU-SALAVENTAS-INVENTARIO_20260807.txt` | 7 ago 2026 |
| B | Auditoría del ERP actual (2 bases de datos, tablas `tblpedidosweb*`) — citada en `P7-guion-validacion-asunciones.md` | previa |
| C | Guion de validación P7 — `docs/P7-guion-validacion-asunciones.md` | ago 2026 |

Las citas entre comillas son textuales de la fuente A salvo indicación.

### Estado

`✅ Hecho` · `🟡 Parcial` · `❌ Falta` · `⛔ Bloqueado` (depende de un dato o decisión que no existe)

> **Cómo leer esta columna.** Una auditoría externa del 13 de agosto encontró 15 estados mal
> declarados: la mayoría marcados ✅ porque *la lógica existía y estaba testeada*, mientras el
> flujo real de la aplicación no llegaba a ejecutarla. El criterio ahora es más estricto: un
> requisito solo es ✅ si se puede recorrer **en la interfaz, de punta a punta**. Que un test
> del reducer pase no alcanza.

### Resumen

La columna «Falta» agrupa ❌ y ⛔.

| Área | Hecho | Parcial | Falta |
|---|---|---|---|
| Catálogo y stock | 3 | 2 | 1 |
| Toma de pedidos | 7 | 1 | 1 |
| Pedido vs solicitud | 4 | 0 | 1 |
| Descuentos y beneficios | 3 | 2 | 5 |
| Facturación y entrega | 5 | 1 | 0 |
| Cliente y crédito | 1 | 1 | 4 |
| Avisos y trazabilidad | 3 | 2 | 0 |
| No funcionales | 1 | 1 | 4 |
| **Total** | **27** | **10** | **16** |

---

## 0. Para qué existe el sistema

Reemplazar la toma de pedidos en papel. Hoy el vendedor anota en un cuaderno frente al
cliente y lo carga horas después; si hay apuro, fotografía la hoja y otra persona la digita.

De ahí salen los errores que enumeran en la reunión: *"yo te he pedido 18, yo te he pedido 7
y 5"*, *"yo no he pedido XS, yo he pedido L"*, *"a mí me gusta el negro, no el marrón"*.

Y el problema de fondo, que es de stock:

> *"puede ser que tomes el pedido y que no sepas si hay o no hay stock. (…) al momento que se
> fije en la mañana sí hay stock, pero tus otros cuatro compañeros vendieron, ya ese stock ya
> lo vendieron. O sea, **necesitas algo que se alimente del stock actual**."*

**Alcance de la primera versión**, según la propia reunión:
> *"para hacer algo rápido (…) hoy lo que tiene que mirar es el almacén."*

### Usuarios

| Actor | Rol | Fuente |
|---|---|---|
| **Vendedor** (Miguel y su equipo) | Usuario principal. Origina los pedidos. | *"el usuario principal es Miguel y su equipo"* |
| **Cliente** (distribuidor, boutique, retail) | A futuro origina **solicitudes**, no pedidos. | *"El pedido lo tienen que originar nuestros vendedores. La solicitud es la que puede originar el cliente."* |
| Comercial | Define descuentos, bonificaciones y autoriza excepciones. | C |
| Finanzas / Administración | Crédito, facturación, notas de crédito. | C |

---

## 1. Catálogo y stock

| ID | Requisito | Estado |
|---|---|---|
| **RF-01** | Mostrar el stock **disponible en el momento**, no el de la mañana. *"necesitas algo que se alimente del stock actual"* | 🟡 Se alimenta del estado local y descuenta lo comprometido. **No ve a los otros vendedores**: eso exige backend (RF-05, RF-06) |
| **RF-02** | El stock se descuenta **al confirmar el pedido**, no al facturar. *"hoy nuestro stock se ve afectado cuando se factura. No cuando hay un pedido. ¿Debería ser así? No. Debería ser bajo el pedido."* | ✅ Reserva al confirmar y **vencimiento real**: pasadas las horas de reserva el stock se libera solo, y el detalle lo avisa. El plazo (48 h) sigue sin confirmarse — pregunta 10 — pero es una constante |
| **RF-03** | Anular un pedido devuelve el stock. | ✅ |
| **RF-04** | Buscar artículos por código, nombre, línea o género. | ✅ Corregido: el género no estaba en la búsqueda del catálogo, y en el asistente se comparaba contra el código crudo ("dam"), no contra la etiqueta |
| **RF-05** | El stock debe venir del ERP en vivo, no de datos locales. | ❌ Requiere backend |
| **RF-06** | Resolver la concurrencia entre vendedores: dos vendedores no pueden comprometer la misma unidad. *"Todos a la vez van a ver el mismo stock."* | 🟡 El cálculo es correcto, pero sin servidor no hay concurrencia real |

---

## 2. Toma de pedidos

| ID | Requisito | Estado |
|---|---|---|
| **RF-10** | Registrar el pedido de forma estructurada, no en papel. *"en lugar de que lo registren en un papel, lo registren como un pedido o un prepedido"* | ✅ |
| **RF-11** | Capturar color y talla sin ambigüedad (matriz color × talla). | ✅ |
| **RF-12** | Cargar en **docenas**, que es la unidad del negocio, permitiendo unidades sueltas al ajustar. | ✅ |
| **RF-13** | Editar precio unitario por línea. | ✅ |
| **RF-14** | Guardar borrador y retomarlo después. | ✅ |
| **RF-15** | Funcionar en **celular y tablet**, no solo escritorio. *"que el mismo cliente pueda hacer su pedido (…) desde un celular, desde un iPad, desde una computadora"* | ✅ Se completa el pedido en cualquier ancho, y la matriz pasa a una tarjeta por color en pantallas chicas. Falta medirlo con vendedores reales (RF-16) |
| **RF-16** | Usarse **frente al cliente**, sin que se impaciente. | 🟡 Por validar en P7 |
| **RF-17** | **Fecha de entrega comprometida** en el pedido. Sin ella no se puede saber si un saldo es culpa de Boston. *"El decir que sí te voy a atender, pero no llego a la fecha"* | ✅ Campo en el pedido, obligatorio para confirmar |
| **RF-18** | Manejo de **pedidos urgentes**. *"¿Y cómo se hace el tema de urgencias?" — "Yo no sé cómo… yo me estoy enterando de esto."* | ⛔ Nadie supo explicar cómo funciona hoy |

---

## 3. Pedido vs Solicitud · el cambio de modelo pendiente

Es el concepto central de la reunión y **el prototipo no lo tiene**.

> *"una cosa es la compra y otra cosa es la solicitud de compra, son dos cosas distintas"*
> *"**El pedido está en base al stock y la solicitud sobre lo que deseo.**"*

El ejemplo: el cliente quiere 500 y hay 20 → *"quiero las 20, y esas 480 es una solicitud"*.

| ID | Requisito | Estado |
|---|---|---|
| **RF-20** | Partir el requerimiento en dos documentos: **pedido** (lo que hay) y **solicitud/prepedido** (lo que falta). | ✅ Al confirmar; la solicitud lleva el número del pedido con sufijo `-S` y quedan vinculadas |
| **RF-21** | La solicitud se aprueba o se rechaza explícitamente. *"o lo atiendo o no lo atiendo"* | ✅ Aprobar pide fecha comprometida y habilita "Atender con stock actual", que crea el pedido que la cumple y reserva. Rechazar la saca de la demanda |
| **RF-22** | El cliente puede originar solicitudes, incluso **sin ver el stock**. *"en el término de la solicitud ni siquiera tenga que mirar nuestros stocks el cliente"* | ❌ El modelo ya lo soporta; falta el acceso del cliente, que necesita backend |
| **RF-23** | Un pedido no debe comprometer lo que no existe. *"nosotros nos comprometemos aun por lo que no tenemos"* — política que la reunión califica de errada. | ✅ Ahora se puede **pedir** de más, pero el pedido confirmado solo contiene lo atendible: el resto va a la solicitud. Se registra la demanda sin comprometerla |
| **RF-24** | La proyección de demanda debe alimentarse de pedidos reales, no inflados. *"¿qué pasa si el pedido te inflan y luego te devuelven la mercadería? Te engañas tú solo."* Conecta con producción: *"tiene que ver con temas de producción"* | ✅ Pedidos y solicitudes separados en KPIs y listados, más el informe de **demanda no atendida** agrupado por artículo. Una solicitud rechazada no empuja producción |

---

## 4. Descuentos y beneficios

### Reglas conocidas hoy

Escala por volumen (docenas totales): 0-4 → 11% · 5-49 → 12% · 50-99 → 13% · 100-199 → 14% ·
200-249 → 15% · 250+ → 18%. Descuento inicial 38% (tipo `01` en `tblpedidoswebdescuentos`).
Slots 3 y 4 con valores 5/10/15% **cuyo significado nadie confirmó** (fuente B y C).

| ID | Requisito | Estado |
|---|---|---|
| **RF-30** | Mostrar el descuento **mientras se arma el pedido**, no en una liquidación posterior. *"en ese mismo momento debería de saber cuánto le va a tocar el descuento"* | ✅ |
| **RF-31** | Descuento por volumen según escala de docenas. | ✅ |
| **RF-32** | **El beneficio se calcula sobre lo atendible, no sobre lo solicitado.** *"antes, para acceder a un beneficio, te pedían lo que no teníamos. Sabían que no había."* · *"ahora se está diciendo sobre el stock que tenemos"* · *"¿Qué es lo real que ha comprado?"* | ✅ `lib/pedido-calc.ts` recorta cada línea a `min(pedido, stock)`; las docenas y el subtotal salen de lo atendible |
| **RF-33** | **Bonificaciones**, mecanismo distinto del descuento. *"tanto en formas de pago como en mecanismos de bonificación"* · *"esta es la bonificación que te toca"* | ❌ Falta definir la mecánica (¿producto gratis?) |
| **RF-34** | La **forma de pago** influye en el esquema comercial. | ❌ Se guarda `condicion` pero no afecta ningún cálculo |
| **RF-35** | Condiciones de venta reales: **E/C/L/O/D** = contra entrega, contado, letras, **obsequio**, **donación** (fuente C). | 🟡 Las cinco se eligen, se guardan y se aplican: obsequio y donación **no generan cobro ni IGV**. **Cómo se documentan** ante SUNAT sigue siendo pregunta para Finanzas |
| **RF-36** | Descuento diferenciado por **tipo de cliente** (distribuidor vs minorista). | ❌ La interfaz rotula "Distribuidor · descuento adicional" pero el cálculo no lo usa |
| **RF-37** | Autorización para descuentos manuales por encima del tope, con registro de quién autoriza. | 🟡 Pide confirmación en pantalla; no registra autorizante |
| **RF-38** | El **saldo conserva el descuento de su campaña original**. *"me tienes que respetar el descuento de esa vez"*, siempre que *"el error sea de la empresa"*. | ❌ |
| **RF-39** | **Notas de crédito** como saldo a favor. *"te respetan ese monto hasta que lo ejecutes"* | ❌ |

---

## 5. Facturación y entrega

| ID | Requisito | Estado |
|---|---|---|
| **RF-40** | Emitir factura al pedido confirmado. | 🟡 Correlativo por serie, uno por partida, con evento por cada RUC. **No emite documento real** ni se comunica con SUNAT: eso es backend |
| **RF-41** | **Facturación partida entre varios RUC.** *"de esas 100,000, 45,000 me las facturas a mí, 25,000 a ella"* | ✅ Partidas con **cantidad por SKU**, no SKU completos: el mismo artículo se reparte entre dos RUC. No se confirma si el reparto no cuadra |
| **RF-42** | **Entrega en varios destinos.** *"y quiero que esa me la entregues en ese sitio, y en ese otro sitio"* | ✅ Cada partida tiene su dirección de entrega |
| **RF-43** | **Guía de remisión** como documento separado de la factura. *"no es con la guía, es con la carga del almacén. Guía, factura, guía, factura."* | ✅ Se emite al entregar, con correlativo propio (serie T001, independiente del de facturas) y una por destino |
| **RF-44** | Nota de crédito al anular un pedido facturado. | ✅ Una por factura emitida (serie FC01). Alcanzable desde el detalle de un pedido facturado. Anular uno solo confirmado no emite nada |
| **RF-45** | Registrar el **saldo** (lo no atendido) y su causa: responsabilidad de Boston o falta de insumo. | ✅ Entrega parcial registra el faltante como saldo con causa `boston`; el excedente por falta de stock va a solicitud (RF-20). Reclasificable desde el detalle |

---

## 6. Cliente y crédito

| ID | Requisito | Estado |
|---|---|---|
| **RF-50** | Maestro de clientes con RUC, direcciones y tipo. | ✅ Corregido: las estadísticas de la ficha cruzaban por razón social y mostraban 0 pedidos para todos; ahora cruzan por `clienteId` |
| **RF-51** | **Línea de crédito y deuda** del cliente, para decidir si se le vende. *"el tipo de cliente que es, su crédito, el crédito que tiene, las deudas que tiene"* | ⛔ La auditoría (B) indica que **no hay crédito ni saldos en ninguna de las dos BD** |
| **RF-52** | **Muestras** en poder del cliente. *"las muestras que tiene"* | ❌ |
| **RF-53** | **Prioridad de asignación de stock** entre clientes. *"El primero que llega (…) que no es buen cliente. (…) el buen cliente no puede comprar, porque ya no hay."* | ❌ Sin criterio definido |
| **RF-54** | Bloqueo de clientes morosos. | ❌ |
| **RF-55** | Alta de clientes nuevos. | 🟡 Formulario que registra la solicitud; **no crea el cliente** (en Boston el alta la aprueba Créditos) |

---

## 7. Avisos y trazabilidad

| ID | Requisito | Estado |
|---|---|---|
| **RF-60** | Historial de cada pedido con sus cambios de estado. | ✅ |
| **RF-61** | Estados: borrador → confirmado → facturado → entregado, más anulado. | ✅ Con **máquina de estados**: el reducer valida el origen de cada transición. No se puede facturar un borrador, entregar sin facturar, reconfirmar ni anular un entregado |
| **RF-62** | **Confirmación automática al cliente** al cerrar el pedido. *"automáticamente uno se refleje acá y otro se dispara al cliente para que te lo confirme"* — hoy el cliente se entera cuando llega la mercadería. | 🟡 Abre WhatsApp con el texto y el número, y **registra que se envió**. El disparo **automático** necesita WhatsApp Business API y backend |
| **RF-63** | El cliente puede aceptar o corregir el pedido antes de que se despache. | 🟡 Se registra a mano si aceptó o pidió correcciones, con rastro. El canal donde el cliente responde solo necesita backend |
| **RF-64** | Reportes de ventas y almacén. *"se tiene que generar información de las ventas, del almacén, de todo"* | ✅ Pantalla de Informes: ventas por cliente y por condición, stock crítico y demanda no atendida |

---

## 8. No funcionales

| ID | Requisito | Estado |
|---|---|---|
| **RNF-01** | El sistema debe **cruzar todo el negocio**: cliente, estado, producto, stock, venta. | ❌ Requiere integración con el ERP |
| **RNF-02** | **Seguridad**, con revisión ofensiva antes de exponerlo. *"Hagan ethical hacking a todos sus códigos (…) la misma tienda online tiene 35 mil intentos"* | ❌ Pendiente hasta que haya backend y URL pública |
| **RNF-03** | Accesible desde fuera de la oficina. *"necesitamos una URL para salir a la calle"* | ❌ |
| **RNF-04** | Robustez. *"que funcione robustamente"* | 🟡 53 tests sobre cálculo, transiciones, stock, split, partidas y documentos. Sin tests de interfaz (no hay jsdom ni testing-library) |
| **RNF-05** | Los totales del sistema deben ser exactos y consistentes en toda la aplicación. | ✅ Un solo módulo de cálculo y **una sola política de redondeo**: el precio se normaliza a céntimos al entrar y el subtotal es la suma de los importes por línea ya redondeados. `subtotal − descuento + IGV` es exactamente el total, con test |
| **RNF-06** | Debe ser más rápido que el cuaderno. *"eso ya lo hago en el cuaderno más rápido"* es una red flag declarada en C. | ❌ Sin medir; se cronometra en P7 |

---

## 9. Preguntas abiertas

Bloquean decisiones de diseño. Las primeras seis salen del audio; las demás, de la auditoría
del ERP y del guion P7.

1. ¿La solicitud es un documento aparte del pedido, o una parte del mismo? (RF-20)
2. ¿Quién aprueba una solicitud y con qué criterio? (RF-21)
3. ¿Cómo se maneja hoy un pedido **urgente**? (RF-18)
4. ¿La **bonificación** es producto gratis o descuento? ¿Sobre qué se calcula? (RF-33)
5. ¿Cuánto cambia el descuento entre distribuidor y minorista, y entre contado y letras? (RF-34, RF-36)
6. ¿La factura partida y el multi-destino son frecuentes o excepcionales? (RF-41, RF-42)
7. ¿Qué son los **slots 3 y 4** de `tblpedidoswebdescuentos` (5/10/15%)? ¿Quién los autoriza y con qué tope? (RF-37)
8. ¿El **38% inicial** aplica siempre? ¿Depende de cliente, línea o temporada? ¿Y un cliente nuevo? (RF-36)
9. ¿Dónde vive el **crédito** del cliente, si no está en ninguna de las dos bases? (RF-51)
10. ¿Cuánto dura una **reserva de stock** antes de liberarse? La interfaz dice 48 h, sin fuente. (RF-02)
11. ¿Cómo se controlan las **muestras** en poder del cliente? (RF-52)

---

## 10. Glosario

| Término | Significado |
|---|---|
| **Pedido** | Compra en firme sobre stock existente. Lo origina el vendedor. |
| **Solicitud / prepedido** | Requerimiento sobre lo que no hay stock. Se atiende si se puede. |
| **Saldo** | Lo que se comprometió y no se entregó. *"El famoso saldo: lo que no atendiste."* |
| **Docena** | Unidad de venta del negocio. 12 unidades. |
| **Bonificación** | Beneficio distinto del descuento porcentual. Mecánica por confirmar. |
| **Slot 3 / 4** | Descuentos adicionales del ERP actual, de significado no confirmado. |
| **Curva de tallas** | Reparto proporcional de un volumen entre tallas. Supuesto **no validado**. |

---

## 11. Estado y qué sigue

**Cerrado en agosto de 2026** — todo lo que se podía construir sin backend y sin
respuestas pendientes:

RF-02 vencimiento de la reserva · RF-04 búsqueda por género · RF-15 móvil y tablet ·
RF-17 fecha comprometida · RF-20 a RF-24 split pedido/solicitud · RF-32 descuento sobre lo
atendible · RF-35 condiciones de venta · RF-41 y RF-42 facturación partida y multi-destino ·
RF-43 guía de remisión · RF-44 nota de crédito · RF-45 causa del saldo · RF-50 estadísticas
de cliente · RF-62 y RF-63 en su parte manual · RF-64 informes · RNF-05 cálculo único.

### Bloqueado por las entrevistas P7

No se puede construir sin que Comercial o Finanzas respondan (§9):

- **RF-33** bonificaciones — no se sabe si son producto gratis o porcentaje (pregunta 4).
- **RF-34, RF-36** cómo influyen la forma de pago y el tipo de cliente (pregunta 5).
- **RF-37** qué son los slots 3 y 4, quién autoriza y con qué tope (pregunta 7).
- **RF-38, RF-39** arrastre del descuento al saldo y notas de crédito como saldo a favor.
- **RF-18** urgencias — en la reunión nadie supo explicar cómo funcionan hoy.
- **RF-51, RF-52, RF-53, RF-54** crédito, muestras, prioridad y morosos. La auditoría del
  ERP indica que **el dato no existe en ninguna de las dos bases**.

### Bloqueado por el backend

- **RF-05** stock en vivo del ERP · **RF-06** concurrencia real entre vendedores.
- **RF-22** el cliente originando solicitudes por su cuenta.
- **RF-62** disparo automático del aviso · **RF-63** canal donde el cliente responde solo.
- **RNF-01** cruce con el resto del negocio · **RNF-02** seguridad y revisión ofensiva ·
  **RNF-03** acceso desde fuera de la oficina.

### Deuda conocida

- **RNF-04**: 75 tests, de los cuales 4 son de interfaz. Cubren el recorrido de armar y
  confirmar un pedido, la condición de venta, el catálogo y el guard de sesión. Faltan las
  demás pantallas: informes, clientes y las transiciones desde el detalle.
- **RNF-06**: nadie midió todavía si es más rápido que el cuaderno. Se cronometra en P7.
- **RF-16**: falta probarlo con un vendedor frente a un cliente real.
