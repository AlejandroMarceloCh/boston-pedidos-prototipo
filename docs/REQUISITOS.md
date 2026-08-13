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

### Resumen

| Área | Hecho | Parcial | Falta |
|---|---|---|---|
| Catálogo y stock | 4 | 1 | 1 |
| Toma de pedidos | 5 | 2 | 2 |
| Pedido vs solicitud | 0 | 1 | 4 |
| Descuentos y beneficios | 2 | 1 | 6 |
| Facturación y entrega | 1 | 1 | 5 |
| Cliente y crédito | 1 | 1 | 4 |
| Avisos y trazabilidad | 2 | 1 | 2 |
| No funcionales | 1 | 1 | 4 |

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
| **RF-01** | Mostrar el stock **disponible en el momento**, no el de la mañana. *"necesitas algo que se alimente del stock actual"* | ✅ |
| **RF-02** | El stock se descuenta **al confirmar el pedido**, no al facturar. *"hoy nuestro stock se ve afectado cuando se factura. No cuando hay un pedido. ¿Debería ser así? No. Debería ser bajo el pedido."* | ✅ |
| **RF-03** | Anular un pedido devuelve el stock. | ✅ |
| **RF-04** | Buscar artículos por código, nombre, línea o género. | ✅ |
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
| **RF-15** | Funcionar en **celular y tablet**, no solo escritorio. *"que el mismo cliente pueda hacer su pedido (…) desde un celular, desde un iPad, desde una computadora"* | 🟡 Responsive parcial; la matriz no está adaptada |
| **RF-16** | Usarse **frente al cliente**, sin que se impaciente. | 🟡 Por validar en P7 |
| **RF-17** | **Fecha de entrega comprometida** en el pedido. Sin ella no se puede saber si un saldo es culpa de Boston. *"El decir que sí te voy a atender, pero no llego a la fecha"* | ❌ |
| **RF-18** | Manejo de **pedidos urgentes**. *"¿Y cómo se hace el tema de urgencias?" — "Yo no sé cómo… yo me estoy enterando de esto."* | ⛔ Nadie supo explicar cómo funciona hoy |

---

## 3. Pedido vs Solicitud · el cambio de modelo pendiente

Es el concepto central de la reunión y **el prototipo no lo tiene**.

> *"una cosa es la compra y otra cosa es la solicitud de compra, son dos cosas distintas"*
> *"**El pedido está en base al stock y la solicitud sobre lo que deseo.**"*

El ejemplo: el cliente quiere 500 y hay 20 → *"quiero las 20, y esas 480 es una solicitud"*.

| ID | Requisito | Estado |
|---|---|---|
| **RF-20** | Partir el requerimiento en dos documentos: **pedido** (lo que hay) y **solicitud/prepedido** (lo que falta). | ❌ |
| **RF-21** | La solicitud se aprueba o se rechaza explícitamente. *"o lo atiendo o no lo atiendo"* | ❌ |
| **RF-22** | El cliente puede originar solicitudes, incluso **sin ver el stock**. *"en el término de la solicitud ni siquiera tenga que mirar nuestros stocks el cliente"* | ❌ |
| **RF-23** | Un pedido no debe comprometer lo que no existe. *"nosotros nos comprometemos aun por lo que no tenemos"* — política que la reunión califica de errada. | 🟡 Hoy se confirma igual y se marca "saldo" |
| **RF-24** | La proyección de demanda debe alimentarse de pedidos reales, no inflados. *"¿qué pasa si el pedido te inflan y luego te devuelven la mercadería? Te engañas tú solo."* Conecta con producción: *"tiene que ver con temas de producción"* | ❌ |

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
| **RF-32** | **El beneficio se calcula sobre lo atendible, no sobre lo solicitado.** *"antes, para acceder a un beneficio, te pedían lo que no teníamos. Sabían que no había."* · *"ahora se está diciendo sobre el stock que tenemos"* · *"¿Qué es lo real que ha comprado?"* | ❌ **Defecto activo**: hoy el nivel sale del total pedido, incluido el saldo |
| **RF-33** | **Bonificaciones**, mecanismo distinto del descuento. *"tanto en formas de pago como en mecanismos de bonificación"* · *"esta es la bonificación que te toca"* | ❌ Falta definir la mecánica (¿producto gratis?) |
| **RF-34** | La **forma de pago** influye en el esquema comercial. | ❌ Se guarda `condicion` pero no afecta ningún cálculo |
| **RF-35** | Condiciones de venta reales: **E/C/L/O/D** = contra entrega, contado, letras, **obsequio**, **donación** (fuente C). | ❌ El prototipo solo contempla contado y letras |
| **RF-36** | Descuento diferenciado por **tipo de cliente** (distribuidor vs minorista). | ❌ La interfaz rotula "Distribuidor · descuento adicional" pero el cálculo no lo usa |
| **RF-37** | Autorización para descuentos manuales por encima del tope, con registro de quién autoriza. | 🟡 Pide confirmación en pantalla; no registra autorizante |
| **RF-38** | El **saldo conserva el descuento de su campaña original**. *"me tienes que respetar el descuento de esa vez"*, siempre que *"el error sea de la empresa"*. | ❌ |
| **RF-39** | **Notas de crédito** como saldo a favor. *"te respetan ese monto hasta que lo ejecutes"* | ❌ |

---

## 5. Facturación y entrega

| ID | Requisito | Estado |
|---|---|---|
| **RF-40** | Emitir factura al pedido confirmado. | 🟡 Genera correlativo, sin documento real |
| **RF-41** | **Facturación partida entre varios RUC.** *"de esas 100,000, 45,000 me las facturas a mí, 25,000 a ella"* | ❌ |
| **RF-42** | **Entrega en varios destinos.** *"y quiero que esa me la entregues en ese sitio, y en ese otro sitio"* | ❌ El cliente tiene varias direcciones, pero el pedido elige una sola |
| **RF-43** | **Guía de remisión** como documento separado de la factura. *"no es con la guía, es con la carga del almacén. Guía, factura, guía, factura."* | ❌ |
| **RF-44** | Nota de crédito al anular un pedido facturado. | ❌ |
| **RF-45** | Registrar el **saldo** (lo no atendido) y su causa: responsabilidad de Boston o falta de insumo. | 🟡 Se registra el saldo, no la causa |

---

## 6. Cliente y crédito

| ID | Requisito | Estado |
|---|---|---|
| **RF-50** | Maestro de clientes con RUC, direcciones y tipo. | ✅ |
| **RF-51** | **Línea de crédito y deuda** del cliente, para decidir si se le vende. *"el tipo de cliente que es, su crédito, el crédito que tiene, las deudas que tiene"* | ⛔ La auditoría (B) indica que **no hay crédito ni saldos en ninguna de las dos BD** |
| **RF-52** | **Muestras** en poder del cliente. *"las muestras que tiene"* | ❌ |
| **RF-53** | **Prioridad de asignación de stock** entre clientes. *"El primero que llega (…) que no es buen cliente. (…) el buen cliente no puede comprar, porque ya no hay."* | ❌ Sin criterio definido |
| **RF-54** | Bloqueo de clientes morosos. | ❌ |
| **RF-55** | Alta de clientes nuevos. | 🟡 Formulario de solicitud; no crea el cliente |

---

## 7. Avisos y trazabilidad

| ID | Requisito | Estado |
|---|---|---|
| **RF-60** | Historial de cada pedido con sus cambios de estado. | ✅ |
| **RF-61** | Estados: borrador → confirmado → facturado → entregado, más anulado. | ✅ |
| **RF-62** | **Confirmación automática al cliente** al cerrar el pedido. *"automáticamente uno se refleje acá y otro se dispara al cliente para que te lo confirme"* — hoy el cliente se entera cuando llega la mercadería. | 🟡 Solo abre WhatsApp con el texto armado |
| **RF-63** | El cliente puede aceptar o corregir el pedido antes de que se despache. | ❌ |
| **RF-64** | Reportes de ventas y almacén. *"se tiene que generar información de las ventas, del almacén, de todo"* | ❌ |

---

## 8. No funcionales

| ID | Requisito | Estado |
|---|---|---|
| **RNF-01** | El sistema debe **cruzar todo el negocio**: cliente, estado, producto, stock, venta. | ❌ Requiere integración con el ERP |
| **RNF-02** | **Seguridad**, con revisión ofensiva antes de exponerlo. *"Hagan ethical hacking a todos sus códigos (…) la misma tienda online tiene 35 mil intentos"* | ❌ Pendiente hasta que haya backend y URL pública |
| **RNF-03** | Accesible desde fuera de la oficina. *"necesitamos una URL para salir a la calle"* | ❌ |
| **RNF-04** | Robustez. *"que funcione robustamente"* | 🟡 12 tests sobre el núcleo de cálculo y estado |
| **RNF-05** | Los totales del sistema deben ser exactos y consistentes en toda la aplicación. | ✅ Un único módulo de cálculo, verificado con tests |
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

## 11. Qué hacer primero

1. **RF-32** — descuento sobre lo atendible. Es un defecto activo y se corrige en una función,
   sin decisiones de negocio pendientes.
2. **RF-20 a RF-24** — pedido vs solicitud. Es el cambio de modelo que ordena facturación,
   descuentos y proyección de demanda. Conviene decidirlo **antes** de construir el backend.
3. **RF-17** — fecha de entrega comprometida, porque habilita medir la causa del saldo (RF-45)
   y aplicar RF-38.
4. **RF-41, RF-42** — facturación partida y multi-destino, que cambian la forma del pedido.
5. Resto de descuentos (RF-33 a RF-39), cuando Comercial responda las preguntas 4, 5, 7 y 8.
6. Crédito y prioridad (RF-51, RF-53), que dependen de datos que hoy no existen en ninguna base.
