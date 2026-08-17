# Backend — todavía no existe

Esta carpeta está vacía a propósito. El prototipo funciona **solo en el navegador**: el estado
vive en `localStorage` y no hay servidor.

`docker-compose.yml` y `.env.example`, en la raíz, están preparados para cuando se construya
—levantan Postgres y pgAdmin— pero hoy no los usa nadie.

## Por qué no está construido todavía

Deliberado: primero hay que validar los flujos con vendedores reales. Ver
`docs/P7-guion-validacion-asunciones.md`. Construir el servidor antes de esas respuestas sería
cimentar sobre supuestos — las reglas de descuento, entre otras, siguen sin confirmar.

## Lo que va a exigir cuando toque

No es "conectar una API" al frontend actual. Hay decisiones que el prototipo resuelve de forma
que no sobrevive a un servidor:

- **Reserva transaccional.** Confirmar un pedido debe crear pedido, solicitud, reserva y
  eventos en una sola transacción idempotente. Hoy son varios cambios sobre un objeto en
  memoria.
- **Correlativos del lado del servidor.** Facturas, guías y notas de crédito no pueden salir
  de escanear el historial del navegador: van en secuencias por serie y tipo.
- **Dinero en enteros.** Hoy se redondea a céntimos con `number`; para documentos tributarios
  conviene guardar céntimos como enteros o decimal exacto.
- **La máquina de estados vive en el servidor.** Hoy la valida el reducer, que corre en el
  cliente y por lo tanto es manipulable.
- **Concurrencia real.** El problema que originó el proyecto —dos vendedores comprometiendo
  la misma mercadería— solo se puede resolver del lado del servidor.
- **Auditoría.** Eventos append-only con autor, fecha del servidor y motivo. `localStorage` es
  editable por cualquiera.

También está pendiente la revisión de seguridad que se pidió expresamente en la reunión del 7
de agosto de 2026, antes de exponer nada fuera de la red interna.
