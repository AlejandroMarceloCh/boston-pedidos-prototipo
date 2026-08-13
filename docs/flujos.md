# Flujos — Boston Pedidos

Diagramas del prototipo tal como está construido hoy (agosto 2026, frontend con datos simulados).
Sirven para explicar el sistema y para validar reglas con Comercial, Finanzas y los vendedores.

Lo que aparece en **rojo** son decisiones o reglas **sin confirmar**: eso es lo que hay que validar.

---

## 1 · Navegación general

Cómo se mueve el vendedor por la aplicación.

```mermaid
flowchart LR
    Login([Login]) --> Dashboard[Resumen]

    Dashboard --> Clientes[Clientes]
    Dashboard --> Catalogo[Catálogo]
    Dashboard --> Pedidos[Mis pedidos]
    Dashboard --> Nuevo[/Nuevo pedido/]

    Clientes --> Nuevo
    Catalogo --> Nuevo
    Pedidos --> Nuevo

    Nuevo --> Wizard{{Asistente<br/>4 pasos}}
    Wizard --> Pedidos

    Catalogo -.abre modal.-> DetArt[Detalle de artículo]
    Clientes -.abre modal.-> DetCli[Detalle de cliente]
    Pedidos -.abre modal.-> DetPed[Detalle de pedido]

    classDef principal fill:#EEEDFD,stroke:#4F46E5,color:#1A1714
    classDef modal fill:#F4F1EA,stroke:#C9C1B3,color:#6B6459
    class Nuevo,Wizard principal
    class DetArt,DetCli,DetPed modal
```

**Para validar:** el vendedor entra a armar un pedido desde cuatro lugares distintos.
¿Cuál usa de verdad? Si siempre arranca desde el cliente, el asistente debería empezar
con el cliente ya elegido.

---

## 2 · El asistente de pedido (4 pasos)

Qué bloquea el avance en cada paso.

```mermaid
flowchart TD
    Start([Nuevo pedido]) --> P1

    P1[1 · Cliente<br/>elegir cliente y dirección]
    P1 --> C1{¿Hay cliente<br/>seleccionado?}
    C1 -->|No| P1
    C1 -->|Sí| P2

    P2[2 · Ítems<br/>cargar artículos]
    P2 --> C2{¿Hay al menos<br/>un ítem?}
    C2 -->|No| P2
    C2 -->|Sí| P3

    P3[3 · Descuentos<br/>revisar y ajustar]
    P3 --> C3{¿Descuento<br/>manual > 15%?}
    C3 -->|Sí| Auth[Pide autorización comercial]
    C3 -->|No| P4
    Auth --> P4

    P4[4 · Confirmar<br/>revisar totales y nota]
    P4 --> Conf{{Confirmar pedido}}
    Conf --> Fin([Pedido creado<br/>stock reservado 48h])

    P2 -.volver.-> P1
    P3 -.volver.-> P2
    P4 -.volver.-> P3

    Salir{{Salir a medio armar}} -.->|si hay cambios| Aviso[Avisa antes de perder el pedido]

    classDef paso fill:#FFFFFF,stroke:#C9C1B3,color:#1A1714
    classDef dec fill:#F4F1EA,stroke:#9A9287,color:#6B6459
    classDef ok fill:#E4F3EA,stroke:#1E7A48,color:#1A1714
    classDef warn fill:#FBF0DC,stroke:#B87400,color:#1A1714
    class P1,P2,P3,P4 paso
    class C1,C2,C3 dec
    class Fin,Conf ok
    class Auth,Aviso warn
```

**Para validar:**
- El umbral de **15%** para pedir autorización: ¿es el real?
- Hoy la autorización se confirma en pantalla, sin pedir clave ni avisar a nadie. ¿Quién autoriza y cómo se entera?
- ¿El vendedor puede guardar un borrador y seguir después? Hoy no: si sale, pierde el pedido.

---

## 3 · Cargar ítems desde el catálogo

El flujo que se rediseñó: la matriz color × talla.

```mermaid
flowchart TD
    A([Paso 2 · Ítems]) --> B[Abrir catálogo]
    B --> C[Buscar artículo<br/>por nombre, código, línea o género]
    C --> D[Elegir artículo]

    D --> E["Matriz color × talla<br/>una celda por SKU"]
    E --> F[Escribir docenas<br/>en las celdas]

    F --> G{"¿Docenas dentro del<br/>stock disponible?"}
    G -->|No| H[Se topa al máximo<br/>que hay en stock]
    H --> F
    G -->|Sí| I[Suma a totales<br/>por color y por talla]

    I --> J{¿Falta<br/>otro artículo?}
    J -->|Sí| B
    J -->|No| K[Agregar al pedido]
    K --> L([Vuelve al paso 2<br/>con las líneas cargadas])

    L -.editar.-> M[Cambiar cantidad o precio<br/>de una línea]
    L -.quitar.-> N[Eliminar línea]

    classDef paso fill:#FFFFFF,stroke:#C9C1B3,color:#1A1714
    classDef dec fill:#F4F1EA,stroke:#9A9287,color:#6B6459
    classDef ok fill:#E4F3EA,stroke:#1E7A48,color:#1A1714
    class B,C,D,E,F,I,K paso
    class G,J dec
    class L ok
```

**Para validar:**
- Se carga en **docenas**. ¿Alguna vez se piden unidades sueltas? Hoy no se puede.
- El **precio es editable por línea** en el paso 2. ¿Quién puede hacerlo y hasta dónde?
- El stock que se muestra es *disponible* = stock − reservado. ¿Es el número que el vendedor espera ver?

---

## 4 · Estados del pedido

```mermaid
stateDiagram-v2
    [*] --> Borrador: el vendedor lo arma

    Borrador --> Confirmado: confirma<br/>(reserva stock 48h)
    Borrador --> [*]: se descarta

    Confirmado --> Facturado: se emite factura
    Confirmado --> Anulado: cancela el cliente<br/>(libera stock)

    Facturado --> Entregado: recibe el cliente
    Facturado --> Anulado: anulación con factura emitida

    Entregado --> [*]
    Anulado --> [*]

    note right of Confirmado
        Puede quedar CON SALDO:
        parte del pedido sin stock,
        pendiente de reposición
    end note
```

**Para validar:**
- ¿La reserva de **48 horas** existe de verdad, y quién la libera cuando vence?
- Un pedido **con saldo**: ¿se factura lo que hay y el resto queda pendiente, o se espera completo?
- ¿Se puede anular algo ya facturado? El diagrama lo permite; hay que confirmar si es correcto.
- ¿Quién puede cambiar de estado: el vendedor, o solo administración?

---

## 5 · Cómo se calcula el total

El orden importa: cada descuento se aplica sobre una base distinta.

```mermaid
flowchart TD
    A[Subtotal<br/>suma de cantidad × precio] --> B{¿Aplica descuento<br/>inicial 38%?}

    B -->|Sí| C[− 38% del subtotal]
    B -->|No| D[Sin descuento inicial]

    C --> E[Base tras inicial]
    D --> E

    E --> F[Descuento por volumen<br/>según docenas totales]
    F --> G[− % sobre la base<br/>YA descontada]

    G --> H{¿Hay descuento<br/>manual?}
    H -->|Sí| I["− % sobre el SUBTOTAL BRUTO<br/>⚠ base distinta a las anteriores"]
    H -->|No| J[Sin descuento manual]

    I --> K{¿El acumulado<br/>supera el tope?}
    J --> K
    K -->|Sí| L[Se recorta al tope máximo]
    K -->|No| M[Base imponible]
    L --> M

    M --> N[+ IGV 18%]
    N --> O([Total a pagar])

    classDef paso fill:#FFFFFF,stroke:#C9C1B3,color:#1A1714
    classDef dec fill:#F4F1EA,stroke:#9A9287,color:#6B6459
    classDef alerta fill:#FBE9E7,stroke:#C0392B,color:#1A1714
    classDef ok fill:#E4F3EA,stroke:#1E7A48,color:#1A1714
    class A,C,D,E,F,G,J,M,N paso
    class B,H,K dec
    class I,L alerta
    class O ok
```

### Escala de descuento por volumen

| Docenas totales | Nivel | Descuento |
|---|---|---|
| 0 – 4 | 1 | 11% |
| 5 – 49 | 2 | 12% |
| 50 – 99 | 3 | 13% |
| 100 – 199 | 4 | 14% |
| 200 – 249 | 5 | 15% |
| 250 o más | 6 | 18% |

**Para validar — esto es lo más importante del documento:**

1. **La base del descuento manual.** Hoy se calcula sobre el subtotal bruto, mientras que
   el de volumen se calcula sobre el subtotal ya descontado. En un pedido de S/ 13,000
   la diferencia es de unos S/ 500. ¿Cuál es la regla real?
2. **El tope máximo acumulado.** Está puesto en 60% como valor provisional, sin fuente.
   Sin tope, 38% + 18% + 50% manual dejaba el pedido en casi cero.
3. **El descuento inicial de 38%** se aplica por defecto a todos los pedidos.
   ¿Es correcto, o depende del cliente?

---

## Qué falta

Estos flujos describen el **prototipo**, no un sistema en producción:

- No hay backend: nada se guarda. Al recargar la página se pierde todo.
- El login no valida credenciales.
- El stock es simulado; no viene del ERP.
- La confirmación de un pedido no reserva nada realmente ni notifica a nadie.

---

*Documento generado el 12 de agosto de 2026. Los diagramas usan Mermaid: se renderizan
en GitHub, VS Code (con extensión Markdown Preview Mermaid) y Notion.*
