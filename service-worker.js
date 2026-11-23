/* ============================================================
   EUCAS - SERVICE WORKER

   Permite que la aplicación abra y funcione SIN INTERNET.

   Estrategia "primero la red":
   - Con internet, siempre carga la versión más reciente de
     los archivos y guarda una copia.
   - Sin internet, usa la última copia guardada.

   Así, cuando se publican cambios, el celular los recibe
   solo, sin tener que borrar nada.

   Los datos del inventario NO pasan por aquí: siguen
   guardados en el navegador (LocalStorage) del celular.
============================================================ */

const NOMBRE_CACHE = "eucas-v6";

const ARCHIVOS_BASE = [
    "./",
    "./index.html",
    "./estilos.css",
    "./app.js",
    "./manifest.webmanifest",
    "./icono-192.png",
    "./icono-512.png",
    "./icono-maskable-512.png",
    "./apple-touch-icon.png",
    "./favicon.png"
];


/* Al instalar: guardar los archivos de la aplicación */

self.addEventListener("install", evento => {

    evento.waitUntil(
        caches.open(NOMBRE_CACHE)
            .then(cache => cache.addAll(ARCHIVOS_BASE))
            .then(() => self.skipWaiting())
    );

});


/* Al activar: borrar copias de versiones anteriores */

self.addEventListener("activate", evento => {

    evento.waitUntil(
        caches.keys()
            .then(nombres =>
                Promise.all(
                    nombres
                        .filter(nombre => nombre !== NOMBRE_CACHE)
                        .map(nombre => caches.delete(nombre))
                )
            )
            .then(() => self.clients.claim())
    );

});


/* Cada vez que la página pide un archivo */

self.addEventListener("fetch", evento => {

    const solicitud = evento.request;

    // Solo archivos propios de la aplicación
    if (
        solicitud.method !== "GET" ||
        new URL(solicitud.url).origin !== self.location.origin
    ) {
        return;
    }

    evento.respondWith(

        fetch(solicitud)

            .then(respuesta => {

                // Con internet: guardar copia actualizada
                if (respuesta && respuesta.ok) {

                    const copia = respuesta.clone();

                    caches.open(NOMBRE_CACHE)
                        .then(cache => cache.put(solicitud, copia));

                }

                return respuesta;

            })

            .catch(() =>

                // Sin internet: usar la copia guardada
                // (ignoreSearch: "app.js?v=7" usa la copia de "app.js")
                caches.match(solicitud, { ignoreSearch: true })
                    .then(guardada =>
                        guardada ||
                        (
                            solicitud.mode === "navigate"
                                ? caches.match("./index.html")
                                : Response.error()
                        )
                    )

            )

    );

});
