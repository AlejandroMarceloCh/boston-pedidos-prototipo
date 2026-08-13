# Requisitos que salen de la reunión de Sala de Ventas · Inventario

**Fuente:** `Transcripciones/output/REU-SALAVENTAS-INVENTARIO_20260807.txt` (7 de agosto de 2026).
Participan dirección, ventas y sistemas. Mateo aparece citado; el usuario principal del
sistema queda definido como **Miguel y su equipo de vendedores**.

Este documento contrasta lo que se pidió en esa reunión contra lo que el prototipo hace hoy.
Las citas son textuales de la transcripción.

---

## 0. El problema, en sus palabras

La toma de pedidos es en papel: el vendedor anota en un cuaderno, y al llegar a su casa o
a la oficina lo carga al sistema; si hay apuro, le toma una foto a lo anotado y otro lo
digita. De ahí salen los errores que enumeran:

> *"yo te he pedido 18, yo te he pedido 7 y 5"* · *"yo no he pedido XS, yo he pedido L"* ·
> *"a mí me gusta el negro, no el marrón"*

Y el problema estructural:

> *"puede ser que tomes el pedido y que no sepas si hay o no hay stock. (…) al momento que
> se fije en la mañana sí hay stock, pero tus otros cuatro compañeros vendieron, ya ese stock
> ya lo vendieron. O sea, **necesitas algo que se alimente del stock actual**."*

> *"¿Qué es lo que hace el error del sistema? El stock."*

---

## 1. Lo que el prototipo ya resuelve

| Pedido en la reunión | Cita | Estado |
|---|---|---|
| El stock debe descontarse **al pedido**, no a la factura | *"hoy nuestro stock se ve afectado cuando se factura. No cuando hay un pedido. (…) ¿Debería ser así? No. Debería ser bajo el pedido."* | ✅ La reserva ocurre al confirmar |
| Ver el descuento en el momento de armar el pedido | *"en ese mismo momento debería de saber cuánto le va a tocar el descuento. Y no cuando se hace luego una preliquidación"* | ✅ Paso 3, en vivo |
| Capturar color y talla sin ambigüedad | los errores de negro/marrón, XS/L | ✅ Matriz color × talla |
| Que el pedido quede registrado formalmente y no en papel | *"en lugar de que lo registren en un papel, lo registren como un pedido o un prepedido"* | ✅ Parcial: se registra, pero falta el prepedido (§2) |

---

## 2. Lo que falta — modelo de negocio

### 2.1 Pedido ≠ Solicitud · **la brecha más grande**

Es el concepto central de la reunión y el prototipo no lo tiene.

> *"una cosa es la compra y otra cosa es la solicitud de compra, son dos cosas distintas"*
> *"**El pedido está en base al stock y la solicitud sobre lo que deseo.**"*
> *"El pedido como tal lo tienen que originar nuestros vendedores. La solicitud es la que puede originar el cliente."*

El ejemplo que dan: el cliente quiere 500 y hay 20.
> *"Ok, quiero las 20, y esas 480 es una solicitud."*

Es decir: **un mismo requerimiento se parte en dos documentos de naturaleza distinta.** Lo
que hay stock es una compra en firme; lo que no, es una solicitud que se atiende *si llega*.

**Hoy el prototipo hace lo contrario:** confirma el pedido completo y marca el faltante como
"saldo" del mismo documento. Eso es exactamente la política que ellos llaman errada:

> *"Nuestra política como empresa es atender la solicitud hasta donde podamos, y si no
> podemos, te dejo. O sea, desde ahí el error está, desde la política."*
> *"nosotros nos comprometemos aun por lo que no tenemos"*

**Consecuencia adicional:** la proyección de demanda se contamina.
> *"nuestra prognosticación de la demanda se basa en base al pedido. (…) ¿qué pasa si el
> pedido te inflan y luego te devuelven la mercadería? Te engañas tú solo."*

### 2.2 Prioridad de asignación del stock

Sin resolver en la reunión, pero planteado como problema real:

> *"El primero que llega es un cliente. Y te vende todo. Que no es buen cliente."*
> *"Yo ya me quedé bien, el otro no puede comprar, el buen cliente no puede comprar, porque ya no hay."*

Lo que piden cruzar: *"el tipo de cliente que es, su crédito, el crédito que tiene, las
muestras que tiene, las deudas que tiene"*. Hoy el prototipo asigna por orden de llegada y
no conoce el crédito del cliente.

### 2.3 Pedidos urgentes · **nadie sabe cómo funcionan hoy**

Aparece como categoría propia y la reunión **no logra responderlo**:

> — *"¿Y cómo se hace el tema de urgencias? ¿Cuándo se compromete?"*
> — *"Yo no sé cómo… yo me estoy enterando de esto."*

Y es justamente el caso donde el proceso en papel se rompe del todo:

> *"cuando son periodos urgentes lo que hacen es que toman una foto a lo que han grabado y acá
> comienzan a registrar"*

Un pedido urgente presumiblemente se salta la cola de asignación de stock y la de producción,
que es exactamente lo que §2.2 intenta ordenar. **Es una pregunta abierta que hay que llevar
a las entrevistas**, no un requisito que se pueda diseñar todavía.

### 2.4 El pedido alimenta producción

No es solo un tema de ventas. La reunión lo conecta explícitamente:

> *"queremos cambiar la lógica de la toma de pedidos. Y además, eso es importante, porque
> incluso **tiene que ver con temas de producción**."*

Lo que no hay stock dispara fabricación. Por eso la distorsión de §2.1 pega dos veces: un
pedido inflado no solo compromete stock que no existe, también mete ruido en lo que la
fábrica decide producir.

### 2.5 Muestras en poder del cliente

Se nombra junto al crédito y las deudas como algo que el sistema debe conocer del cliente:

> *"el tipo de cliente que es, su crédito, el crédito que tiene, **las muestras que tiene**,
> las deudas que tiene"*

Mercadería que está con el cliente y no es venta. No existe en el modelo y hay que preguntar
cómo se controla hoy.

### 2.6 Fecha de entrega comprometida

El saldo tiene dos causas y una de ellas es incumplimiento de fecha:

> *"¿Cuál es la responsabilidad de Boston? El decir que sí te voy a atender, pero no llego a la fecha."*

El pedido no tiene campo de fecha comprometida. Sin eso no se puede medir esa causa.

---

## 3. Lo que falta — descuentos y beneficios

### 3.1 El descuento debe calcularse sobre lo atendible, no sobre lo solicitado

**Este es un defecto activo del prototipo, no solo una funcionalidad faltante.**

> *"antes (…) a veces para acceder a un beneficio, te pedían lo que no teníamos. (…) Sabían
> que no había."*
> *"ahora, en todo lo que estamos sacando de las promociones, **se está diciendo sobre el
> stock que tenemos**."*
> *"¿Qué beneficios sobre el stock? ¿Qué es lo real que ha comprado?"*

Hoy `calcularTotales()` suma **todas** las unidades del pedido para determinar el nivel de
descuento por volumen, incluidas las que quedarán en saldo por falta de stock. Un cliente
puede inflar el pedido con SKUs agotados, subir de nivel y recibir solo lo disponible con un
descuento que no le corresponde — que es literalmente el abuso que dicen haber eliminado.

**Corrección:** el nivel de descuento debe calcularse sobre las docenas **efectivamente
atendibles**.

### 3.2 Bonificaciones

Se nombran como mecanismo aparte del descuento, y el prototipo no las tiene:

> *"estamos introduciendo varias dinámicas en las relaciones con los clientes, **tanto en
> formas de pago como en mecanismos de bonificación**"*
> *"este es el esquema que te sale. Esto es lo que pagarías, esta es la bonificación que te toca"*

En confección la bonificación suele ser producto gratis por volumen (tipo 10+1), no un
porcentaje. Hay que confirmar la mecánica exacta con Comercial.

### 3.3 La forma de pago debería influir

Se menciona junto con las bonificaciones como parte del mismo esquema. Hoy el pedido guarda
`condicion` ("Contado", "Letras a 30 días") pero **no afecta ningún cálculo**.

### 3.4 Tipo de cliente

La interfaz ya rotula "Distribuidor · compra para revender, **descuento adicional**", pero
el cálculo no lo usa: el 38% inicial se aplica igual a todos. O el rótulo miente, o falta la
regla.

### 3.5 El saldo arrastra el descuento de la campaña original

Más específico de lo que parece: no es solo congelar el precio de lista, es **respetar la
promoción vigente cuando se tomó el pedido**, aunque ya haya vencido al momento de entregar.

> *"Supongamos que tenemos un descuento para julio. (…) como lo recibiste y le dijiste, me voy
> a comprometer en algún momento a dártelo, te dice: oye, pero me tienes que respetar el
> descuento de esa vez. Y tú le dices: claro, está bien, te lo voy a respetar."*
> *"si alguien me compró en marzo y yo le entrego en mayo (…) no puedes decir que yo te debía
> y te lo vendo más caro porque estoy en mayo"* — con la condición: *"siempre y cuando el
> error sea de la empresa"*.

Implica que el saldo guarda **su propio precio y su propio descuento**, con la fecha y la
campaña que lo originaron, y que hay que distinguir de quién fue la culpa del retraso para
saber si aplica. Hoy el saldo es solo un número de unidades.

### 3.6 Nota de crédito / saldo a favor

> *"si tú compras algo y esa compra tiene una nota de crédito porque ya no adquiere el
> producto (…) te respetan ese monto hasta que lo ejecutes"*

No existe en el modelo.

---

## 4. Lo que falta — facturación y entrega

### 4.1 Un pedido puede facturarse partido entre varios RUC

> *"100,000 unidades (…) De esas 100,000, creo que 45,000 me las facturas a mí. De estas
> 25,000 me las facturas a ella."*

Hoy: un pedido = un cliente = una factura correlativa. No hay forma de partirlo.

### 4.2 Y entregarse en varios destinos

> *"Y además quiero que esa me la entregues en ese sitio, y en ese otro sitio, y en ese otro sitio."*

El cliente ya tiene varias `direccionesEntrega` en los datos, pero el pedido solo permite
elegir **una**. Debería ser una dirección **por línea o por partida**, no por pedido.

### 4.3 Guía y factura son documentos distintos

> *"el consumo del almacén es con la factura (…) no es con la guía, es con la carga del
> almacén. Guía, factura, guía, factura."*

El prototipo modela un solo documento (`factura: "F001-XXXXX"`). Falta la guía de remisión,
que es la que mueve la mercadería.

### 4.4 Anulación

Hoy anular libera stock y registra el evento, pero no emite nota de crédito ni distingue si
el pedido ya estaba facturado — caso que el drawer sí permite.

---

## 5. Otros requisitos explícitos

| Requisito | Cita | Estado |
|---|---|---|
| Confirmación automática al cliente | *"al momento que cierren la toma del pedido, automáticamente uno se refleje acá y otro se dispara al cliente para que te lo confirme"* | ❌ Hoy solo se abre WhatsApp a mano |
| Autoservicio del cliente, en móvil | *"que el mismo cliente pueda hacer su pedido, que no necesite un tercero (…) desde un celular, desde un iPad, desde una computadora"* | ❌ Y responde la duda abierta: **el móvil sí importa** |
| La solicitud del cliente puede no ver el stock | *"en el término de la solicitud ni siquiera tenga que mirar nuestros stocks el cliente (…) y cuando lo recibe el vendedor dirá: a esto sí se puede atender o no"* | ❌ Depende de §2.1 |
| El sistema debe cruzar todo el negocio | *"tiene que cruzar con todo el negocio de la empresa para que pueda ver el cliente, su estado, su producto, el stock, la venta"* | ❌ Requiere backend e integración con el ERP |
| Seguridad, pedido por dirección | *"Hagan ethical hacking a todos sus códigos (…) la misma tienda online tiene 35 mil intentos"* | ❌ Pendiente para cuando exista backend y URL pública |
| Alcance de la primera versión | *"para hacer algo rápido (…) **hoy lo que tiene que mirar es el almacén**"* | ✅ Es lo que hace el prototipo |

---

## 6. Orden sugerido

Siguiendo el propio criterio de la reunión — *"hoy lo que tiene que mirar es el almacén"*:

1. **Descuento sobre lo atendible** (§3.1). Es un defecto activo y se corrige en una función.
2. **Pedido vs Solicitud** (§2.1). Es el cambio de modelo que ordena todo lo demás; conviene
   decidirlo antes de construir backend.
3. **Fecha de entrega comprometida** (§2.6), porque define cuándo un saldo es culpa de Boston
   y si corresponde respetarle el descuento viejo (§3.5).
4. **Multi-destino y facturación partida** (§4.1, §4.2), que cambian la forma del pedido.
5. Bonificaciones, forma de pago y tipo de cliente (§3.2–§3.4), cuando Comercial confirme las reglas.
6. Crédito, muestras y prioridad de asignación (§2.2, §2.5), que dependen de datos que hoy no existen.

---

## 7. Preguntas para las entrevistas

Estas no se resuelven en el audio y bloquean decisiones de diseño:

1. ¿La solicitud (lo que no hay stock) es un documento aparte o una parte del mismo pedido?
2. ¿Quién decide si una solicitud se atiende, y con qué criterio?
3. ¿La bonificación es producto gratis o descuento? ¿Sobre qué se calcula?
4. ¿Cuánto cambia el descuento entre distribuidor y cliente final, y entre contado y letras?
5. ¿La factura partida es frecuente o excepcional? ¿Y el multi-destino?
6. ¿Cuánto tiempo se sostiene una reserva de stock antes de liberarse? (la UI hoy dice 48 h,
   sin fuente)
7. **¿Cómo se maneja hoy un pedido urgente?** En la reunión nadie supo responderlo (§2.3).
8. ¿Cómo se controlan las muestras que están en poder del cliente? (§2.5)
