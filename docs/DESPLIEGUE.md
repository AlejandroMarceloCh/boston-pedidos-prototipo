# Publicar Boston Pedidos

El sistema es **un sitio estático**: no hay backend ni base de datos. Se compila a archivos
y se sirven. Todo el estado vive en el navegador de cada persona.

> **Qué significa eso en la práctica.** Cada quien ve sus propios pedidos, en su propia
> máquina y su propio navegador. Dos vendedores no comparten stock ni se ven entre sí. Sirve
> para que alguien lo pruebe y opine; no para tomar pedidos de verdad.

---

## 1. Compilar y empaquetar

Desde el Mac, en la raíz del proyecto:

```bash
./scripts/empaquetar.sh          # si va en la raíz del dominio
./scripts/empaquetar.sh /pedidos/ # si va en un subdirectorio
```

Antes de compilar corre el chequeo de tipos, los tests y el lint: si algo falla, no empaqueta.
Deja `boston-pedidos.tar.gz`.

**El subdirectorio importa.** Si el sitio va a quedar en `http://servidor/pedidos/` y se
compila para la raíz, la página carga **en blanco**: busca los archivos en `/assets/` en vez
de `/pedidos/assets/`. Es el error más común al publicar esto.

---

## 2. Subir

```bash
scp boston-pedidos.tar.gz usuario@servidor:/tmp/
ssh usuario@servidor
sudo mkdir -p /var/www/boston-pedidos
sudo tar -xzf /tmp/boston-pedidos.tar.gz -C /var/www/boston-pedidos
```

---

## 3. Configurar el servidor · **esto no es opcional**

La aplicación usa rutas como `/pedidos/nuevo`. Esos archivos **no existen en el disco**: los
resuelve el navegador. Sin configurar el fallback, entrar directo o **recargar la página da
404**. Está comprobado: con un servidor estático sin configurar, `/` responde 200 y
`/pedidos/nuevo` responde 404.

### Si hay nginx

```nginx
server {
    listen 80;
    server_name pedidos.boston.local;
    root /var/www/boston-pedidos;
    index index.html;

    # Cualquier ruta que no sea un archivo real la resuelve la aplicación.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Los assets llevan hash en el nombre: cachear fuerte.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # El index nunca se cachea, o el navegador sigue viendo la versión vieja.
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Si hay Apache

El paquete ya trae un `.htaccess` con el fallback y el cacheo. Solo hay que permitir que se
lea, en la configuración del sitio:

```apache
<Directory /var/www/boston-pedidos>
    AllowOverride All
    Require all granted
</Directory>
```

Y que esté activo `mod_rewrite`:

```bash
sudo a2enmod rewrite && sudo systemctl reload apache2
```

### Si no hay nginx ni Apache

Con Node instalado, sin configurar nada más:

```bash
npx serve -s /var/www/boston-pedidos -l 8080
```

El `-s` es lo que activa el fallback. Para que sobreviva a un reinicio, con `pm2`:

```bash
npm i -g pm2 serve
pm2 start "serve -s /var/www/boston-pedidos -l 8080" --name boston-pedidos
pm2 save && pm2 startup
```

---

## 4. Comprobar que quedó bien

```bash
curl -o /dev/null -w "%{http_code}\n" http://servidor/                # 200
curl -o /dev/null -w "%{http_code}\n" http://servidor/pedidos/nuevo   # 200, NO 404
```

Si la segunda da 404, el fallback no está configurado.

Y en el navegador:

1. Entrar: usuario `miguel.quispe`, contraseña `boston2026`.
2. **Recargar estando en `/pedidos`** — no debe dar 404.
3. Armar un pedido y confirmarlo; tiene que aparecer en Mis Pedidos como confirmado.
4. Recargar: el pedido sigue ahí.

---

## 5. Cosas que hay que saber antes de mostrarlo

- **Los datos son de ejemplo.** Clientes, artículos y stock son inventados a partir de la
  información del proyecto. Los pedidos de ejemplo se reproyectan sobre la fecha de hoy.
- **Los descuentos no están confirmados.** El 38% inicial y la escala por volumen vienen de
  una sesión anterior y nadie validó de dónde salieron. Si alguien va a mirar los importes,
  hay que decírselo antes.
- **Cada navegador es un mundo.** Lo que cargue una persona no lo ve otra.
- **Se reinicia desde el menú del avatar** → "Reiniciar datos demo", útil entre una
  demostración y la siguiente.
- **No hay seguridad real.** El login valida contra una credencial escrita en el código y
  cualquiera puede leer o alterar los datos desde el navegador. No poner esto en internet
  abierto: red interna solamente. En la reunión del 7 de agosto se pidió expresamente una
  revisión de seguridad antes de exponerlo, y eso está pendiente.

---

## 6. Actualizar

Repetir los pasos 1 y 2. Conviene guardar la versión anterior por si hay que volver:

```bash
sudo mv /var/www/boston-pedidos /var/www/boston-pedidos.$(date +%F)
```

El estado de cada usuario vive en su navegador, así que actualizar no borra nada de lo que
tenga cargado. Si cambia la forma de los datos, el sistema lo detecta y vuelve a los pedidos
de ejemplo por su cuenta.
