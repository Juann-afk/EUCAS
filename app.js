/* ============================================================
   EUCAS - SISTEMA DE CONTROL DE INVENTARIO
   HTML + CSS + JAVASCRIPT + LOCALSTORAGE
============================================================ */


/* ============================================================
   FUNCIONES GENERALES
============================================================ */

function obtenerFechaActual() {

    const hoy = new Date();

    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day = String(hoy.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


/* ============================================================
   CONVERTIR NÚMEROS SIN PERDER DECIMALES
============================================================ */

function convertirNumero(valor, opciones = {}) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return NaN;
    }


    /*
       Un número que ya está guardado (por ejemplo 29.683 kg
       o un costo promedio de 309.375) no se vuelve a
       interpretar con el formato colombiano.
    */

    if (typeof valor === "number") {
        return valor;
    }

    let texto =
        String(valor)
            .trim()
            .replace(/\s/g, "");

    if (texto === "") {
        return NaN;
    }

    /*
       FORMATO COLOMBIANO

       2.500       -> 2500
       25.500      -> 25500
       2,5         -> 2.5
       2,75        -> 2.75
       1.250,50    -> 1250.50
       2.500,75    -> 2500.75
    */

    if (
        texto.includes(",") &&
        texto.includes(".")
    ) {

        /*
           Ejemplo:
           1.250,50
           2.500,75

           El punto es separador de miles
           y la coma es decimal.
        */

        texto =
            texto
                .replace(/\./g, "")
                .replace(",", ".");

    }

    else if (
        texto.includes(".")
    ) {

        /*
           Si solamente tiene punto:

           2.500  -> 2500
           25.500 -> 25500

           Se interpreta como separador
           de miles.
        */

        const partes =
            texto.split(".");

        /*
           En campos de valores pequeños (kg de una caneca,
           costo por gramo) el punto siempre es decimal:
           2.125 $/g -> 2.125 (antes se leía como 2125).
        */

        if (
            opciones.puntoDecimal &&
            partes.length === 2
        ) {

            // Se conserva como decimal.

        }

        else if (
            partes.length === 2 &&
            partes[1].length === 3
        ) {

            texto =
                partes[0] +
                partes[1];

        }

        /*
           Si tiene más de un punto,
           todos son separadores de miles.

           1.250.500 -> 1250500
        */

        else if (
            partes.length > 2
        ) {

            texto =
                texto.replace(/\./g, "");

        }

        /*
           Si tiene punto pero no tiene
           exactamente 3 dígitos después,
           se interpreta como decimal.

           2.5   -> 2.5
           2.75  -> 2.75
           2.125 -> 2.125
        */

    }

    else if (
        texto.includes(",")
    ) {

        /*
           La coma se mantiene como decimal.

           2,5   -> 2.5
           2,75  -> 2.75
           25,50 -> 25.50
        */

        texto =
            texto.replace(",", ".");

    }

    return Number(texto);

}


/* ============================================================
   FORMATO NUMÉRICO SIN REDONDEAR
============================================================ */

function formatoNumero(valor) {

    const numero =
        convertirNumero(valor);

    if (
        !Number.isFinite(numero)
    ) {

        return "0";

    }


    /*
       Se quitan solo los residuos de la aritmética decimal
       de JavaScript (13654.400000000001 -> 13654.4).
       Los decimales reales (hasta 6) se conservan.
    */

    return limpiarDecimales(numero).toLocaleString(
        "es-CO",
        {
            maximumFractionDigits: 20
        }
    );

}


function limpiarDecimales(numero) {

    return Math.round(numero * 1000000) / 1000000;

}


function formatoMoneda(valor) {

    const numero =
        convertirNumero(valor);

    if (
        !Number.isFinite(numero)
    ) {

        return "$0";

    }


    const limpio =
        limpiarDecimales(numero);

    // Negativos como -$5.000 (antes salía $-5.000)
    return (limpio < 0 ? "-" : "") +
        "$" +
        Math.abs(limpio).toLocaleString(
            "es-CO",
            {
                maximumFractionDigits: 20
            }
        );

}


function numeroValido(valor) {

    return Number.isFinite(
        convertirNumero(valor)
    );

}


function escaparTexto(texto) {

    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ============================================================
   ETIQUETAS DE ESTADO (solo presentación)
   Devuelve el estado como una etiqueta de color.
   Los colores están en estilos.css (.estado-...).
============================================================ */

function etiquetaEstado(texto) {

    const clases = {
        "NORMAL": "ok",
        "PAGADO": "ok",
        "STOCK BAJO": "alerta",
        "PENDIENTE": "pendiente",
        "INACTIVO": "inactivo",
        "INACTIVA": "inactivo",
        "ANULADA": "inactivo",
        "COMPRA ANULADA": "inactivo",
        "COMPONENTE INACTIVO": "inactivo"
    };

    return `<span class="estado estado-${clases[texto] || "inactivo"}">${escaparTexto(texto)}</span>`;

}


/* ============================================================
   APOYO: NOMBRES Y REGISTROS ACTIVOS
============================================================ */

/*
   Compara nombres sin importar tildes ni espacios dobles.
   "CAJA DE ENVIO" y "Caja de  envío" -> "CAJA DE ENVIO"
*/

function normalizarNombre(texto) {

    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();

}


/*
   Misma comparación que usa el resto del sistema
   (mayúsculas, sin espacios al inicio o final).
*/

function mismoNombre(a, b) {

    return String(a ?? "").trim().toUpperCase() ===
        String(b ?? "").trim().toUpperCase();

}


/*
   Un registro está activo mientras no se haya
   desactivado (activo === false). Los registros
   antiguos no tienen el campo y se consideran activos.
*/

function estaActivo(registro) {

    return Boolean(registro) &&
        registro.activo !== false;

}


/*
   Compara contra el nombre actual y los nombres que el
   registro tuvo antes (para no perder su historial
   cuando se renombra).
*/

function coincideNombre(registro, nombre) {

    if (!registro) {
        return false;
    }

    const nombres = [
        registro.nombre,
        ...(
            Array.isArray(registro.nombresAnteriores)
                ? registro.nombresAnteriores
                : []
        )
    ];

    return nombres.some(
        n => mismoNombre(n, nombre)
    );

}


function registrarNombreAnterior(registro, nombreAnterior, nombreNuevo) {

    if (mismoNombre(nombreAnterior, nombreNuevo)) {
        return;
    }

    const anteriores =
        Array.isArray(registro.nombresAnteriores)
            ? registro.nombresAnteriores
            : [];

    if (!anteriores.some(n => mismoNombre(n, nombreAnterior))) {
        anteriores.push(nombreAnterior);
    }

    registro.nombresAnteriores = anteriores;

}


/* ============================================================
   APOYO: NÚMEROS EN CAMPOS DE FORMULARIO
============================================================ */

/*
   Al editar un registro, el formulario se llena con el
   valor guardado (por ejemplo 309.375). Si el usuario no
   lo cambia, se lee tal cual; así "309.375" no termina
   convertido en 309375 al guardar.
   Cuando el usuario escribe en el campo, la marca se
   borra (ver inicialización) y se usa el formato
   colombiano normal.
*/

function asignarNumeroCampo(idCampo, valor) {

    const campo =
        document.getElementById(idCampo);

    if (!campo) {
        return;
    }

    campo.value =
        valor ?? "";

    campo.dataset.valorAsignado =
        campo.value;

}


function leerNumeroCampo(idCampo, opciones = {}) {

    const campo =
        document.getElementById(idCampo);

    if (!campo) {
        return NaN;
    }

    const texto =
        String(campo.value ?? "").trim();

    if (texto === "") {
        return NaN;
    }

    if (
        campo.dataset.valorAsignado !== undefined &&
        texto === campo.dataset.valorAsignado
    ) {
        return Number(texto);
    }

    return convertirNumero(texto, opciones);

}


/*
   ID único para cada registro. Usa la fecha y hora actual
   (así los IDs quedan en orden cronológico) y garantiza que
   dos registros creados en el mismo milisegundo no repitan ID.
*/

let ultimoIdGenerado =
    0;


function nuevoId() {

    ultimoIdGenerado =
        Math.max(Date.now(), ultimoIdGenerado + 1);

    return ultimoIdGenerado;

}


function redondear(valor, decimales = 6) {

    const factor =
        10 ** decimales;

    return Math.round(Number(valor) * factor) / factor;

}


/* ============================================================
   DISEÑO: TÍTULOS DE CADA PANTALLA
============================================================ */

const ENCABEZADOS_SECCION = {

    inicio: {
        titulo: "Inicio",
        descripcion: "Cómo va EUCAS hoy y accesos rápidos a lo que más usas."
    },

    inventario: {
        titulo: "Productos e insumos",
        descripcion: "Registra y revisa tus productos terminados y los insumos (tarros, tapas, etiquetas, cajas...)."
    },

    canecas: {
        titulo: "Canecas de miel",
        descripcion: "Cuánta miel tenía cada caneca y cuánta le queda. Las canecas compradas aparecen aquí solas."
    },

    produccion: {
        titulo: "Producción",
        descripcion: "Registra lo que envasas o fabricas. La receta de cada producto se define más abajo, una sola vez."
    },

    ventas: {
        titulo: "Ventas",
        descripcion: "Registra cada pedido, el empaque de envío y si ya te pagaron."
    },

    terceros: {
        titulo: "Terceros",
        descripcion: "Tus proveedores, distribuidores, eventos y clientes directos."
    },

    compras: {
        titulo: "Compras",
        descripcion: "Registra lo que compras: insumos o canecas de miel."
    },

    ajustes: {
        titulo: "Ajustes de inventario",
        descripcion: "Corrige las existencias por roturas, regalos, mermas, vencimientos o un conteo físico."
    },

    kardex: {
        titulo: "Kardex",
        descripcion: "Todas las entradas y salidas de un producto, insumo o caneca, con su saldo."
    },

    reportes: {
        titulo: "Reportes",
        descripcion: "Cuánto vendiste, cuánto ganaste y por qué canal, en las fechas que elijas."
    }

};


/* ============================================================
   DISEÑO: MENÚ EN EL CELULAR
============================================================ */

function alternarMenu(abrir) {

    const abierto =
        typeof abrir === "boolean"
            ? abrir
            : !document.body.classList.contains("menu-abierto");

    document.body.classList.toggle("menu-abierto", abierto);

}


/* ============================================================
   DISEÑO: MENSAJES DENTRO DE LA PÁGINA

   Reemplazan las ventanas grises del navegador
   ("127.0.0.1 dice..."). Los mensajes de éxito salen en
   oliva y se cierran solos; los de atención salen en óxido
   y duran más. Se pueden cerrar con la X.
   Las preguntas de confirmación (Aceptar / Cancelar) siguen
   siendo las del navegador.
============================================================ */

function mostrarAviso(mensaje) {

    const contenedor =
        document.getElementById("avisos");

    const texto =
        String(mensaje ?? "");

    if (!contenedor) {
        return;
    }

    const exito =
        /correctamente|anulad[ao]\.|reactivado|desactivado|importado/i.test(texto) &&
        !/^no se|^no hay/i.test(texto);

    const aviso =
        document.createElement("div");

    aviso.className =
        "aviso " + (exito ? "aviso-exito" : "aviso-atencion");

    aviso.setAttribute("role", exito ? "status" : "alert");

    aviso.innerHTML = `
        <span class="aviso-icono">${exito ? "✓" : "!"}</span>
        <div class="aviso-texto"></div>
        <button type="button" class="aviso-cerrar" aria-label="Cerrar mensaje">✕</button>
    `;

    aviso.querySelector(".aviso-texto").textContent =
        texto;

    aviso.querySelector(".aviso-cerrar").onclick = () =>
        aviso.remove();

    contenedor.appendChild(aviso);

    // Máximo 3 mensajes a la vez
    while (contenedor.children.length > 3) {
        contenedor.firstElementChild.remove();
    }

    // Más tiempo para leer los mensajes largos o de atención
    const duracion =
        exito
            ? Math.min(4000 + texto.length * 40, 12000)
            : 15000;

    setTimeout(() => aviso.remove(), duracion);

}


/* ============================================================
   DISEÑO: RESUMEN DE LA VENTA EN PESOS
   Lee los campos calculados (que siguen existiendo, ocultos)
   y los muestra con formato de moneda.
============================================================ */

function actualizarResumenVenta() {

    const resumen =
        document.getElementById("resumenVenta");

    if (!resumen) {
        return;
    }

    const leer = id => {
        const valor = document.getElementById(id).value;
        return valor === "" ? null : Number(valor);
    };

    const total = leer("totalVenta") || 0;
    const costo = leer("costoTotalVenta");
    const ganancia = leer("gananciaVenta");

    const margen =
        total > 0 && ganancia !== null
            ? ` (${formatoNumero(redondear(ganancia / total * 100, 1))}%)`
            : "";

    resumen.innerHTML = `

        <div class="resumen-fila principal">
            <span>Total a cobrar</span>
            <strong>${formatoMoneda(total)}</strong>
        </div>

        <div class="resumen-fila">
            <span>Costo (productos + empaque)</span>
            <span class="valor">${costo === null ? "—" : formatoMoneda(costo)}</span>
        </div>

        <div class="resumen-fila">
            <span>Ganancia</span>
            <span class="valor ${ganancia !== null && ganancia < 0 ? "perdida" : "ganancia"}">
                ${ganancia === null ? "—" : formatoMoneda(ganancia) + margen}
            </span>
        </div>

        ${
            costo === null && total > 0
                ? `<p class="resumen-nota">No se puede calcular el costo: revise el empaque de envío.</p>`
                : ""
        }

    `;

}


/* ============================================================
   APLICACIÓN WEB INSTALABLE

   - En Android y en computador, Chrome avisa que la página se
     puede instalar; se guarda ese aviso y se muestra el botón
     "Instalar" en Inicio.
   - En iPhone no existe ese aviso: se muestra cómo hacerlo con
     "Compartir > Agregar a inicio".
   - El service worker permite abrir la aplicación sin internet.
============================================================ */

let eventoInstalacion =
    null;


function estaInstalada() {

    return window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

}


function esIPhone() {

    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

}


function mostrarTarjetaInstalar(paraIPhone) {

    const tarjeta =
        document.getElementById("tarjetaInstalar");

    if (!tarjeta || estaInstalada()) {
        return;
    }

    const texto =
        document.getElementById("textoInstalar");

    const boton =
        document.getElementById("botonInstalar");

    if (paraIPhone) {

        texto.textContent =
            "En el iPhone: abre esta página en Safari, toca el botón Compartir " +
            "(el cuadro con la flecha hacia arriba) y elige «Agregar a inicio».";

        boton.hidden = true;

    }

    else {

        texto.textContent =
            "Queda como una aplicación, con su ícono, y funciona sin internet.";

        boton.hidden = false;

    }

    tarjeta.hidden = false;

}


function ocultarTarjetaInstalar() {

    const tarjeta =
        document.getElementById("tarjetaInstalar");

    if (tarjeta) {
        tarjeta.hidden = true;
    }

}


async function instalarAplicacion() {

    if (!eventoInstalacion) {
        return;
    }

    eventoInstalacion.prompt();

    await eventoInstalacion.userChoice;

    eventoInstalacion = null;

    ocultarTarjetaInstalar();

}


window.addEventListener("beforeinstallprompt", evento => {

    evento.preventDefault();

    eventoInstalacion = evento;

    mostrarTarjetaInstalar(false);

});


window.addEventListener("appinstalled", () => {

    eventoInstalacion = null;

    ocultarTarjetaInstalar();

    alert("EUCAS quedó instalada correctamente. Ya la encuentras con su ícono.");

});


function registrarServiceWorker() {

    // Solo funciona cuando la página se abre desde un servidor
    // (Live Server o la página publicada), no con doble clic.
    if (
        "serviceWorker" in navigator &&
        window.location.protocol.startsWith("http")
    ) {

        navigator.serviceWorker
            .register("service-worker.js")
            .catch(error => console.warn("No se pudo activar el modo sin internet:", error));

    }

}


/* ============================================================
   NAVEGACIÓN
============================================================ */

function mostrarSeccion(seccion) {

    const secciones =
        document.querySelectorAll(".seccion");


    secciones.forEach(s => {

        s.style.display = "none";

    });


    // Marca en el menú la sección abierta (estilo .activo)
    document.querySelectorAll("nav button").forEach(boton => {

        boton.classList.toggle(
            "activo",
            (boton.getAttribute("onclick") || "").includes(`'${seccion}'`)
        );

    });


    // Título grande y explicación de la pantalla
    const encabezado =
        ENCABEZADOS_SECCION[seccion];

    const titulo =
        document.getElementById("tituloSeccion");

    const descripcion =
        document.getElementById("descripcionSeccion");

    if (encabezado && titulo && descripcion) {
        titulo.textContent = encabezado.titulo;
        descripcion.textContent = encabezado.descripcion;
    }


    // En el celular, al elegir una opción se cierra el menú
    alternarMenu(false);

    if (typeof window.scrollTo === "function") {
        window.scrollTo(0, 0);
    }


    if (seccion === "inicio") {

        document.getElementById(
            "seccionInicio"
        ).style.display = "block";


        mostrarInventario();

        actualizarResumenInicio();

        mostrarEstadoRespaldo();

    }


    else if (seccion === "inventario") {

        document.getElementById(
            "seccionProductos"
        ).style.display = "block";


        document.getElementById(
            "seccionInsumos"
        ).style.display = "block";


        asegurarTablaProductosGestion();

        mostrarProductosGestion();

        mostrarInsumos();

    }


    else if (seccion === "canecas") {

        document.getElementById(
            "seccionCanecas"
        ).style.display = "block";


        mostrarCanecas();

    }


    else if (seccion === "produccion") {

        document.getElementById(
            "seccionProduccion"
        ).style.display = "block";


        document.getElementById(
            "seccionRecetas"
        ).style.display = "block";


        cargarProductosProduccion();

        mostrarRecetas();

        mostrarProduccion();

        mostrarResumenProduccion();

    }


    else if (seccion === "ventas") {

        document.getElementById(
            "seccionVentas"
        ).style.display = "block";


        cargarProductosVenta();

        cargarTercerosVenta();

        mostrarLineasVenta();

        mostrarVentas();

        calcularTotalesVenta();

    }


    else if (seccion === "terceros") {

        document.getElementById(
            "seccionTerceros"
        ).style.display = "block";


        mostrarTerceros();

    }


    else if (seccion === "compras") {

        document.getElementById(
            "seccionCompras"
        ).style.display = "block";


        cargarProveedoresCompra();

        cargarInsumosCompra();

        mostrarCompras();

    }


    else if (seccion === "ajustes") {

        document.getElementById(
            "seccionAjustes"
        ).style.display = "block";


        cargarItemsAjuste();

        mostrarAjustes();

    }


    else if (seccion === "kardex") {

        document.getElementById(
            "seccionKardex"
        ).style.display = "block";


        cargarItemsKardex();

    }


    else if (seccion === "reportes") {

        document.getElementById(
            "seccionReportes"
        ).style.display = "block";


        const desde =
            document.getElementById("desdeReporte");

        const hasta =
            document.getElementById("hastaReporte");

        if (!desde.value) desde.value = primerDiaDelMes();

        if (!hasta.value) hasta.value = obtenerFechaActual();


        mostrarReportes();

    }

}


/* ============================================================
   PRODUCTOS
============================================================ */

function obtenerProductos() {

    return JSON.parse(
        localStorage.getItem("productos")
    ) || [];

}


/* ============================================================
   ASEGURAR TABLA DE PRODUCTOS
============================================================ */

function asegurarTablaProductosGestion() {

    const seccion =
        document.getElementById(
            "seccionProductos"
        );


    if (!seccion) return;


    let contenedor =
        document.getElementById(
            "contenedorProductosGestion"
        );


    if (contenedor) return;


    contenedor =
        document.createElement("div");


    contenedor.id =
        "contenedorProductosGestion";


    contenedor.className =
        "inventario";


    contenedor.innerHTML = `

        <h2>Productos registrados</h2>

        <table>

            <thead>

                <tr>

                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Unidad</th>
                    <th>Stock actual</th>
                    <th>Stock mínimo</th>
                    <th>Acciones</th>

                </tr>

            </thead>

            <tbody id="tablaProductosGestion"></tbody>

        </table>

    `;


    seccion.appendChild(
        contenedor
    );

}


/* ============================================================
   MOSTRAR PRODUCTOS
============================================================ */

function mostrarProductosGestion() {

    asegurarTablaProductosGestion();


    const tabla =
        document.getElementById(
            "tablaProductosGestion"
        );


    if (!tabla) return;


    const productos =
        obtenerProductos();


    tabla.innerHTML = "";


    productos.forEach(producto => {

        const fila =
            document.createElement("tr");


        const stock =
            Number(
                producto.stock || 0
            );


        const stockMinimo =
            Number(
                producto.stockMinimo || 0
            );


        const activo =
            estaActivo(producto);


        fila.innerHTML = `

            <td>
                ${escaparTexto(producto.nombre)}
                ${activo ? "" : "<br>" + etiquetaEstado("INACTIVO")}
            </td>

            <td>
                ${escaparTexto(producto.tipo)}
            </td>

            <td>
                ${escaparTexto(producto.unidad)}
            </td>

            <td>
                ${formatoNumero(stock)}
            </td>

            <td>
                ${formatoNumero(stockMinimo)}
            </td>

            <td>

                <button
                    type="button"
                    onclick="editarProducto(${producto.id})"
                >
                    Editar
                </button>

                ${
                    activo
                        ? `<button
                               type="button"
                               onclick="eliminarProducto(${producto.id})"
                           >
                               Eliminar
                           </button>`
                        : `<button
                               type="button"
                               onclick="reactivarRegistro('productos', ${producto.id})"
                           >
                               Reactivar
                           </button>`
                }

            </td>

        `;


        tabla.appendChild(
            fila
        );

    });

}


/* ============================================================
   REGISTRAR / EDITAR PRODUCTO
============================================================ */

function registrarProducto() {

    const nombre =
        document.getElementById(
            "nombreProducto"
        ).value
        .trim()
        .toUpperCase();


    const tipo =
        document.getElementById(
            "tipoProducto"
        ).value;


    let unidad =
        document.getElementById(
            "unidadProducto"
        ).value;


    const stock =
        leerNumeroCampo("stockProducto");


    const stockMinimo =
        leerNumeroCampo("stockMinimo");


    const idEditando =
        document.getElementById(
            "idProductoEditando"
        ).value;


    if (nombre === "") {

        alert(
            "Ingrese el nombre del producto."
        );

        return;

    }


    if (
        !numeroValido(stock) ||
        !numeroValido(stockMinimo)
    ) {

        alert(
            "Ingrese valores numéricos válidos."
        );

        return;

    }


    if (
        stock < 0 ||
        stockMinimo < 0
    ) {

        alert(
            "Los valores no pueden ser negativos."
        );

        return;

    }


    if (
        tipo === "PRODUCTO TERMINADO"
    ) {

        unidad =
            "UNIDAD";

    }


    const productos =
        obtenerProductos();


    /* ---------------------------------------------------------
       EDITAR
    --------------------------------------------------------- */

    if (idEditando !== "") {

        const producto =
            productos.find(
                p =>
                    String(p.id) ===
                    String(idEditando)
            );


        if (!producto) {

            alert(
                "No se encontró el producto."
            );

            return;

        }


        const existeOtro =
            productos.some(
                p =>
                    String(p.id) !==
                    String(idEditando) &&
                    String(p.nombre || "")
                        .toUpperCase() === nombre
            );


        if (existeOtro) {

            alert(
                "Ya existe otro producto con ese nombre."
            );

            return;

        }


        const nombreAnterior =
            producto.nombre;


        registrarNombreAnterior(
            producto,
            nombreAnterior,
            nombre
        );


        producto.nombre =
            nombre;


        producto.tipo =
            tipo;


        producto.unidad =
            unidad;


        producto.stockMinimo =
            stockMinimo;


        localStorage.setItem(
            "productos",
            JSON.stringify(productos)
        );


        const recetas =
            obtenerRecetas();


        let recetasModificadas =
            false;


        recetas.forEach(receta => {

            if (
                String(receta.producto || "")
                    .toUpperCase() ===
                String(nombreAnterior || "")
                    .toUpperCase()
            ) {

                receta.producto =
                    nombre;

                recetasModificadas =
                    true;

            }


            if (
                receta.tipo === "PRODUCTO" &&
                String(receta.componente || "")
                    .toUpperCase() ===
                String(nombreAnterior || "")
                    .toUpperCase()
            ) {

                receta.componente =
                    nombre;

                recetasModificadas =
                    true;

            }

        });


        if (recetasModificadas) {

            localStorage.setItem(
                "recetas",
                JSON.stringify(recetas)
            );

        }


        cancelarEdicionProducto();


        alert(
            "Producto actualizado correctamente."
        );


        mostrarProductosGestion();

        mostrarInventario();

        mostrarRecetas();

        cargarProductosProduccion();

        cargarProductosVenta();

        actualizarResumenInicio();

        return;

    }


    /* ---------------------------------------------------------
       NUEVO
    --------------------------------------------------------- */

    const existente =
        productos.find(
            producto =>
                String(producto.nombre || "")
                    .toUpperCase() === nombre
        );


    if (existente) {

        alert(
            estaActivo(existente)
                ? "Este producto ya está registrado."
                : "Ya existe un producto INACTIVO con ese nombre.\n\nReactívelo desde la tabla de productos registrados."
        );

        return;

    }


    const nuevoProducto = {

        id:
            nuevoId(),

        nombre:
            nombre,

        tipo:
            tipo,

        unidad:
            unidad,

        stock:
            stock,

        stockMinimo:
            stockMinimo,

        costoUnitario:
            0

    };


    productos.push(
        nuevoProducto
    );


    localStorage.setItem(
        "productos",
        JSON.stringify(productos)
    );


    document.getElementById(
        "nombreProducto"
    ).value = "";


    document.getElementById(
        "stockProducto"
    ).value = "0";


    document.getElementById(
        "stockMinimo"
    ).value = "0";


    alert(
        "Producto registrado correctamente."
    );


    mostrarProductosGestion();

    mostrarInventario();

    actualizarResumenInicio();

}


/* ============================================================
   EDITAR PRODUCTO
============================================================ */

function editarProducto(id) {

    const productos =
        obtenerProductos();


    const producto =
        productos.find(
            p =>
                String(p.id) ===
                String(id)
        );


    if (!producto) {

        alert(
            "No se encontró el producto."
        );

        return;

    }


    document.getElementById(
        "idProductoEditando"
    ).value =
        producto.id;


    document.getElementById(
        "nombreProducto"
    ).value =
        producto.nombre;


    document.getElementById(
        "tipoProducto"
    ).value =
        producto.tipo;


    document.getElementById(
        "unidadProducto"
    ).value =
        producto.unidad;


    asignarNumeroCampo("stockProducto", producto.stock);


    document.getElementById(
        "stockProducto"
    ).disabled =
        true;


    asignarNumeroCampo("stockMinimo", producto.stockMinimo);


    document.getElementById(
        "botonProducto"
    ).textContent =
        "Guardar cambios";


    document.getElementById(
        "botonCancelarProducto"
    ).style.display =
        "inline-block";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ============================================================
   CANCELAR PRODUCTO
============================================================ */

function cancelarEdicionProducto() {

    document.getElementById(
        "idProductoEditando"
    ).value = "";


    document.getElementById(
        "nombreProducto"
    ).value = "";


    document.getElementById(
        "tipoProducto"
    ).value =
        "PRODUCTO TERMINADO";


    document.getElementById(
        "unidadProducto"
    ).value =
        "UNIDAD";


    document.getElementById(
        "stockProducto"
    ).value =
        "0";


    document.getElementById(
        "stockProducto"
    ).disabled =
        false;


    document.getElementById(
        "stockMinimo"
    ).value =
        "0";


    document.getElementById(
        "botonProducto"
    ).textContent =
        "Registrar producto";


    document.getElementById(
        "botonCancelarProducto"
    ).style.display =
        "none";

}


/* ============================================================
   INVENTARIO ACTUAL
============================================================ */

function mostrarInventario() {

    const productos =
        obtenerProductos().filter(
            estaActivo
        );


    const tabla =
        document.getElementById(
            "tablaInventario"
        );


    if (!tabla) return;


    tabla.innerHTML = "";


    productos.forEach(producto => {

        const fila =
            document.createElement("tr");


        const stock =
            Number(
                producto.stock || 0
            );


        const minimo =
            Number(
                producto.stockMinimo || 0
            );


        const estado =
            stock <= minimo
                ? "STOCK BAJO"
                : "NORMAL";


        fila.innerHTML = `

            <td>
                ${escaparTexto(producto.nombre)}
            </td>

            <td>
                ${escaparTexto(producto.tipo)}
            </td>

            <td>
                ${formatoNumero(stock)}
                ${escaparTexto(producto.unidad)}
            </td>

            <td>
                ${etiquetaEstado(estado)}
            </td>

            <td>
                —
            </td>

        `;


        tabla.appendChild(
            fila
        );

    });

}


/* ============================================================
   CANECAS
============================================================ */

function obtenerCanecas() {

    return JSON.parse(
        localStorage.getItem("canecas")
    ) || [];

}


/* ============================================================
   REGISTRAR / EDITAR CANECA
============================================================ */

function registrarCaneca() {

    const id =
        document.getElementById(
            "idCaneca"
        ).value
        .trim()
        .toUpperCase();


    const tipoMiel =
        document.getElementById(
            "tipoMielCaneca"
        ).value
        .trim()
        .toUpperCase();


    const peso =
        leerNumeroCampo("pesoCaneca", { puntoDecimal: true });


    const costoGramo =
        leerNumeroCampo("costoGramo", { puntoDecimal: true });


    const proveedor =
        document.getElementById(
            "proveedorCaneca"
        ).value
        .trim()
        .toUpperCase();


    const idEditando =
        document.getElementById(
            "idCanecaEditando"
        ).value;


    /*
       El ID solo es obligatorio al editar.
       En una caneca nueva, si se deja vacío,
       el sistema asigna el siguiente disponible.
    */

    if (
        tipoMiel === "" ||
        proveedor === "" ||
        (
            idEditando !== "" &&
            id === ""
        )
    ) {

        alert(
            "Complete todos los campos."
        );

        return;

    }


    if (
        !numeroValido(peso) ||
        !numeroValido(costoGramo) ||
        peso <= 0 ||
        costoGramo <= 0
    ) {

        alert(
            "El peso y el costo por gramo deben ser mayores que cero."
        );

        return;

    }


    const canecas =
        obtenerCanecas();


    /* ---------------------------------------------------------
       EDITAR
    --------------------------------------------------------- */

    if (idEditando !== "") {

        const caneca =
            canecas.find(
                c =>
                    String(c.id) ===
                    String(idEditando)
            );


        if (!caneca) {

            alert(
                "No se encontró la caneca."
            );

            return;

        }


        /*
           Una caneca comprada conserva el ID, el costo
           y el proveedor de su compra. Una caneca ya
           usada en producción conserva su ID para no
           perder la trazabilidad.
        */

        const vieneDeCompra =
            canecaVieneDeCompra(caneca);


        const idBloqueado =
            vieneDeCompra ||
            canecaUsadaEnProduccion(caneca);


        const idFinal =
            idBloqueado
                ? String(caneca.id)
                : id;


        const existeOtro =
            canecas.some(
                c =>
                    String(c.id).toUpperCase() ===
                        idFinal.toUpperCase() &&
                    String(c.id) !==
                    String(idEditando)
            );


        if (existeOtro) {

            alert(
                "Ya existe otra caneca con ese ID."
            );

            return;

        }


        caneca.id =
            idFinal;


        caneca.tipoMiel =
            tipoMiel;


        if (!vieneDeCompra) {

            caneca.costoGramo =
                costoGramo;


            caneca.proveedor =
                proveedor;

        }


        localStorage.setItem(
            "canecas",
            JSON.stringify(canecas)
        );


        cancelarEdicionCaneca();


        alert(
            "Caneca actualizada correctamente."
        );


        mostrarCanecas();

        actualizarResumenInicio();

        return;

    }


    /* ---------------------------------------------------------
       NUEVA CANECA (EXISTENCIA INICIAL)

       Este formulario queda para las canecas que ya
       existían antes de usar el sistema. Las canecas
       compradas se registran desde COMPRAS, que las
       agrega automáticamente a este apartado.
    --------------------------------------------------------- */

    const idNuevo =
        id === ""
            ? generarSiguienteIdCaneca()
            : id;


    const existe =
        canecas.some(
            caneca =>
                String(caneca.id)
                    .toUpperCase() === idNuevo
        );


    if (existe) {

        alert(
            `Ya existe una caneca con el ID ${idNuevo}.\n\n` +
            `Cada caneca debe tener un ID diferente (puede haber varias del mismo tipo de miel).\n\n` +
            `Siguiente ID disponible: ${generarSiguienteIdCaneca()}`
        );

        return;

    }


    const confirmar =
        confirm(
            "Este formulario registra canecas que ya tenía antes de usar el sistema (EXISTENCIA INICIAL).\n\n" +
            "Si la caneca fue comprada, regístrela en COMPRAS: así queda en el historial de compras y aparece aquí automáticamente, sin duplicarla.\n\n" +
            `¿Registrar la caneca ${idNuevo} como existencia inicial?`
        );


    if (!confirmar) {

        return;

    }


    const nuevaCaneca = {

        id:
            idNuevo,

        tipoMiel:
            tipoMiel,

        pesoInicial:
            peso,

        pesoDisponible:
            peso,

        costoGramo:
            costoGramo,

        proveedor:
            proveedor,

        origen:
            "INICIAL"

    };


    canecas.push(
        nuevaCaneca
    );


    localStorage.setItem(
        "canecas",
        JSON.stringify(canecas)
    );


    document.getElementById(
        "idCaneca"
    ).value = "";


    document.getElementById(
        "tipoMielCaneca"
    ).value = "";


    document.getElementById(
        "pesoCaneca"
    ).value = "";


    document.getElementById(
        "costoGramo"
    ).value = "";


    document.getElementById(
        "proveedorCaneca"
    ).value = "";


    alert(
        `Caneca ${idNuevo} registrada correctamente.`
    );


    mostrarCanecas();

    actualizarResumenInicio();

}


/* ============================================================
   APOYO CANECAS: ID, ORIGEN Y USO
============================================================ */

/*
   Genera el siguiente ID consecutivo: C001, C002, C003...
*/

function generarSiguienteIdCaneca() {

    const canecas =
        obtenerCanecas();


    let maximo =
        0;


    canecas.forEach(caneca => {

        const coincidencia =
            String(caneca.id || "")
                .trim()
                .toUpperCase()
                .match(/^C(\d+)$/);


        if (coincidencia) {

            maximo =
                Math.max(
                    maximo,
                    Number(coincidencia[1])
                );

        }

    });


    let siguiente =
        maximo + 1;


    let idSugerido =
        "";


    do {

        idSugerido =
            "C" +
            String(siguiente).padStart(3, "0");

        siguiente++;

    } while (
        canecas.some(
            c =>
                String(c.id).toUpperCase() ===
                idSugerido
        )
    );


    return idSugerido;

}


/*
   Muestra en los campos de ID cuál será el
   siguiente ID si se dejan vacíos.
*/

function actualizarSugerenciaIdCaneca() {

    const sugerido =
        generarSiguienteIdCaneca();


    [
        "idCaneca",
        "idCanecaCompra"
    ].forEach(idCampo => {

        const campo =
            document.getElementById(idCampo);


        if (campo) {

            campo.placeholder =
                `${sugerido} (automático)`;

        }

    });

}


function canecaVieneDeCompra(caneca) {

    if (caneca.origen === "COMPRA") {

        return true;

    }


    if (caneca.origen === "INICIAL") {

        return false;

    }


    /*
       Canecas registradas antes de este cambio:
       se buscan en el historial de compras.
    */

    const id =
        String(caneca.id || "")
            .toUpperCase();


    return obtenerCompras().some(
        compra =>
            compra.tipo === "CANECA" &&
            (
                String(compra.canecaId || "")
                    .toUpperCase() === id ||
                String(compra.producto || "")
                    .toUpperCase()
                    .startsWith(id + " - ")
            )
    );

}


function canecaUsadaEnProduccion(caneca) {

    const id =
        String(caneca.id || "")
            .toUpperCase();


    const enHistorial =
        obtenerProducciones().some(
            produccion =>
                Array.isArray(produccion.canecasUsadas) &&
                produccion.canecasUsadas.some(
                    usada =>
                        String(usada.id || "")
                            .toUpperCase() === id
                )
        );


    /*
       Producciones anteriores no guardaban el detalle
       de canecas: si ya se consumió miel, se usó.
    */

    const yaConsumida =
        Number(caneca.pesoDisponible || 0) <
        Number(caneca.pesoInicial || 0);


    return enHistorial ||
        yaConsumida;

}


/* ============================================================
   EDITAR CANECA
============================================================ */

function editarCaneca(id) {

    const canecas =
        obtenerCanecas();


    const caneca =
        canecas.find(
            c =>
                String(c.id) ===
                String(id)
        );


    if (!caneca) {

        alert(
            "No se encontró la caneca."
        );

        return;

    }


    document.getElementById(
        "idCanecaEditando"
    ).value =
        caneca.id;


    document.getElementById(
        "idCaneca"
    ).value =
        caneca.id;


    document.getElementById(
        "tipoMielCaneca"
    ).value =
        caneca.tipoMiel;


    asignarNumeroCampo("pesoCaneca", caneca.pesoInicial);


    asignarNumeroCampo("costoGramo", caneca.costoGramo);


    document.getElementById(
        "proveedorCaneca"
    ).value =
        caneca.proveedor;


    document.getElementById(
        "pesoCaneca"
    ).disabled =
        true;


    /*
       Campos que no se pueden cambiar:
       - Caneca comprada: ID, costo y proveedor
         pertenecen a la compra registrada.
       - Caneca usada en producción: el ID se
         conserva por trazabilidad.
    */

    const vieneDeCompra =
        canecaVieneDeCompra(caneca);


    document.getElementById(
        "idCaneca"
    ).disabled =
        vieneDeCompra ||
        canecaUsadaEnProduccion(caneca);


    document.getElementById(
        "costoGramo"
    ).disabled =
        vieneDeCompra;


    document.getElementById(
        "proveedorCaneca"
    ).disabled =
        vieneDeCompra;


    document.getElementById(
        "botonCaneca"
    ).textContent =
        "Guardar cambios";


    document.getElementById(
        "botonCancelarCaneca"
    ).style.display =
        "inline-block";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ============================================================
   CANCELAR CANECA
============================================================ */

function cancelarEdicionCaneca() {

    document.getElementById(
        "idCanecaEditando"
    ).value = "";


    document.getElementById(
        "idCaneca"
    ).value = "";


    document.getElementById(
        "tipoMielCaneca"
    ).value = "";


    document.getElementById(
        "pesoCaneca"
    ).value = "";


    document.getElementById(
        "pesoCaneca"
    ).disabled =
        false;


    document.getElementById(
        "idCaneca"
    ).disabled =
        false;


    document.getElementById(
        "costoGramo"
    ).disabled =
        false;


    document.getElementById(
        "proveedorCaneca"
    ).disabled =
        false;


    document.getElementById(
        "costoGramo"
    ).value = "";


    document.getElementById(
        "proveedorCaneca"
    ).value = "";


    document.getElementById(
        "botonCaneca"
    ).textContent =
        "Registrar caneca";


    document.getElementById(
        "botonCancelarCaneca"
    ).style.display =
        "none";

}


/* ============================================================
   MOSTRAR CANECAS
============================================================ */

function mostrarCanecas() {

    const canecas =
        obtenerCanecas();


    const tabla =
        document.getElementById(
            "tablaCanecas"
        );


    if (!tabla) return;


    tabla.innerHTML = "";


    canecas.forEach(caneca => {

        const pesoInicial =
            convertirNumero(
                caneca.pesoInicial
            );


        const pesoDisponible =
            convertirNumero(
                caneca.pesoDisponible
            );


        const fila =
            document.createElement("tr");


        const activa =
            estaActivo(caneca);


        // Caneca cuya compra fue anulada: no se reactiva ni se elimina
        const anulada =
            caneca.anulada === true;


        const origen =
            canecaVieneDeCompra(caneca)
                ? "COMPRA"
                : "EXISTENCIA INICIAL";


        fila.innerHTML = `

            <td>
                ${escaparTexto(caneca.id)}
                ${
                    anulada
                        ? "<br>" + etiquetaEstado("COMPRA ANULADA")
                        : activa
                            ? ""
                            : "<br>" + etiquetaEstado("INACTIVA")
                }
            </td>

            <td>
                ${escaparTexto(caneca.tipoMiel)}
            </td>

            <td>
                ${
                    Number.isFinite(pesoInicial)
                        ? formatoNumero(pesoInicial)
                        : "0"
                } kg
            </td>

            <td>
                ${
                    Number.isFinite(pesoDisponible)
                        ? formatoNumero(pesoDisponible)
                        : "0"
                } kg
            </td>

            <td>
                $${formatoNumero(caneca.costoGramo)}
            </td>

            <td>
                ${escaparTexto(caneca.proveedor)}
                <br><small>Origen: ${origen}</small>
            </td>

            <td>

                <button
                    type="button"
                    onclick="editarCaneca('${escaparTexto(caneca.id)}')"
                >
                    Editar
                </button>

                ${
                    anulada
                        ? ""
                        : activa
                        ? `<button
                               type="button"
                               onclick="eliminarCaneca('${escaparTexto(caneca.id)}')"
                           >
                               Eliminar
                           </button>`
                        : `<button
                               type="button"
                               onclick="reactivarRegistro('canecas', '${escaparTexto(caneca.id)}')"
                           >
                               Reactivar
                           </button>`
                }

            </td>

        `;


        tabla.appendChild(
            fila
        );

    });


    actualizarSugerenciaIdCaneca();

}


/* ============================================================
   INSUMOS
============================================================ */

function obtenerInsumos() {

    return JSON.parse(
        localStorage.getItem("insumos")
    ) || [];

}


/* ============================================================
   REGISTRAR / EDITAR INSUMO
============================================================ */

function registrarInsumo() {

    const nombre =
        document.getElementById(
            "nombreInsumo"
        ).value
        .trim()
        .toUpperCase();


    const unidad =
        document.getElementById(
            "unidadInsumo"
        ).value;


    const stock =
        leerNumeroCampo("stockInsumo");


    const costo =
        leerNumeroCampo("costoInsumo");


    const stockMinimo =
        leerNumeroCampo("stockMinimoInsumo");


    const idEditando =
        document.getElementById(
            "idInsumoEditando"
        ).value;


    if (nombre === "") {

        alert(
            "Ingrese el nombre del insumo."
        );

        return;

    }


    if (
        !numeroValido(stock) ||
        !numeroValido(costo) ||
        !numeroValido(stockMinimo)
    ) {

        alert(
            "Ingrese valores numéricos válidos."
        );

        return;

    }


    if (stock < 0) {

        alert(
            "El stock no puede ser negativo."
        );

        return;

    }


    if (stockMinimo < 0) {

        alert(
            "El stock mínimo no puede ser negativo."
        );

        return;

    }


    if (costo <= 0) {

        alert(
            "El costo promedio debe ser mayor que cero."
        );

        return;

    }


    const insumos =
        obtenerInsumos();


    /* ---------------------------------------------------------
       EDITAR
    --------------------------------------------------------- */

    if (idEditando !== "") {

        const insumo =
            insumos.find(
                i =>
                    String(i.id) ===
                    String(idEditando)
            );


        if (!insumo) {

            alert(
                "No se encontró el insumo."
            );

            return;

        }


        const existeOtro =
            insumos.some(
                i =>
                    String(i.id) !==
                    String(idEditando) &&
                    String(i.nombre || "")
                        .toUpperCase() === nombre
            );


        if (existeOtro) {

            alert(
                "Ya existe otro insumo con ese nombre."
            );

            return;

        }


        const nombreAnterior =
            insumo.nombre;


        registrarNombreAnterior(
            insumo,
            nombreAnterior,
            nombre
        );


        insumo.nombre =
            nombre;


        insumo.unidad =
            unidad;


        insumo.costoPromedio =
            costo;


        insumo.stockMinimo =
            stockMinimo;


        localStorage.setItem(
            "insumos",
            JSON.stringify(insumos)
        );


        /*
           Si cambió el nombre, las recetas que usaban
           el nombre anterior se actualizan.
        */

        if (!mismoNombre(nombreAnterior, nombre)) {

            const recetas =
                obtenerRecetas();

            let recetasModificadas =
                false;

            recetas.forEach(receta => {

                if (
                    receta.tipo === "INSUMO" &&
                    mismoNombre(receta.componente, nombreAnterior)
                ) {

                    receta.componente =
                        nombre;

                    recetasModificadas =
                        true;

                }

            });

            if (recetasModificadas) {

                localStorage.setItem(
                    "recetas",
                    JSON.stringify(recetas)
                );

            }

        }


        cancelarEdicionInsumo();


        alert(
            "Insumo actualizado correctamente."
        );


        mostrarInsumos();

        cargarInsumosCompra();

        mostrarRecetas();

        calcularTotalesVenta();

        actualizarResumenInicio();

        return;

    }


    /* ---------------------------------------------------------
       NUEVO
    --------------------------------------------------------- */

    const existente =
        insumos.find(
            insumo =>
                String(insumo.nombre || "")
                    .toUpperCase() === nombre
        );


    if (
        existente &&
        !estaActivo(existente)
    ) {

        alert(
            `El insumo ${existente.nombre} está INACTIVO.\n\n` +
            "Reactívelo desde la tabla de insumos antes de agregarle stock."
        );

        return;

    }


    if (existente) {

        /*
           Si el insumo existente no tenía stock mínimo
           (registros anteriores), se toma el ingresado.
        */

        if (
            existente.stockMinimo === undefined
        ) {

            existente.stockMinimo =
                stockMinimo;

        }


        const stockAnterior =
            Number(
                existente.stock || 0
            );


        const costoAnterior =
            Number(
                existente.costoPromedio || 0
            );


        const nuevoStock =
            stockAnterior +
            stock;


        if (nuevoStock > 0) {

            existente.costoPromedio =
                (
                    (
                        stockAnterior *
                        costoAnterior
                    ) +
                    (
                        stock *
                        costo
                    )
                ) /
                nuevoStock;

        }


        existente.stock =
            nuevoStock;


        alert(
            "El insumo ya existía. Se actualizó su stock."
        );

    }

    else {

        const nuevoInsumo = {

            id:
                nuevoId(),

            nombre:
                nombre,

            unidad:
                unidad,

            stock:
                stock,

            stockMinimo:
                stockMinimo,

            costoPromedio:
                costo

        };


        insumos.push(
            nuevoInsumo
        );


        alert(
            "Insumo registrado correctamente."
        );

    }


    localStorage.setItem(
        "insumos",
        JSON.stringify(insumos)
    );


    document.getElementById(
        "nombreInsumo"
    ).value = "";


    document.getElementById(
        "stockInsumo"
    ).value = "0";


    document.getElementById(
        "costoInsumo"
    ).value = "0";


    document.getElementById(
        "stockMinimoInsumo"
    ).value = "0";


    mostrarInsumos();

    cargarInsumosCompra();

    mostrarRecetas();

    actualizarResumenInicio();

}


/* ============================================================
   EDITAR INSUMO
============================================================ */

function editarInsumo(id) {

    const insumos =
        obtenerInsumos();


    const insumo =
        insumos.find(
            i =>
                String(i.id) ===
                String(id)
        );


    if (!insumo) {

        alert(
            "No se encontró el insumo."
        );

        return;

    }


    document.getElementById(
        "idInsumoEditando"
    ).value =
        insumo.id;


    document.getElementById(
        "nombreInsumo"
    ).value =
        insumo.nombre;


    document.getElementById(
        "unidadInsumo"
    ).value =
        insumo.unidad;


    asignarNumeroCampo("stockInsumo", insumo.stock);


    document.getElementById(
        "stockInsumo"
    ).disabled =
        true;


    asignarNumeroCampo("costoInsumo", insumo.costoPromedio);


    asignarNumeroCampo("stockMinimoInsumo", insumo.stockMinimo ?? 0);


    document.getElementById(
        "botonInsumo"
    ).textContent =
        "Guardar cambios";


    document.getElementById(
        "botonCancelarInsumo"
    ).style.display =
        "inline-block";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ============================================================
   CANCELAR INSUMO
============================================================ */

function cancelarEdicionInsumo() {

    document.getElementById(
        "idInsumoEditando"
    ).value = "";


    document.getElementById(
        "nombreInsumo"
    ).value = "";


    document.getElementById(
        "unidadInsumo"
    ).value =
        "UNIDAD";


    document.getElementById(
        "stockInsumo"
    ).value =
        "0";


    document.getElementById(
        "stockInsumo"
    ).disabled =
        false;


    document.getElementById(
        "costoInsumo"
    ).value =
        "0";


    document.getElementById(
        "stockMinimoInsumo"
    ).value =
        "0";


    document.getElementById(
        "botonInsumo"
    ).textContent =
        "Registrar insumo";


    document.getElementById(
        "botonCancelarInsumo"
    ).style.display =
        "none";

}


/* ============================================================
   MOSTRAR INSUMOS
============================================================ */

function mostrarInsumos() {

    const insumos =
        obtenerInsumos();


    const tabla =
        document.getElementById(
            "tablaInsumos"
        );


    if (!tabla) return;


    tabla.innerHTML = "";


    insumos.forEach(insumo => {

        const fila =
            document.createElement("tr");


        const stock =
            Number(
                insumo.stock || 0
            );


        const costo =
            Number(
                insumo.costoPromedio || 0
            );


        const stockMinimo =
            Number(
                insumo.stockMinimo || 0
            );


        const activo =
            estaActivo(insumo);


        const estado =
            !activo
                ? "INACTIVO"
                : stock <= stockMinimo
                    ? "STOCK BAJO"
                    : "NORMAL";


        fila.innerHTML = `

            <td>
                ${escaparTexto(insumo.nombre)}
            </td>

            <td>
                ${escaparTexto(insumo.unidad)}
            </td>

            <td>
                ${formatoNumero(stock)}
            </td>

            <td>
                ${formatoNumero(stockMinimo)}
            </td>

            <td>
                ${formatoMoneda(costo)}
            </td>

            <td>
                ${formatoMoneda(
                    stock * costo
                )}
            </td>

            <td>
                ${etiquetaEstado(estado)}
            </td>

            <td>

                <button
                    type="button"
                    onclick="editarInsumo(${insumo.id})"
                >
                    Editar
                </button>

                ${
                    activo
                        ? `<button
                               type="button"
                               onclick="eliminarInsumo(${insumo.id})"
                           >
                               Eliminar
                           </button>`
                        : `<button
                               type="button"
                               onclick="reactivarRegistro('insumos', ${insumo.id})"
                           >
                               Reactivar
                           </button>`
                }

            </td>

        `;


        tabla.appendChild(
            fila
        );

    });

}


/* ============================================================
   RECETAS
============================================================ */

function obtenerRecetas() {

    return JSON.parse(
        localStorage.getItem("recetas")
    ) || [];

}


/* ============================================================
   VALIDAR COMPONENTE
============================================================ */

function componenteExisteEnInventario(
    tipo,
    componente
) {

    const nombre =
        componente
            .trim()
            .toUpperCase();


    if (tipo === "INSUMO") {

        return obtenerInsumos().some(
            insumo =>
                estaActivo(insumo) &&
                String(insumo.nombre || "")
                    .toUpperCase() === nombre
        );

    }


    if (tipo === "MIEL") {

        return obtenerCanecas().some(
            caneca =>
                estaActivo(caneca) &&
                String(caneca.tipoMiel || "")
                    .toUpperCase() === nombre
        );

    }


    if (tipo === "PRODUCTO") {

        return obtenerProductos().some(
            producto =>
                estaActivo(producto) &&
                String(producto.nombre || "")
                    .toUpperCase() === nombre &&
                producto.tipo ===
                    "PRODUCTO TERMINADO"
        );

    }


    return false;

}


/* ============================================================
   EVITAR REFERENCIAS NO PERMITIDAS
============================================================ */

function productoPuedeUsarProducto(
    productoPadre,
    productoComponente,
    idEditando = ""
) {

    const padre =
        productoPadre
            .trim()
            .toUpperCase();


    const componente =
        productoComponente
            .trim()
            .toUpperCase();


    if (
        padre === componente
    ) {

        return false;

    }


    const recetas =
        obtenerRecetas();


    const recetaDelComponente =
        recetas.filter(
            receta =>
                estaActivo(receta) &&
                String(receta.producto || "")
                    .toUpperCase() === componente &&
                String(receta.id) !==
                    String(idEditando)
        );


    const usaProducto =
        recetaDelComponente.some(
            receta =>
                receta.tipo ===
                "PRODUCTO"
        );


    if (usaProducto) {

        return false;

    }


    return true;

}


/* ============================================================
   REGISTRAR / EDITAR RECETA
============================================================ */

function registrarReceta() {

    const producto =
        document.getElementById(
            "productoReceta"
        ).value
        .trim()
        .toUpperCase();


    const tipo =
        document.getElementById(
            "tipoComponente"
        ).value;


    const componente =
        document.getElementById(
            "componenteReceta"
        ).value
        .trim()
        .toUpperCase();


    const cantidad =
        leerNumeroCampo("cantidadReceta");


    const idEditando =
        document.getElementById(
            "idRecetaEditando"
        ).value;


    if (producto === "") {

        alert(
            "Ingrese el producto terminado."
        );

        return;

    }


    if (componente === "") {

        alert(
            "Ingrese el insumo, tipo de miel o producto terminado."
        );

        return;

    }


    if (
        !numeroValido(cantidad) ||
        cantidad <= 0
    ) {

        alert(
            "La cantidad debe ser mayor que 0."
        );

        return;

    }


    const productos =
        obtenerProductos();


    const productoExiste =
        productos.some(
            p =>
                estaActivo(p) &&
                String(p.nombre || "")
                    .toUpperCase() === producto &&
                p.tipo ===
                    "PRODUCTO TERMINADO"
        );


    if (!productoExiste) {

        alert(
            "El producto terminado no existe en el inventario."
        );

        return;

    }


    if (
        tipo !== "INSUMO" &&
        tipo !== "MIEL" &&
        tipo !== "PRODUCTO"
    ) {

        alert(
            "Tipo de componente no válido."
        );

        return;

    }


    if (
        !componenteExisteEnInventario(
            tipo,
            componente
        )
    ) {

        alert(
            "El componente seleccionado no existe en el inventario."
        );

        return;

    }


    if (
        tipo === "PRODUCTO" &&
        !productoPuedeUsarProducto(
            producto,
            componente,
            idEditando
        )
    ) {

        alert(
            "No se puede utilizar este producto terminado como componente porque generaría una referencia no permitida."
        );

        return;

    }


    const recetas =
        obtenerRecetas();


    if (idEditando !== "") {

        const indice =
            recetas.findIndex(
                receta =>
                    String(receta.id) ===
                    String(idEditando)
            );


        if (indice === -1) {

            alert(
                "No se encontró la receta para editar."
            );

            return;

        }


        const duplicado =
            recetas.some(
                receta =>
                    estaActivo(receta) &&
                    String(receta.id) !==
                        String(idEditando) &&
                    String(receta.producto || "")
                        .toUpperCase() === producto &&
                    receta.tipo === tipo &&
                    String(receta.componente || "")
                        .toUpperCase() === componente
            );


        if (duplicado) {

            alert(
                "Este componente ya existe en la receta."
            );

            return;

        }


        recetas[indice].producto =
            producto;


        recetas[indice].tipo =
            tipo;


        recetas[indice].componente =
            componente;


        recetas[indice].cantidad =
            cantidad;


        localStorage.setItem(
            "recetas",
            JSON.stringify(recetas)
        );


        alert(
            "Receta actualizada correctamente."
        );


        cancelarEdicionReceta();

        mostrarRecetas();

        mostrarResumenProduccion();

        return;

    }


    const duplicado =
        recetas.some(
            receta =>
                estaActivo(receta) &&
                String(receta.producto || "")
                    .toUpperCase() === producto &&
                receta.tipo === tipo &&
                String(receta.componente || "")
                    .toUpperCase() === componente
        );


    if (duplicado) {

        alert(
            "Este componente ya está registrado para este producto."
        );

        return;

    }


    const nuevaReceta = {

        id:
            nuevoId(),

        producto:
            producto,

        tipo:
            tipo,

        componente:
            componente,

        cantidad:
            cantidad

    };


    recetas.push(
        nuevaReceta
    );


    localStorage.setItem(
        "recetas",
        JSON.stringify(recetas)
    );


    document.getElementById(
        "componenteReceta"
    ).value = "";


    document.getElementById(
        "cantidadReceta"
    ).value = "";


    alert(
        "Componente agregado correctamente."
    );


    mostrarRecetas();

}


/* ============================================================
   MOSTRAR RECETAS
============================================================ */

function mostrarRecetas() {

    const recetas =
        obtenerRecetas();


    const tabla =
        document.getElementById(
            "tablaRecetas"
        );


    if (!tabla) return;


    tabla.innerHTML = "";


    recetas.forEach(receta => {

        const fila =
            document.createElement("tr");


        const activa =
            estaActivo(receta);


        fila.innerHTML = `

            <td>
                ${escaparTexto(receta.producto)}
                ${activa ? "" : "<br>" + etiquetaEstado("COMPONENTE INACTIVO")}
            </td>

            <td>
                ${escaparTexto(
                    receta.tipo === "PRODUCTO"
                        ? "PRODUCTO TERMINADO"
                        : receta.tipo
                )}
            </td>

            <td>
                ${escaparTexto(receta.componente)}
            </td>

            <td>
                ${formatoNumero(
                    receta.cantidad || 0
                )}
            </td>

            <td>

                <button
                    type="button"
                    onclick="editarReceta(${receta.id})"
                >
                    Editar
                </button>

                ${
                    activa
                        ? `<button
                               type="button"
                               onclick="eliminarReceta(${receta.id})"
                           >
                               Eliminar
                           </button>`
                        : `<button
                               type="button"
                               onclick="reactivarReceta(${receta.id})"
                           >
                               Reactivar
                           </button>`
                }

            </td>

        `;


        tabla.appendChild(
            fila
        );

    });

}


/* ============================================================
   EDITAR RECETA
============================================================ */

function editarReceta(id) {

    const recetas =
        obtenerRecetas();


    const receta =
        recetas.find(
            r =>
                String(r.id) ===
                String(id)
        );


    if (!receta) {

        alert(
            "No se encontró la receta."
        );

        return;

    }


    document.getElementById(
        "productoReceta"
    ).value =
        receta.producto;


    document.getElementById(
        "tipoComponente"
    ).value =
        receta.tipo;


    document.getElementById(
        "componenteReceta"
    ).value =
        receta.componente;


    asignarNumeroCampo("cantidadReceta", receta.cantidad);


    document.getElementById(
        "idRecetaEditando"
    ).value =
        receta.id;


    document.getElementById(
        "botonReceta"
    ).textContent =
        "Guardar cambios";


    document.getElementById(
        "botonCancelarReceta"
    ).style.display =
        "inline-block";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ============================================================
   CANCELAR RECETA
============================================================ */

function cancelarEdicionReceta() {

    document.getElementById(
        "idRecetaEditando"
    ).value = "";


    document.getElementById(
        "productoReceta"
    ).value = "";


    document.getElementById(
        "tipoComponente"
    ).value =
        "MIEL";


    document.getElementById(
        "componenteReceta"
    ).value = "";


    document.getElementById(
        "cantidadReceta"
    ).value = "";


    document.getElementById(
        "botonReceta"
    ).textContent =
        "Agregar componente";


    document.getElementById(
        "botonCancelarReceta"
    ).style.display =
        "none";

}


/* ============================================================
   TERCEROS
============================================================ */

function obtenerTerceros() {

    return JSON.parse(
        localStorage.getItem("terceros")
    ) || [];

}


/* ============================================================
   REGISTRAR / EDITAR TERCERO
============================================================ */

function registrarTercero() {

    const nombre =
        document.getElementById(
            "nombreTercero"
        ).value
        .trim()
        .toUpperCase();


    const telefono =
        document.getElementById(
            "telefonoTercero"
        ).value
        .trim();


    const contacto =
        document.getElementById(
            "contactoTercero"
        ).value
        .trim()
        .toUpperCase();


    const tipo =
        document.getElementById(
            "tipoTercero"
        ).value;


    const idEditando =
        document.getElementById(
            "idTerceroEditando"
        ).value;


    if (
        nombre === "" ||
        telefono === "" ||
        contacto === ""
    ) {

        alert(
            "Complete todos los campos."
        );

        return;

    }


    const terceros =
        obtenerTerceros();


    if (idEditando !== "") {

        const tercero =
            terceros.find(
                t =>
                    String(t.id) ===
                    String(idEditando)
            );


        if (!tercero) {

            alert(
                "No se encontró el tercero."
            );

            return;

        }


        const existeOtro =
            terceros.some(
                t =>
                    String(t.id) !==
                        String(idEditando) &&
                    String(t.nombre || "")
                        .toUpperCase() === nombre
            );


        if (existeOtro) {

            alert(
                "Ya existe otro tercero con ese nombre."
            );

            return;

        }


        tercero.nombre =
            nombre;


        tercero.telefono =
            telefono;


        tercero.contacto =
            contacto;


        tercero.tipo =
            tipo;


        localStorage.setItem(
            "terceros",
            JSON.stringify(terceros)
        );


        cancelarEdicionTercero();


        alert(
            "Tercero actualizado correctamente."
        );


        mostrarTerceros();

        cargarProveedoresCompra();

        cargarTercerosVenta();

        return;

    }


    const existe =
        terceros.some(
            tercero =>
                String(tercero.nombre || "")
                    .toUpperCase() === nombre
        );


    if (existe) {

        alert(
            "Este tercero ya está registrado."
        );

        return;

    }


    const nuevoTercero = {

        id:
            nuevoId(),

        nombre:
            nombre,

        telefono:
            telefono,

        contacto:
            contacto,

        tipo:
            tipo

    };


    terceros.push(
        nuevoTercero
    );


    localStorage.setItem(
        "terceros",
        JSON.stringify(terceros)
    );


    document.getElementById(
        "nombreTercero"
    ).value = "";


    document.getElementById(
        "telefonoTercero"
    ).value = "";


    document.getElementById(
        "contactoTercero"
    ).value = "";


    alert(
        "Tercero registrado correctamente."
    );


    mostrarTerceros();

    cargarProveedoresCompra();

    cargarTercerosVenta();

}


/* ============================================================
   EDITAR TERCERO
============================================================ */

function editarTercero(id) {

    const terceros =
        obtenerTerceros();


    const tercero =
        terceros.find(
            t =>
                String(t.id) ===
                String(id)
        );


    if (!tercero) {

        alert(
            "No se encontró el tercero."
        );

        return;

    }


    document.getElementById(
        "idTerceroEditando"
    ).value =
        tercero.id;


    document.getElementById(
        "nombreTercero"
    ).value =
        tercero.nombre;


    document.getElementById(
        "telefonoTercero"
    ).value =
        tercero.telefono;


    document.getElementById(
        "contactoTercero"
    ).value =
        tercero.contacto;


    document.getElementById(
        "tipoTercero"
    ).value =
        tercero.tipo;


    document.getElementById(
        "botonTercero"
    ).textContent =
        "Guardar cambios";


    document.getElementById(
        "botonCancelarTercero"
    ).style.display =
        "inline-block";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ============================================================
   CANCELAR TERCERO
============================================================ */

function cancelarEdicionTercero() {

    document.getElementById(
        "idTerceroEditando"
    ).value = "";


    document.getElementById(
        "nombreTercero"
    ).value = "";


    document.getElementById(
        "telefonoTercero"
    ).value = "";


    document.getElementById(
        "contactoTercero"
    ).value = "";


    document.getElementById(
        "tipoTercero"
    ).value =
        "PROVEEDOR";


    document.getElementById(
        "botonTercero"
    ).textContent =
        "Registrar tercero";


    document.getElementById(
        "botonCancelarTercero"
    ).style.display =
        "none";

}


/* ============================================================
   MOSTRAR TERCEROS
============================================================ */

function mostrarTerceros() {

    const terceros =
        obtenerTerceros();


    const tabla =
        document.getElementById(
            "tablaTerceros"
        );


    if (!tabla) return;


    tabla.innerHTML = "";


    terceros.forEach(tercero => {

        const fila =
            document.createElement("tr");


        fila.innerHTML = `

            <td>
                ${escaparTexto(
                    tercero.nombre
                )}
            </td>

            <td>
                ${escaparTexto(
                    tercero.telefono
                )}
            </td>

            <td>
                ${escaparTexto(
                    tercero.contacto
                )}
            </td>

            <td>
                ${escaparTexto(
                    tercero.tipo
                )}
            </td>

            <td>

                <button
                    type="button"
                    onclick="editarTercero(${tercero.id})"
                >
                    Editar
                </button>

            </td>

        `;


        tabla.appendChild(
            fila
        );

    });

}


/* ============================================================
   COMPRAS
============================================================ */

function obtenerCompras() {

    return JSON.parse(
        localStorage.getItem("compras")
    ) || [];

}


/* ============================================================
   CARGAR PROVEEDORES
============================================================ */

function cargarProveedoresCompra() {

    const select =
        document.getElementById(
            "proveedorCompra"
        );


    if (!select) return;


    const terceros =
        obtenerTerceros();


    const proveedores =
        terceros.filter(
            tercero =>
                tercero.tipo ===
                "PROVEEDOR"
        );


    select.innerHTML = `

        <option value="">
            Seleccione un proveedor
        </option>

    `;


    proveedores.forEach(proveedor => {

        const option =
            document.createElement("option");


        option.value =
            proveedor.nombre;


        option.textContent =
            proveedor.nombre;


        select.appendChild(
            option
        );

    });

}


/* ============================================================
   CARGAR INSUMOS
============================================================ */

function cargarInsumosCompra() {

    const select =
        document.getElementById(
            "insumoCompra"
        );


    if (!select) return;


    const insumos =
        obtenerInsumos().filter(
            estaActivo
        );


    select.innerHTML = `

        <option value="">
            Seleccione un insumo
        </option>

    `;


    insumos.forEach(insumo => {

        const option =
            document.createElement("option");


        option.value =
            insumo.nombre;


        option.textContent =
            `${insumo.nombre} (${insumo.unidad})`;


        select.appendChild(
            option
        );

    });

}


/* ============================================================
   CAMBIAR TIPO COMPRA
============================================================ */

function cambiarTipoCompra() {

    const tipo =
        document.getElementById(
            "tipoCompra"
        ).value;


    const formularioInsumo =
        document.getElementById(
            "formCompraInsumo"
        );


    const formularioCaneca =
        document.getElementById(
            "formCompraCaneca"
        );


    if (tipo === "INSUMO") {

        formularioInsumo.style.display =
            "";


        formularioCaneca.style.display =
            "none";


        calcularTotalCompra();

    }

    else {

        formularioInsumo.style.display =
            "none";


        formularioCaneca.style.display =
            "";


        calcularTotalCompraCaneca();

    }

}


/* ============================================================
   TOTAL COMPRA INSUMO
============================================================ */

function calcularTotalCompra() {

    const cantidad =
        convertirNumero(
            document.getElementById(
                "cantidadCompra"
            ).value
        );


    const costo =
        convertirNumero(
            document.getElementById(
                "costoUnitarioCompra"
            ).value
        );


    const total =
        (
            Number.isFinite(cantidad)
                ? cantidad
                : 0
        ) *
        (
            Number.isFinite(costo)
                ? costo
                : 0
        );


    document.getElementById(
        "totalCompra"
    ).value =
        total;

}


/* ============================================================
   TOTAL COMPRA CANECA
============================================================ */

function calcularTotalCompraCaneca() {

    const peso =
        leerNumeroCampo("pesoCanecaCompra", { puntoDecimal: true });


    const costoGramo =
        leerNumeroCampo("costoGramoCompra", { puntoDecimal: true });


    const pesoReal =
        Number.isFinite(peso)
            ? peso
            : 0;


    const costoReal =
        Number.isFinite(costoGramo)
            ? costoGramo
            : 0;


    const total =
        pesoReal *
        1000 *
        costoReal;


    document.getElementById(
        "totalCompra"
    ).value =
        total;

}


/* ============================================================
   REGISTRAR COMPRA
============================================================ */

function registrarCompra() {

    const fecha =
        document.getElementById(
            "fechaCompra"
        ).value;


    const proveedor =
        document.getElementById(
            "proveedorCompra"
        ).value;


    const tipo =
        document.getElementById(
            "tipoCompra"
        ).value;


    if (!fecha) {

        alert(
            "Seleccione la fecha."
        );

        return;

    }


    if (!proveedor) {

        alert(
            "Seleccione un proveedor."
        );

        return;

    }


    if (
        tipo === "INSUMO"
    ) {

        registrarCompraInsumo(
            fecha,
            proveedor
        );

    }

    else {

        registrarCompraCaneca(
            fecha,
            proveedor
        );

    }

}


/* ============================================================
   COMPRA INSUMO
============================================================ */

function registrarCompraInsumo(
    fecha,
    proveedor
) {

    const insumoNombre =
        document.getElementById(
            "insumoCompra"
        ).value;


    const cantidad =
        convertirNumero(
            document.getElementById(
                "cantidadCompra"
            ).value
        );


    const costoUnitario =
        convertirNumero(
            document.getElementById(
                "costoUnitarioCompra"
            ).value
        );


    if (!insumoNombre) {

        alert(
            "Seleccione un insumo."
        );

        return;

    }


    if (
        !numeroValido(cantidad) ||
        !numeroValido(costoUnitario) ||
        cantidad <= 0 ||
        costoUnitario <= 0
    ) {

        alert(
            "La cantidad y el costo unitario deben ser mayores que cero."
        );

        return;

    }


    const total =
        cantidad *
        costoUnitario;


    const insumos =
        obtenerInsumos();


    const insumo =
        insumos.find(
            item =>
                String(item.nombre || "")
                    .toUpperCase() ===
                String(insumoNombre || "")
                    .toUpperCase()
        );


    if (!insumo) {

        alert(
            "No se encontró el insumo."
        );

        return;

    }


    if (!estaActivo(insumo)) {

        alert(
            `El insumo ${insumo.nombre} está INACTIVO.\n\n` +
            "Reactívelo en Inventario > Insumos para registrar compras."
        );

        return;

    }


    const stockAnterior =
        Number(
            insumo.stock || 0
        );


    const costoAnterior =
        Number(
            insumo.costoPromedio || 0
        );


    const nuevoStock =
        stockAnterior +
        cantidad;


    if (nuevoStock > 0) {

        insumo.costoPromedio =
            (
                (
                    stockAnterior *
                    costoAnterior
                ) +
                (
                    cantidad *
                    costoUnitario
                )
            ) /
            nuevoStock;

    }


    insumo.stock =
        nuevoStock;


    localStorage.setItem(
        "insumos",
        JSON.stringify(insumos)
    );


    guardarCompra({

        id:
            nuevoId(),

        fecha:
            fecha,

        proveedor:
            proveedor,

        tipo:
            "INSUMO",

        producto:
            insumoNombre,

        insumoId:
            insumo.id,

        cantidad:
            cantidad,

        costoUnitario:
            costoUnitario,

        total:
            total

    });


    alert(
        "Compra de insumo registrada correctamente."
    );


    limpiarFormularioCompra();

    mostrarInsumos();

    cargarInsumosCompra();

    mostrarCompras();

    actualizarResumenInicio();

}


/* ============================================================
   COMPRA CANECA
============================================================ */

function registrarCompraCaneca(
    fecha,
    proveedor
) {

    const idIngresado =
        document.getElementById(
            "idCanecaCompra"
        ).value
        .trim()
        .toUpperCase();


    const tipoMiel =
        document.getElementById(
            "tipoMielCompra"
        ).value
        .trim()
        .toUpperCase();


    const peso =
        leerNumeroCampo("pesoCanecaCompra", { puntoDecimal: true });


    const costoGramo =
        leerNumeroCampo("costoGramoCompra", { puntoDecimal: true });


    if (
        tipoMiel === ""
    ) {

        alert(
            "Complete los datos de la caneca."
        );

        return;

    }


    if (
        !numeroValido(peso) ||
        !numeroValido(costoGramo) ||
        peso <= 0 ||
        costoGramo <= 0
    ) {

        alert(
            "El peso y el costo por gramo deben ser mayores que cero."
        );

        return;

    }


    const canecas =
        obtenerCanecas();


    /*
       Si no se escribe un ID, se asigna el siguiente
       consecutivo. Cada compra crea UNA sola caneca
       en el apartado CANECAS.
    */

    const idCaneca =
        idIngresado === ""
            ? generarSiguienteIdCaneca()
            : idIngresado;


    const existe =
        canecas.some(
            caneca =>
                String(caneca.id)
                    .toUpperCase() ===
                idCaneca
        );


    if (existe) {

        alert(
            `Ya existe una caneca con el ID ${idCaneca} en CANECAS.\n\n` +
            `Cada caneca debe tener un ID diferente (puede haber varias del mismo tipo de miel).\n\n` +
            `Siguiente ID disponible: ${generarSiguienteIdCaneca()}\n` +
            `Si deja el campo vacío, el ID se asigna automáticamente.`
        );

        return;

    }


    const idCompra =
        nuevoId();


    const nuevaCaneca = {

        id:
            idCaneca,

        tipoMiel:
            tipoMiel,

        pesoInicial:
            peso,

        pesoDisponible:
            peso,

        costoGramo:
            costoGramo,

        proveedor:
            proveedor,

        origen:
            "COMPRA",

        compraId:
            idCompra,

        fechaCompra:
            fecha

    };


    canecas.push(
        nuevaCaneca
    );


    localStorage.setItem(
        "canecas",
        JSON.stringify(canecas)
    );


    const total =
        peso *
        1000 *
        costoGramo;


    guardarCompra({

        id:
            idCompra,

        fecha:
            fecha,

        proveedor:
            proveedor,

        tipo:
            "CANECA",

        producto:
            `${idCaneca} - ${tipoMiel}`,

        canecaId:
            idCaneca,

        cantidad:
            peso,

        costoUnitario:
            costoGramo,

        total:
            total

    });


    alert(
        "Compra de caneca registrada correctamente.\n\n" +
        `La caneca ${idCaneca} quedó registrada en CANECAS con ${formatoNumero(peso)} kg disponibles.`
    );


    limpiarFormularioCompra();

    mostrarCanecas();

    mostrarCompras();

    actualizarResumenInicio();

}


/* ============================================================
   GUARDAR COMPRA
============================================================ */

function guardarCompra(compra) {

    const compras =
        obtenerCompras();


    compras.push(
        compra
    );


    localStorage.setItem(
        "compras",
        JSON.stringify(compras)
    );

}


/* ============================================================
   LIMPIAR COMPRA
============================================================ */

function limpiarFormularioCompra() {

    document.getElementById(
        "insumoCompra"
    ).value = "";


    document.getElementById(
        "cantidadCompra"
    ).value = "";


    document.getElementById(
        "costoUnitarioCompra"
    ).value = "";


    document.getElementById(
        "idCanecaCompra"
    ).value = "";


    document.getElementById(
        "tipoMielCompra"
    ).value = "";


    document.getElementById(
        "pesoCanecaCompra"
    ).value = "";


    document.getElementById(
        "costoGramoCompra"
    ).value = "";


    document.getElementById(
        "totalCompra"
    ).value = "";

}


/* ============================================================
   MOSTRAR COMPRAS
============================================================ */

function mostrarCompras() {

    const compras =
        obtenerCompras();


    const tabla =
        document.getElementById(
            "tablaCompras"
        );


    if (!tabla) return;


    tabla.innerHTML = "";


    let totalCompras = 0;

    let totalInsumos = 0;

    let totalCanecas = 0;


    compras.forEach(compra => {

        const total =
            Number(
                compra.total || 0
            );


        const anulada =
            compra.anulada === true;


        // Las compras anuladas no suman en los totales
        if (!anulada) {

            totalCompras +=
                total;

            if (
                compra.tipo ===
                "INSUMO"
            ) {

                totalInsumos +=
                    total;

            }

            else {

                totalCanecas +=
                    total;

            }

        }


        const fila =
            document.createElement("tr");


        fila.innerHTML = `

            <td>
                ${escaparTexto(
                    compra.fecha
                )}
            </td>

            <td>
                ${escaparTexto(
                    compra.proveedor
                )}
            </td>

            <td>
                ${escaparTexto(
                    compra.tipo
                )}
            </td>

            <td>
                ${escaparTexto(
                    compra.producto
                )}
            </td>

            <td>
                ${formatoNumero(
                    compra.cantidad || 0
                )}
            </td>

            <td>
                ${formatoMoneda(
                    compra.costoUnitario
                )}
            </td>

            <td>
                ${formatoMoneda(
                    total
                )}
            </td>

            <td>
                ${
                    anulada
                        ? `${etiquetaEstado("ANULADA")}<br><small>${escaparTexto(compra.motivoAnulacion || "")}</small>`
                        : `<button type="button" onclick="anularCompra(${compra.id})">Anular</button>`
                }
            </td>

        `;


        tabla.appendChild(
            fila
        );

    });


    document.getElementById(
        "totalComprasRegistradas"
    ).textContent =
        formatoMoneda(
            totalCompras
        );


    document.getElementById(
        "totalComprasInsumos"
    ).textContent =
        formatoMoneda(
            totalInsumos
        );


    document.getElementById(
        "totalComprasCanecas"
    ).textContent =
        formatoMoneda(
            totalCanecas
        );

}


/* ============================================================
   PRODUCCIÓN
============================================================ */

function obtenerProducciones() {

    return JSON.parse(
        localStorage.getItem(
            "producciones"
        )
    ) || [];

}


/* ============================================================
   CARGAR PRODUCTOS PRODUCCIÓN
============================================================ */

function cargarProductosProduccion() {

    const select =
        document.getElementById(
            "productoProduccion"
        );


    if (!select) return;


    const productos =
        obtenerProductos().filter(
            producto =>
                estaActivo(producto) &&
                producto.tipo ===
                "PRODUCTO TERMINADO"
        );


    select.innerHTML = `

        <option value="">
            Seleccione un producto
        </option>

    `;


    productos.forEach(producto => {

        const option =
            document.createElement("option");


        option.value =
            producto.nombre;


        option.textContent =
            producto.nombre;


        select.appendChild(
            option
        );

    });

}


/* ============================================================
   OBTENER RECETA
============================================================ */

function obtenerRecetaProducto(
    nombreProducto
) {

    const nombre =
        String(nombreProducto || "")
            .trim()
            .toUpperCase();


    const recetas =
        obtenerRecetas();


    return recetas.filter(
        receta =>
            estaActivo(receta) &&
            String(receta.producto || "")
                .trim()
                .toUpperCase() ===
            nombre
    );

}


/* ============================================================
   OBTENER COSTO COMPONENTE
============================================================ */

function obtenerCostoComponente(
    tipo,
    componente
) {

    const nombre =
        String(componente || "")
            .trim()
            .toUpperCase();


    if (
        tipo === "INSUMO"
    ) {

        const insumo =
            obtenerInsumos().find(
                i =>
                    String(i.nombre || "")
                        .toUpperCase() === nombre
            );


        return insumo
            ? Number(
                insumo.costoPromedio || 0
            )
            : 0;

    }


    if (
        tipo === "MIEL"
    ) {

        const canecas =
            obtenerCanecas().filter(
                c =>
                    estaActivo(c) &&
                    String(c.tipoMiel || "")
                        .toUpperCase() === nombre &&
                    Number(
                        c.pesoDisponible || 0
                    ) > 0
            );


        if (
            canecas.length === 0
        ) {

            return 0;

        }


        let gramosTotales =
            0;


        let valorTotal =
            0;


        canecas.forEach(caneca => {

            const gramos =
                Number(
                    caneca.pesoDisponible || 0
                ) *
                1000;


            const costo =
                Number(
                    caneca.costoGramo || 0
                );


            gramosTotales +=
                gramos;


            valorTotal +=
                gramos *
                costo;

        });


        if (
            gramosTotales <= 0
        ) {

            return 0;

        }


        return valorTotal /
            gramosTotales;

    }


    if (
        tipo === "PRODUCTO"
    ) {

        const producto =
            obtenerProductos().find(
                p =>
                    String(p.nombre || "")
                        .toUpperCase() === nombre &&
                    p.tipo ===
                        "PRODUCTO TERMINADO"
            );


        return producto
            ? Number(
                producto.costoUnitario || 0
            )
            : 0;

    }


    return 0;

}


/* ============================================================
   RESUMEN PRODUCCIÓN
============================================================ */

function mostrarResumenProduccion() {

    const producto =
        document.getElementById(
            "productoProduccion"
        ).value;


    const cantidad =
        convertirNumero(
            document.getElementById(
                "cantidadProduccion"
            ).value
        );


    const resumen =
        document.getElementById(
            "resumenProduccion"
        );


    const detalle =
        document.getElementById(
            "detalleProduccion"
        );


    const costo =
        document.getElementById(
            "costoProduccion"
        );


    if (
        !producto ||
        !Number.isFinite(cantidad) ||
        cantidad <= 0
    ) {

        resumen.style.display =
            "none";

        return;

    }


    const receta =
        obtenerRecetaProducto(
            producto
        );


    if (
        receta.length === 0
    ) {

        resumen.style.display =
            "block";


        detalle.innerHTML =
            "<p>Este producto no tiene una receta registrada.</p>";


        costo.textContent =
            formatoMoneda(0);


        return;

    }


    let costoTotal =
        0;


    let html =
        "<ul>";


    receta.forEach(item => {

        const cantidadNecesaria =
            Number(item.cantidad) *
            cantidad;


        const costoUnitario =
            obtenerCostoComponente(
                item.tipo,
                item.componente
            );


        const costoComponente =
            cantidadNecesaria *
            costoUnitario;


        costoTotal +=
            costoComponente;


        const unidad =
            item.tipo === "MIEL"
                ? " g"
                : " unidad(es)";


        html += `

            <li>

                ${escaparTexto(
                    item.tipo === "PRODUCTO"
                        ? "PRODUCTO TERMINADO"
                        : item.tipo
                )}:

                ${escaparTexto(
                    item.componente
                )}

                —

                Cantidad:

                ${formatoNumero(
                    cantidadNecesaria
                )}

                ${unidad}

                —

                Costo:

                ${formatoMoneda(
                    costoComponente
                )}

            </li>

        `;

    });


    html +=
        "</ul>";


    detalle.innerHTML =
        html;


    costo.textContent =
        formatoMoneda(
            costoTotal
        );


    resumen.style.display =
        "block";

}


/* ============================================================
   REQUERIMIENTOS PRODUCCIÓN
============================================================ */

function obtenerRequerimientosProduccion(
    recetas,
    cantidad
) {

    const requerimientos = {};


    recetas.forEach(receta => {

        const clave =
            `${receta.tipo}||${String(
                receta.componente || ""
            ).toUpperCase()}`;


        const necesario =
            Number(receta.cantidad) *
            cantidad;


        if (
            !requerimientos[clave]
        ) {

            requerimientos[clave] = {

                tipo:
                    receta.tipo,

                componente:
                    String(
                        receta.componente || ""
                    ).toUpperCase(),

                cantidad:
                    0

            };

        }


        requerimientos[clave].cantidad +=
            necesario;

    });


    return Object.values(
        requerimientos
    );

}


/* ============================================================
   VALIDAR DISPONIBILIDAD PRODUCCIÓN
============================================================ */

function validarDisponibilidadProduccion(
    requerimientos,
    insumos,
    canecas,
    productos
) {

    for (
        const requerimiento
        of requerimientos
    ) {

        const necesario =
            Number(
                requerimiento.cantidad
            );


        if (
            requerimiento.tipo ===
            "INSUMO"
        ) {

            const insumo =
                insumos.find(
                    i =>
                        String(i.nombre || "")
                            .toUpperCase() ===
                        requerimiento.componente
                );


            if (!insumo) {

                return {

                    valido:
                        false,

                    mensaje:
                        `No existe el insumo: ${requerimiento.componente}`

                };

            }


            if (!estaActivo(insumo)) {

                return {

                    valido:
                        false,

                    mensaje:
                        `El insumo ${requerimiento.componente} está INACTIVO.\n\n` +
                        "Reactívelo o reemplácelo en la receta."

                };

            }


            const stock =
                Number(
                    insumo.stock || 0
                );


            if (
                stock < necesario
            ) {

                return {

                    valido:
                        false,

                    mensaje:
                        `No hay suficiente stock de ${requerimiento.componente}.\n\n` +
                        `Stock disponible: ${formatoNumero(stock)}\n` +
                        `Cantidad necesaria: ${formatoNumero(necesario)}`

                };

            }

        }


        else if (
            requerimiento.tipo ===
            "MIEL"
        ) {

            const gramosDisponibles =
                canecas
                    .filter(
                        c =>
                            estaActivo(c) &&
                            String(c.tipoMiel || "")
                                .toUpperCase() ===
                            requerimiento.componente
                    )
                    .reduce(
                        (
                            total,
                            c
                        ) =>
                            total +
                            (
                                Number(
                                    c.pesoDisponible || 0
                                ) *
                                1000
                            ),
                        0
                    );


            if (
                gramosDisponibles <
                necesario
            ) {

                return {

                    valido:
                        false,

                    mensaje:
                        `No hay suficiente ${requerimiento.componente} en las canecas.\n\n` +
                        `Disponible: ${formatoNumero(gramosDisponibles)} g\n` +
                        `Necesario: ${formatoNumero(necesario)} g`

                };

            }

        }


        else if (
            requerimiento.tipo ===
            "PRODUCTO"
        ) {

            const producto =
                productos.find(
                    p =>
                        String(p.nombre || "")
                            .toUpperCase() ===
                        requerimiento.componente &&
                        p.tipo ===
                            "PRODUCTO TERMINADO"
                );


            if (!producto) {

                return {

                    valido:
                        false,

                    mensaje:
                        `No existe el producto terminado: ${requerimiento.componente}`

                };

            }


            if (!estaActivo(producto)) {

                return {

                    valido:
                        false,

                    mensaje:
                        `El producto ${requerimiento.componente} está INACTIVO.\n\n` +
                        "Reactívelo o reemplácelo en la receta."

                };

            }


            const stock =
                Number(
                    producto.stock || 0
                );


            if (
                stock < necesario
            ) {

                return {

                    valido:
                        false,

                    mensaje:
                        `No hay suficiente stock de ${requerimiento.componente} para formar el producto.\n\n` +
                        `Stock disponible: ${formatoNumero(stock)}\n` +
                        `Cantidad necesaria: ${formatoNumero(necesario)}`

                };

            }


            const costo =
                Number(
                    producto.costoUnitario || 0
                );


            if (
                costo <= 0
            ) {

                return {

                    valido:
                        false,

                    mensaje:
                        `El producto ${requerimiento.componente} no tiene un costo unitario válido.`

                };

            }

        }

    }


    return {

        valido:
            true,

        mensaje:
            ""

    };

}


/* ============================================================
   CONSUMIR PRODUCTO TERMINADO
============================================================ */

function consumirProductoTerminado(
    productos,
    nombre,
    cantidad
) {

    const producto =
        productos.find(
            p =>
                String(p.nombre || "")
                    .toUpperCase() ===
                String(nombre || "")
                    .toUpperCase() &&
                p.tipo ===
                    "PRODUCTO TERMINADO"
        );


    if (!producto) {

        return 0;

    }


    const costo =
        Number(
            producto.costoUnitario || 0
        );


    producto.stock =
        Number(
            producto.stock || 0
        ) -
        cantidad;


    return cantidad *
        costo;

}


/* ============================================================
   REGISTRAR PRODUCCIÓN
============================================================ */

function registrarProduccion() {

    const fecha =
        document.getElementById(
            "fechaProduccion"
        ).value;


    const nombreProducto =
        document.getElementById(
            "productoProduccion"
        ).value;


    const cantidad =
        convertirNumero(
            document.getElementById(
                "cantidadProduccion"
            ).value
        );


    if (!fecha) {

        alert(
            "Seleccione la fecha."
        );

        return;

    }


    if (!nombreProducto) {

        alert(
            "Seleccione el producto."
        );

        return;

    }


    if (
        !numeroValido(cantidad) ||
        cantidad <= 0 ||
        !Number.isInteger(cantidad)
    ) {

        alert(
            "La cantidad a producir debe ser un número entero mayor que 0."
        );

        return;

    }


    /* ---------------------------------------------------------
       LOTE Y VENCIMIENTO
       Si el lote se deja vacío se asigna uno automático:
       L + fecha + consecutivo (ej: L20261110-01).
    --------------------------------------------------------- */

    const loteIngresado =
        document.getElementById("loteProduccion").value
            .trim()
            .toUpperCase();

    const fechaVencimiento =
        document.getElementById("vencimientoProduccion").value;

    if (
        fechaVencimiento &&
        fechaVencimiento <= fecha
    ) {

        alert(
            "La fecha de vencimiento debe ser posterior a la fecha de producción."
        );

        return;

    }

    const lote =
        loteIngresado === ""
            ? generarLote(fecha)
            : loteIngresado;

    if (
        obtenerProducciones().some(
            p => mismoNombre(p.lote, lote)
        )
    ) {

        alert(
            `El lote ${lote} ya existe.\n\n` +
            "Use otro o deje el campo vacío para asignarlo automáticamente."
        );

        return;

    }


    const recetas =
        obtenerRecetaProducto(
            nombreProducto
        );


    if (
        recetas.length === 0
    ) {

        alert(
            "Este producto no tiene una receta registrada."
        );

        return;

    }


    const productos =
        obtenerProductos();


    const producto =
        productos.find(
            p =>
                String(p.nombre || "")
                    .toUpperCase() ===
                String(nombreProducto || "")
                    .toUpperCase() &&
                p.tipo ===
                    "PRODUCTO TERMINADO"
        );


    if (!producto) {

        alert(
            "No se encontró el producto."
        );

        return;

    }


    const insumos =
        obtenerInsumos();


    const canecas =
        obtenerCanecas();


    const requerimientos =
        obtenerRequerimientosProduccion(
            recetas,
            cantidad
        );


    const validacion =
        validarDisponibilidadProduccion(
            requerimientos,
            insumos,
            canecas,
            productos
        );


    if (!validacion.valido) {

        alert(
            validacion.mensaje
        );

        return;

    }


    const stockAnterior =
        Number(
            producto.stock || 0
        );


    const costoAnterior =
        Number(
            producto.costoUnitario || 0
        );


    let costoTotalProduccion =
        0;


    /*
       Trazabilidad: qué se consumió en esta producción
       y de qué caneca salió cada gramo de miel.
    */

    const componentesUsados =
        [];


    const canecasUsadas =
        [];


    for (
        const requerimiento
        of requerimientos
    ) {

        const necesario =
            Number(
                requerimiento.cantidad
            );


        if (
            requerimiento.tipo ===
            "INSUMO"
        ) {

            const insumo =
                insumos.find(
                    i =>
                        String(i.nombre || "")
                            .toUpperCase() ===
                        requerimiento.componente
                );


            const costo =
                Number(
                    insumo.costoPromedio || 0
                );


            costoTotalProduccion +=
                necesario *
                costo;


            insumo.stock =
                Number(
                    insumo.stock || 0
                ) -
                necesario;


            componentesUsados.push({

                tipo:
                    "INSUMO",

                componente:
                    requerimiento.componente,

                insumoId:
                    insumo.id,

                cantidad:
                    necesario,

                costoTotal:
                    necesario *
                    costo

            });

        }


        else if (
            requerimiento.tipo ===
            "MIEL"
        ) {

            let gramosPendientes =
                necesario;


            let costoMiel =
                0;


            const canecasTipo =
                canecas.filter(
                    c =>
                        estaActivo(c) &&
                        String(c.tipoMiel || "")
                            .toUpperCase() ===
                        requerimiento.componente &&
                        Number(
                            c.pesoDisponible || 0
                        ) > 0
                );


            for (
                const caneca
                of canecasTipo
            ) {

                if (
                    gramosPendientes <= 0
                ) {

                    break;

                }


                const disponibleGramos =
                    Number(
                        caneca.pesoDisponible || 0
                    ) *
                    1000;


                const usar =
                    Math.min(
                        disponibleGramos,
                        gramosPendientes
                    );


                const costo =
                    Number(
                        caneca.costoGramo || 0
                    );


                costoTotalProduccion +=
                    usar *
                    costo;


                costoMiel +=
                    usar *
                    costo;


                caneca.pesoDisponible =
                    (
                        disponibleGramos -
                        usar
                    ) /
                    1000;


                gramosPendientes -=
                    usar;


                canecasUsadas.push({

                    id:
                        caneca.id,

                    tipoMiel:
                        caneca.tipoMiel,

                    gramos:
                        usar,

                    costoGramo:
                        costo,

                    costoTotal:
                        usar *
                        costo

                });

            }


            componentesUsados.push({

                tipo:
                    "MIEL",

                componente:
                    requerimiento.componente,

                cantidad:
                    necesario,

                costoTotal:
                    costoMiel

            });

        }


        else if (
            requerimiento.tipo ===
            "PRODUCTO"
        ) {

            const costo =
                consumirProductoTerminado(
                    productos,
                    requerimiento.componente,
                    necesario
                );


            costoTotalProduccion +=
                costo;


            componentesUsados.push({

                tipo:
                    "PRODUCTO",

                componente:
                    requerimiento.componente,

                cantidad:
                    necesario,

                costoTotal:
                    costo

            });

        }

    }


    const costoUnitarioNuevo =
        costoTotalProduccion /
        cantidad;


    const stockNuevo =
        stockAnterior +
        cantidad;


    if (
        stockNuevo > 0
    ) {

        producto.costoUnitario =
            (
                (
                    stockAnterior *
                    costoAnterior
                ) +
                (
                    cantidad *
                    costoUnitarioNuevo
                )
            ) /
            stockNuevo;

    }


    producto.stock =
        stockNuevo;


    localStorage.setItem(
        "productos",
        JSON.stringify(productos)
    );


    localStorage.setItem(
        "insumos",
        JSON.stringify(insumos)
    );


    localStorage.setItem(
        "canecas",
        JSON.stringify(canecas)
    );


    const producciones =
        obtenerProducciones();


    producciones.push({

        id:
            nuevoId(),

        fecha:
            fecha,

        producto:
            nombreProducto,

        cantidad:
            cantidad,

        costoUnitario:
            costoUnitarioNuevo,

        costoTotal:
            costoTotalProduccion,

        lote:
            lote,

        fechaVencimiento:
            fechaVencimiento,

        recetaIds:
            recetas.map(
                receta =>
                    receta.id
            ),

        componentes:
            componentesUsados,

        canecasUsadas:
            canecasUsadas

    });


    localStorage.setItem(
        "producciones",
        JSON.stringify(producciones)
    );


    const textoCanecas =
        canecasUsadas.length > 0
            ? "\n\nCanecas utilizadas:\n" +
                canecasUsadas
                    .map(
                        c =>
                            `${c.id} (${c.tipoMiel}): ${formatoNumero(Math.round(c.gramos * 100) / 100)} g`
                    )
                    .join("\n")
            : "";


    alert(

        "Producción registrada correctamente.\n\n" +

        "Producto: " +
        nombreProducto +

        "\nCantidad: " +
        cantidad +

        "\nLote: " +
        lote +

        (
            fechaVencimiento
                ? "\nVence: " + fechaVencimiento
                : ""
        ) +

        "\nCosto total: " +
        formatoMoneda(
            costoTotalProduccion
        ) +

        textoCanecas

    );


    document.getElementById(
        "cantidadProduccion"
    ).value = "";


    document.getElementById("loteProduccion").value = "";

    document.getElementById("vencimientoProduccion").value = "";


    mostrarProductosGestion();

    mostrarResumenProduccion();

    mostrarInventario();

    mostrarInsumos();

    mostrarCanecas();

    mostrarProduccion();

    cargarProductosVenta();

    actualizarResumenInicio();

}


/* ============================================================
   HISTORIAL PRODUCCIÓN
============================================================ */

function mostrarProduccion() {

    const producciones =
        obtenerProducciones();


    const tabla =
        document.getElementById(
            "tablaProduccion"
        );


    if (!tabla) return;


    tabla.innerHTML = "";


    producciones.forEach(produccion => {

        const fila =
            document.createElement("tr");


        const canecasUsadas =
            Array.isArray(produccion.canecasUsadas)
                ? produccion.canecasUsadas
                : [];


        const detalleCanecas =
            canecasUsadas.length > 0
                ? "<br><small>Canecas: " +
                    canecasUsadas
                        .map(
                            c =>
                                `${escaparTexto(c.id)} (${formatoNumero(Math.round(Number(c.gramos || 0) * 100) / 100)} g)`
                        )
                        .join(", ") +
                    "</small>"
                : "";


        fila.innerHTML = `

            <td>
                ${escaparTexto(
                    produccion.fecha
                )}
            </td>

            <td>
                ${escaparTexto(
                    produccion.producto
                )}
                ${detalleCanecas}
            </td>

            <td>
                ${escaparTexto(produccion.lote || "—")}
            </td>

            <td>
                ${escaparTexto(produccion.fechaVencimiento || "—")}
            </td>

            <td>
                ${formatoNumero(
                    produccion.cantidad || 0
                )}
            </td>

            <td>
                ${formatoMoneda(
                    produccion.costoUnitario
                )}
            </td>

            <td>
                ${formatoMoneda(
                    produccion.costoTotal
                )}
            </td>

            <td>
                ${
                    produccion.anulada
                        ? `${etiquetaEstado("ANULADA")}<br><small>${escaparTexto(produccion.motivoAnulacion || "")}</small>`
                        : `<button type="button" onclick="anularProduccion(${produccion.id})">Anular</button>`
                }
            </td>

        `;


        tabla.appendChild(
            fila
        );

    });


    // Muestra cuál será el próximo lote automático
    const campoLote =
        document.getElementById("loteProduccion");

    const campoFecha =
        document.getElementById("fechaProduccion");

    if (campoLote) {

        const siguiente =
            generarLote(
                campoFecha && campoFecha.value
                    ? campoFecha.value
                    : obtenerFechaActual()
            );

        campoLote.placeholder =
            `${siguiente} (automático)`;

    }

}


/* ============================================================
   LOTE DE PRODUCCIÓN
============================================================ */

function generarLote(fecha) {

    const base =
        "L" +
        String(fecha || obtenerFechaActual()).replace(/-/g, "");

    const producciones =
        obtenerProducciones();

    let consecutivo =
        1;

    let lote =
        "";

    do {

        lote =
            `${base}-${String(consecutivo).padStart(2, "0")}`;

        consecutivo++;

    } while (
        producciones.some(
            p => mismoNombre(p.lote, lote)
        )
    );

    return lote;

}


/* ============================================================
   VENTAS
============================================================ */

function obtenerVentas() {

    return JSON.parse(
        localStorage.getItem(
            "ventas"
        )
    ) || [];

}


/* ============================================================
   CARGAR PRODUCTOS VENTA
============================================================ */

function cargarProductosVenta() {

    const select =
        document.getElementById(
            "productoVenta"
        );


    if (!select) return;


    const productos =
        obtenerProductos().filter(
            producto =>
                estaActivo(producto) &&
                producto.tipo ===
                "PRODUCTO TERMINADO"
        );


    select.innerHTML = `

        <option value="">
            Seleccione un producto
        </option>

    `;


    productos.forEach(producto => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            producto.nombre;


        option.textContent =
            `${producto.nombre} — Stock: ${formatoNumero(producto.stock)}`;


        select.appendChild(
            option
        );

    });

}


/* ============================================================
   CARGAR DESTINOS
============================================================ */

function cargarTercerosVenta() {

    const select =
        document.getElementById(
            "terceroVenta"
        );


    if (!select) return;


    const terceros =
        obtenerTerceros().filter(
            tercero =>
                tercero.tipo ===
                    "DISTRIBUIDOR" ||
                tercero.tipo ===
                    "EVENTO" ||
                tercero.tipo ===
                    "DIRECTO"
        );


    select.innerHTML = `

        <option value="">
            Seleccione un destino
        </option>

    `;


    terceros.forEach(tercero => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            tercero.nombre;


        option.textContent =
            `${tercero.nombre} (${tercero.tipo})`;


        select.appendChild(
            option
        );

    });

}


/* ============================================================
   COSTO PRODUCTO
============================================================ */

function obtenerCostoUnitarioProducto(
    nombreProducto
) {

    const nombre =
        String(nombreProducto || "")
            .trim()
            .toUpperCase();


    const productos =
        obtenerProductos();


    const producto =
        productos.find(
            p =>
                String(p.nombre || "")
                    .trim()
                    .toUpperCase() === nombre
        );


    if (
        producto &&
        Number(
            producto.costoUnitario || 0
        ) > 0
    ) {

        return Number(
            producto.costoUnitario
        );

    }


    const producciones =
        obtenerProducciones();


    const produccionesProducto =
        producciones.filter(
            p =>
                !p.anulada &&
                String(p.producto || "")
                    .trim()
                    .toUpperCase() === nombre
        );


    let cantidadTotal =
        0;


    let costoTotal =
        0;


    produccionesProducto.forEach(produccion => {

        cantidadTotal +=
            Number(
                produccion.cantidad || 0
            );


        costoTotal +=
            Number(
                produccion.costoTotal || 0
            );

    });


    if (
        cantidadTotal > 0
    ) {

        return costoTotal /
            cantidadTotal;

    }


    return 0;

}


/* ============================================================
   COSTO EMPAQUE
============================================================ */

/*
   Piezas que forman cada opción del select "empaqueVenta".
*/

const PIEZAS_EMPAQUE = {

    NINGUNO:
        [],

    BOLSA:
        ["BOLSA"],

    CAJA:
        ["CAJA"],

    CAJA_BOLSA:
        ["CAJA", "BOLSA"]

};


/*
   Nombres de insumo aceptados para cada pieza.
   El primero es el nombre recomendado. La comparación
   ignora tildes y espacios dobles, así que
   "CAJA DE ENVIO" y "CAJA DE ENVÍO" son lo mismo.
*/

const NOMBRES_EMPAQUE = {

    BOLSA:
        [
            "BOLSA",
            "BOLSAS",
            "BOLSA DE ENVÍO"
        ],

    CAJA:
        [
            "CAJA DE ENVÍO",
            "CAJAS DE ENVÍO",
            "CAJA ENVÍO",
            "CAJA PARA ENVÍO"
        ]

};


function insumoCorrespondeAPieza(
    nombreInsumo,
    pieza
) {

    return (NOMBRES_EMPAQUE[pieza] || [])
        .map(normalizarNombre)
        .includes(
            normalizarNombre(nombreInsumo)
        );

}


function buscarInsumoEmpaque(
    insumos,
    pieza
) {

    const nombres =
        (NOMBRES_EMPAQUE[pieza] || [])
            .map(normalizarNombre);


    /* Primero un insumo activo, en el orden de la lista */

    for (const nombre of nombres) {

        const encontrado =
            insumos.find(
                i =>
                    estaActivo(i) &&
                    normalizarNombre(i.nombre) === nombre
            );


        if (encontrado) {

            return encontrado;

        }

    }


    /* Si solo existe inactivo, se devuelve para avisarlo */

    return insumos.find(
        i =>
            nombres.includes(
                normalizarNombre(i.nombre)
            )
    ) || null;

}


function obtenerCostoEmpaque(
    empaque
) {

    const insumos =
        obtenerInsumos();


    const piezas =
        PIEZAS_EMPAQUE[empaque];


    if (!piezas) {

        return {

            valido:
                false,

            mensaje:
                "El tipo de empaque seleccionado no es válido."

        };

    }


    const componentes =
        [];


    for (
        const pieza
        of piezas
    ) {

        const nombreRecomendado =
            NOMBRES_EMPAQUE[pieza][0];


        const insumo =
            buscarInsumoEmpaque(
                insumos,
                pieza
            );


        if (!insumo) {

            /*
               Caso frecuente: el empaque se registró en
               PRODUCTOS con tipo INSUMO. Ese registro no
               tiene costo, por eso no sirve para la venta.
            */

            const enProductos =
                obtenerProductos().some(
                    p =>
                        insumoCorrespondeAPieza(
                            p.nombre,
                            pieza
                        )
                );


            return {

                valido:
                    false,

                mensaje:
                    `No se puede calcular el costo de ${nombreRecomendado} porque no está registrado como insumo.\n\n` +
                    (
                        enProductos
                            ? `Está registrado en PRODUCTOS, pero ese registro no tiene costo promedio.\n\n`
                            : ""
                    ) +
                    `Regístrelo en Inventario > Registro de Insumos con el nombre ${nombreRecomendado}, su stock y su costo promedio.`

            };

        }


        if (!estaActivo(insumo)) {

            return {

                valido:
                    false,

                mensaje:
                    `El insumo ${insumo.nombre} está INACTIVO.\n\n` +
                    "Reactívelo en Inventario > Insumos para usarlo como empaque."

            };

        }


        const stock =
            Number(
                insumo.stock || 0
            );


        const costo =
            Number(
                insumo.costoPromedio || 0
            );


        if (
            !Number.isFinite(costo) ||
            costo <= 0
        ) {

            return {

                valido:
                    false,

                mensaje:
                    `El insumo ${insumo.nombre} no tiene un costo promedio válido.\n\n` +
                    `Registre primero su costo.`

            };

        }


        componentes.push({

            nombre:
                insumo.nombre,

            insumoId:
                insumo.id,

            stock:
                stock,

            costo:
                costo

        });

    }


    const costoUnitario =
        componentes.reduce(
            (
                total,
                item
            ) =>
                total +
                item.costo,
            0
        );


    return {

        valido:
            true,

        costoUnitario:
            costoUnitario,

        componentes:
            componentes

    };

}


/* ============================================================
   VALIDAR EMPAQUE
============================================================ */

function validarYObtenerEmpaqueVenta(
    empaque,
    cantidad
) {

    const resultado =
        obtenerCostoEmpaque(
            empaque
        );


    if (
        !resultado.valido
    ) {

        return resultado;

    }


    for (
        const item
        of resultado.componentes
    ) {

        if (
            item.stock <
            cantidad
        ) {

            return {

                valido:
                    false,

                mensaje:
                    `No hay suficiente stock de ${item.nombre}.\n\n` +
                    `Stock disponible: ${formatoNumero(item.stock)}\n` +
                    `Cantidad necesaria: ${formatoNumero(cantidad)}`

            };

        }

    }


    return resultado;

}


/* ============================================================
   VENTAS: DATOS DE APOYO

   Cada venta es un PEDIDO que puede tener varios
   productos (items). El empaque de envío se cuenta por
   pedido, no por unidad. Las ventas registradas antes de
   este cambio (un solo producto) se leen igual.
============================================================ */

let lineasPedidoVenta =
    [];


function itemsDeVenta(venta) {

    if (Array.isArray(venta.items)) {
        return venta.items;
    }

    // Venta antigua de un solo producto
    const cantidad =
        Number(venta.cantidad || 0);

    const costoProducto =
        venta.costoProductoUnitario !== undefined &&
        venta.costoProductoUnitario !== null
            ? Number(venta.costoProductoUnitario)
            : Number(venta.costoUnitario || 0) -
              Number(venta.costoEmpaqueUnitario || 0);

    return [
        {
            producto: venta.producto,
            cantidad: cantidad,
            precioUnitario: Number(venta.precioUnitario || 0),
            costoUnitario: costoProducto,
            total: Number(venta.totalVenta || 0),
            costoTotal: cantidad * costoProducto
        }
    ];

}


function costoEmpaqueDeVenta(venta) {

    if (venta.costoEmpaqueTotal !== undefined) {
        return Number(venta.costoEmpaqueTotal || 0);
    }

    // Ventas antiguas: un empaque por unidad
    return Number(venta.costoEmpaqueUnitario || 0) *
        Number(venta.cantidad || 0);

}


function pagadoDeVenta(venta) {

    // Ventas antiguas sin registro de pagos: se consideran pagadas
    if (!Array.isArray(venta.pagos)) {
        return Number(venta.totalVenta || 0);
    }

    return venta.pagos.reduce(
        (total, pago) => total + Number(pago.valor || 0),
        0
    );

}


function saldoDeVenta(venta) {

    if (venta.anulada) {
        return 0;
    }

    return Math.max(
        0,
        redondear(
            Number(venta.totalVenta || 0) - pagadoDeVenta(venta),
            2
        )
    );

}


function canalDeVenta(venta) {

    if (venta.terceroTipo) {
        return venta.terceroTipo;
    }

    const tercero =
        obtenerTerceros().find(
            t => mismoNombre(t.nombre, venta.tercero)
        );

    return tercero
        ? tercero.tipo
        : "SIN CANAL";

}


function nombreEmpaqueVenta(venta) {

    const nombres = {
        NINGUNO: "SIN EMPAQUE",
        BOLSA: "BOLSA",
        CAJA: "CAJA DE ENVÍO",
        CAJA_BOLSA: "CAJA DE ENVÍO + BOLSA"
    };

    const empaque =
        venta.empaque || "NINGUNO";

    let texto =
        nombres[empaque] || empaque;

    const cantidad =
        Number(venta.cantidadEmpaques || 0);

    if (
        empaque !== "NINGUNO" &&
        cantidad > 1
    ) {
        texto += ` × ${cantidad}`;
    }

    return texto;

}


/* ============================================================
   VENTAS: PRODUCTOS DEL PEDIDO
============================================================ */

function leerLineaActualVenta() {

    return {

        producto:
            document.getElementById("productoVenta").value,

        cantidad:
            convertirNumero(
                document.getElementById("cantidadVenta").value
            ),

        precio:
            convertirNumero(
                document.getElementById("precioVenta").value
            )

    };

}


/*
   Devuelve "" si la línea es válida, o el mensaje de error.
*/

function validarLineaVenta(producto, cantidad, precio, lineasExistentes) {

    if (!producto) {
        return "Seleccione el producto.";
    }

    if (
        !numeroValido(cantidad) ||
        cantidad <= 0 ||
        !Number.isInteger(cantidad)
    ) {
        return "La cantidad debe ser un número entero mayor que 0.";
    }

    if (
        !numeroValido(precio) ||
        precio <= 0
    ) {
        return "Ingrese un precio unitario válido.";
    }

    const registro =
        obtenerProductos().find(
            p =>
                estaActivo(p) &&
                p.tipo === "PRODUCTO TERMINADO" &&
                mismoNombre(p.nombre, producto)
        );

    if (!registro) {
        return "No se encontró el producto.";
    }

    const yaEnPedido =
        lineasExistentes
            .filter(l => mismoNombre(l.producto, producto))
            .reduce((total, l) => total + l.cantidad, 0);

    const stock =
        Number(registro.stock || 0);

    if (stock < yaEnPedido + cantidad) {

        return `No hay suficiente stock de ${registro.nombre}.\n\n` +
            `Stock disponible: ${formatoNumero(stock)}\n` +
            `Cantidad en el pedido: ${formatoNumero(yaEnPedido + cantidad)}`;

    }

    if (obtenerCostoUnitarioProducto(producto) <= 0) {

        return `${registro.nombre} no tiene un costo unitario registrado.\n\n` +
            "Registre primero una producción para poder calcular correctamente la ganancia.";

    }

    return "";

}


function agregarLineaVenta() {

    const linea =
        leerLineaActualVenta();

    const error =
        validarLineaVenta(
            linea.producto,
            linea.cantidad,
            linea.precio,
            lineasPedidoVenta
        );

    if (error) {
        alert(error);
        return;
    }

    const existente =
        lineasPedidoVenta.find(
            l =>
                mismoNombre(l.producto, linea.producto) &&
                l.precioUnitario === linea.precio
        );

    if (existente) {

        existente.cantidad +=
            linea.cantidad;

    }

    else {

        lineasPedidoVenta.push({
            producto: linea.producto,
            cantidad: linea.cantidad,
            precioUnitario: linea.precio
        });

    }

    document.getElementById("productoVenta").value = "";
    document.getElementById("cantidadVenta").value = "";
    document.getElementById("precioVenta").value = "";

    mostrarLineasVenta();

    calcularTotalesVenta();

}


function quitarLineaVenta(indice) {

    lineasPedidoVenta.splice(indice, 1);

    mostrarLineasVenta();

    calcularTotalesVenta();

}


function limpiarPedidoVenta() {

    lineasPedidoVenta =
        [];

    mostrarLineasVenta();

}


function mostrarLineasVenta() {

    const contenedor =
        document.getElementById("pedidoVenta");

    const tabla =
        document.getElementById("tablaPedidoVenta");

    if (!contenedor || !tabla) {
        return;
    }

    tabla.innerHTML = "";

    lineasPedidoVenta.forEach((linea, indice) => {

        const fila =
            document.createElement("tr");

        fila.innerHTML = `

            <td>${escaparTexto(linea.producto)}</td>

            <td>${formatoNumero(linea.cantidad)}</td>

            <td>${formatoMoneda(linea.precioUnitario)}</td>

            <td>${formatoMoneda(linea.cantidad * linea.precioUnitario)}</td>

            <td>
                <button
                    type="button"
                    style="margin-top: 0; padding: 6px 12px;"
                    onclick="quitarLineaVenta(${indice})"
                >
                    Quitar
                </button>
            </td>

        `;

        tabla.appendChild(fila);

    });

    contenedor.style.display =
        lineasPedidoVenta.length > 0
            ? "block"
            : "none";

}


/*
   Para la vista previa: las líneas agregadas más lo que
   esté escrito en los campos de producto, cantidad y precio.
*/

function obtenerLineasParaCalculo() {

    const lineas =
        lineasPedidoVenta.map(l => ({ ...l }));

    const actual =
        leerLineaActualVenta();

    if (
        Number.isFinite(actual.cantidad) &&
        actual.cantidad > 0
    ) {

        lineas.push({
            producto: actual.producto,
            cantidad: actual.cantidad,
            precioUnitario: Number.isFinite(actual.precio)
                ? actual.precio
                : 0
        });

    }

    return lineas;

}


function cambiarEstadoPagoVenta() {

    const select =
        document.getElementById("estadoPagoVenta");

    const grupo =
        document.getElementById("grupoAbonoVenta");

    if (!select || !grupo) {
        return;
    }

    const pendiente =
        select.value === "PENDIENTE";

    grupo.style.display =
        pendiente
            ? ""
            : "none";

    if (!pendiente) {
        document.getElementById("abonoInicialVenta").value = "0";
    }

}


/* ============================================================
   CALCULAR TOTALES VENTA
============================================================ */

/*
   Evita repetir el mismo aviso de empaque mientras
   se escribe la cantidad o el precio.
*/

let empaqueVentaAvisado =
    "";


function calcularTotalesVenta() {

    const empaque =
        document.getElementById("empaqueVenta").value;

    const campoEmpaques =
        document.getElementById("cantidadEmpaquesVenta");

    if (campoEmpaques) {
        campoEmpaques.disabled =
            empaque === "NINGUNO";
    }

    const cantidadEmpaquesLeida =
        campoEmpaques
            ? convertirNumero(campoEmpaques.value)
            : 1;

    const cantidadEmpaques =
        empaque === "NINGUNO"
            ? 0
            : (
                Number.isFinite(cantidadEmpaquesLeida) &&
                cantidadEmpaquesLeida > 0
                    ? cantidadEmpaquesLeida
                    : 0
            );


    const lineas =
        obtenerLineasParaCalculo();

    let totalVenta = 0;
    let costoProductos = 0;
    let unidades = 0;

    lineas.forEach(linea => {

        totalVenta +=
            linea.cantidad * linea.precioUnitario;

        costoProductos +=
            linea.cantidad *
            (
                linea.producto
                    ? obtenerCostoUnitarioProducto(linea.producto)
                    : 0
            );

        unidades +=
            linea.cantidad;

    });


    const resultadoEmpaque =
        obtenerCostoEmpaque(empaque);


    /*
       Si el empaque no se puede calcular, se avisa el motivo
       y no se muestran cifras incompletas.
    */

    if (!resultadoEmpaque.valido) {

        document.getElementById("totalVenta").value = redondear(totalVenta, 2);
        document.getElementById("costoUnitarioVenta").value = "";
        document.getElementById("costoTotalVenta").value = "";
        document.getElementById("gananciaVenta").value = "";

        if (empaqueVentaAvisado !== empaque) {

            empaqueVentaAvisado =
                empaque;

            alert(resultadoEmpaque.mensaje);

        }

        actualizarResumenVenta();

        return;

    }

    empaqueVentaAvisado =
        "";


    // El empaque se cobra por pedido (cantidad de empaques), no por unidad
    const costoTotal =
        costoProductos +
        resultadoEmpaque.costoUnitario * cantidadEmpaques;

    const ganancia =
        totalVenta - costoTotal;


    document.getElementById("totalVenta").value =
        redondear(totalVenta, 2);

    // Costo promedio por unidad del pedido (incluye el empaque)
    document.getElementById("costoUnitarioVenta").value =
        unidades > 0
            ? redondear(costoTotal / unidades, 2)
            : "";

    document.getElementById("costoTotalVenta").value =
        redondear(costoTotal, 2);

    document.getElementById("gananciaVenta").value =
        redondear(ganancia, 2);

    actualizarResumenVenta();

}


/* ============================================================
   REGISTRAR VENTA
============================================================ */

function registrarVenta() {

    const fecha =
        document.getElementById("fechaVenta").value;

    const tercero =
        document.getElementById("terceroVenta").value;

    const empaque =
        document.getElementById("empaqueVenta").value;


    if (!fecha) {
        alert("Seleccione la fecha.");
        return;
    }


    /* ---------------------------------------------------------
       PRODUCTOS: las líneas agregadas + la que esté en los
       campos (así una venta de un solo producto se registra
       igual que antes, sin necesidad de "Agregar").
    --------------------------------------------------------- */

    const lineas =
        lineasPedidoVenta.map(l => ({ ...l }));

    const actual =
        leerLineaActualVenta();

    if (actual.producto) {

        const error =
            validarLineaVenta(
                actual.producto,
                actual.cantidad,
                actual.precio,
                lineas
            );

        if (error) {
            alert(error);
            return;
        }

        lineas.push({
            producto: actual.producto,
            cantidad: actual.cantidad,
            precioUnitario: actual.precio
        });

    }

    if (lineas.length === 0) {
        alert("Seleccione el producto.");
        return;
    }

    if (!tercero) {
        alert("Seleccione el destino o tercero.");
        return;
    }


    /* Revalidar stock del pedido completo (por si cambió) */

    const productos =
        obtenerProductos();

    const buscarProducto = nombre =>
        productos.find(
            p =>
                estaActivo(p) &&
                p.tipo === "PRODUCTO TERMINADO" &&
                mismoNombre(p.nombre, nombre)
        );

    const cantidadesPorProducto = {};

    lineas.forEach(linea => {

        const clave =
            String(linea.producto).toUpperCase();

        cantidadesPorProducto[clave] =
            (cantidadesPorProducto[clave] || 0) + linea.cantidad;

    });

    for (const clave of Object.keys(cantidadesPorProducto)) {

        const producto =
            buscarProducto(clave);

        if (!producto) {
            alert(`No se encontró el producto ${clave}.`);
            return;
        }

        if (Number(producto.stock || 0) < cantidadesPorProducto[clave]) {

            alert(
                `No hay suficiente stock de ${producto.nombre}.\n\n` +
                `Stock disponible: ${formatoNumero(producto.stock)}\n` +
                `Cantidad solicitada: ${formatoNumero(cantidadesPorProducto[clave])}`
            );

            return;

        }

    }


    /* ---------------------------------------------------------
       EMPAQUE: se cuenta por pedido
    --------------------------------------------------------- */

    let cantidadEmpaques =
        0;

    if (empaque !== "NINGUNO") {

        cantidadEmpaques =
            convertirNumero(
                document.getElementById("cantidadEmpaquesVenta").value
            );

        if (
            !numeroValido(cantidadEmpaques) ||
            cantidadEmpaques < 1 ||
            !Number.isInteger(cantidadEmpaques)
        ) {

            alert("La cantidad de empaques debe ser un número entero mayor o igual a 1.");

            return;

        }

    }

    const resultadoEmpaque =
        validarYObtenerEmpaqueVenta(
            empaque,
            cantidadEmpaques
        );

    if (!resultadoEmpaque.valido) {
        alert(resultadoEmpaque.mensaje);
        return;
    }


    /* ---------------------------------------------------------
       CÁLCULOS
    --------------------------------------------------------- */

    const items =
        lineas.map(linea => {

            const producto =
                buscarProducto(linea.producto);

            const costoUnitario =
                obtenerCostoUnitarioProducto(producto.nombre);

            return {
                producto: producto.nombre,
                cantidad: linea.cantidad,
                precioUnitario: linea.precioUnitario,
                costoUnitario: costoUnitario,
                total: linea.cantidad * linea.precioUnitario,
                costoTotal: linea.cantidad * costoUnitario
            };

        });

    const totalVenta =
        items.reduce((t, i) => t + i.total, 0);

    const costoProductos =
        items.reduce((t, i) => t + i.costoTotal, 0);

    const unidades =
        items.reduce((t, i) => t + i.cantidad, 0);

    const costoEmpaqueUnitario =
        resultadoEmpaque.costoUnitario;

    const costoEmpaqueTotal =
        costoEmpaqueUnitario * cantidadEmpaques;

    const costoTotal =
        costoProductos + costoEmpaqueTotal;

    const ganancia =
        totalVenta - costoTotal;


    /* ---------------------------------------------------------
       PAGO
    --------------------------------------------------------- */

    const estadoPago =
        document.getElementById("estadoPagoVenta").value;

    const pagos =
        [];

    if (estadoPago === "PENDIENTE") {

        const abono =
            convertirNumero(
                document.getElementById("abonoInicialVenta").value
            );

        const abonoReal =
            Number.isFinite(abono)
                ? abono
                : 0;

        if (
            abonoReal < 0 ||
            abonoReal >= totalVenta
        ) {

            alert(
                "El abono inicial debe ser mayor o igual a 0 y menor que el total de la venta.\n\n" +
                "Si el cliente pagó todo, seleccione PAGADO."
            );

            return;

        }

        if (abonoReal > 0) {
            pagos.push({ fecha: fecha, valor: abonoReal });
        }

    }

    else {

        pagos.push({ fecha: fecha, valor: totalVenta });

    }


    /* ---------------------------------------------------------
       DESCONTAR PRODUCTOS Y EMPAQUES
    --------------------------------------------------------- */

    items.forEach(item => {

        const producto =
            buscarProducto(item.producto);

        producto.stock =
            redondear(Number(producto.stock || 0) - item.cantidad);

    });

    const insumos =
        obtenerInsumos();

    resultadoEmpaque.componentes.forEach(componente => {

        const insumo =
            insumos.find(
                i => String(i.id) === String(componente.insumoId)
            );

        insumo.stock =
            redondear(Number(insumo.stock || 0) - cantidadEmpaques);

    });

    localStorage.setItem("productos", JSON.stringify(productos));

    localStorage.setItem("insumos", JSON.stringify(insumos));


    /* ---------------------------------------------------------
       GUARDAR
    --------------------------------------------------------- */

    const terceroRegistro =
        obtenerTerceros().find(
            t => mismoNombre(t.nombre, tercero)
        );

    const venta = {

        id: nuevoId(),

        fecha: fecha,

        tercero: tercero,

        terceroTipo: terceroRegistro
            ? terceroRegistro.tipo
            : "",

        items: items,

        // Resumen (compatibilidad con ventas anteriores)
        producto: items.map(i => i.producto).join(", "),

        cantidad: unidades,

        precioUnitario: items.length === 1
            ? items[0].precioUnitario
            : null,

        costoProductoUnitario: items.length === 1
            ? items[0].costoUnitario
            : null,

        empaque: empaque,

        cantidadEmpaques: cantidadEmpaques,

        costoEmpaqueUnitario: costoEmpaqueUnitario,

        costoEmpaqueTotal: costoEmpaqueTotal,

        empaqueComponentes:
            resultadoEmpaque.componentes.map(
                componente => ({
                    insumoId: componente.insumoId,
                    nombre: componente.nombre,
                    cantidad: cantidadEmpaques,
                    costoUnitario: componente.costo
                })
            ),

        totalVenta: totalVenta,

        costoUnitario: unidades > 0
            ? costoTotal / unidades
            : 0,

        costoTotal: costoTotal,

        ganancia: ganancia,

        pagos: pagos,

        estadoPago: "PAGADO"

    };

    venta.estadoPago =
        saldoDeVenta(venta) > 0
            ? "PENDIENTE"
            : "PAGADO";

    const ventas =
        obtenerVentas();

    ventas.push(venta);

    localStorage.setItem("ventas", JSON.stringify(ventas));


    const saldo =
        saldoDeVenta(venta);

    alert(

        "Venta registrada correctamente.\n\n" +

        "Productos:\n" +
        items
            .map(i => `• ${i.producto} × ${formatoNumero(i.cantidad)}`)
            .join("\n") +

        "\n\nEmpaque: " + nombreEmpaqueVenta(venta) +

        "\nTotal venta: " + formatoMoneda(totalVenta) +

        "\nCosto total: " + formatoMoneda(costoTotal) +

        "\nGanancia: " + formatoMoneda(ganancia) +

        "\nPago: " +
        (
            saldo > 0
                ? `PENDIENTE (saldo ${formatoMoneda(saldo)})`
                : "PAGADO"
        )

    );


    /* ---------------------------------------------------------
       LIMPIAR FORMULARIO
    --------------------------------------------------------- */

    limpiarPedidoVenta();

    [
        "productoVenta",
        "terceroVenta",
        "cantidadVenta",
        "precioVenta",
        "totalVenta",
        "costoUnitarioVenta",
        "costoTotalVenta",
        "gananciaVenta"
    ].forEach(id => {
        document.getElementById(id).value = "";
    });

    document.getElementById("empaqueVenta").value = "NINGUNO";
    document.getElementById("cantidadEmpaquesVenta").value = "1";
    document.getElementById("cantidadEmpaquesVenta").disabled = true;
    document.getElementById("estadoPagoVenta").value = "PAGADO";

    cambiarEstadoPagoVenta();

    actualizarResumenVenta();


    mostrarProductosGestion();

    mostrarInventario();

    mostrarInsumos();

    cargarProductosVenta();

    mostrarVentas();

    actualizarResumenInicio();

}


/* ============================================================
   MOSTRAR VENTAS
============================================================ */

function mostrarVentas() {

    const ventas =
        obtenerVentas();

    const tabla =
        document.getElementById("tablaVentas");

    if (!tabla) return;

    tabla.innerHTML = "";

    let totalVentas = 0;
    let totalCosto = 0;
    let totalGanancia = 0;
    let totalUnidades = 0;

    ventas.forEach(venta => {

        const items =
            itemsDeVenta(venta);

        const anulada =
            venta.anulada === true;

        const unidades =
            items.reduce((t, i) => t + Number(i.cantidad || 0), 0);

        // Las ventas anuladas no suman en los totales
        if (!anulada) {
            totalVentas += Number(venta.totalVenta || 0);
            totalCosto += Number(venta.costoTotal || 0);
            totalGanancia += Number(venta.ganancia || 0);
            totalUnidades += unidades;
        }

        const saldo =
            saldoDeVenta(venta);

        const textoPago =
            anulada
                ? `${etiquetaEstado("ANULADA")}<br><small>${escaparTexto(venta.motivoAnulacion || "")}</small>`
                : saldo > 0
                    ? `${etiquetaEstado("PENDIENTE")}<br><small>Saldo ${formatoMoneda(saldo)}</small>`
                    : etiquetaEstado("PAGADO");

        const fila =
            document.createElement("tr");

        fila.innerHTML = `

            <td>${escaparTexto(venta.fecha)}</td>

            <td>
                ${
                    // Cada producto en su línea, con cantidad y precio
                    items
                        .map(i =>
                            `<div class="linea-pedido">` +
                            `${escaparTexto(i.producto)} × ${formatoNumero(i.cantidad)} ` +
                            `<small>a ${formatoMoneda(i.precioUnitario)}</small>` +
                            `</div>`
                        )
                        .join("")
                }
                <small class="empaque-pedido">Empaque: ${escaparTexto(nombreEmpaqueVenta(venta))}</small>
            </td>

            <td>${escaparTexto(venta.tercero)}</td>

            <td><strong>${formatoMoneda(venta.totalVenta)}</strong></td>

            <td>
                ${formatoMoneda(venta.ganancia)}
                <br><small>Costo ${formatoMoneda(venta.costoTotal)}</small>
            </td>

            <td>${textoPago}</td>

            <td>
                ${
                    anulada
                        ? "—"
                        : `<button type="button" onclick="anularVenta(${venta.id})">Anular</button>`
                }
            </td>

        `;

        tabla.appendChild(fila);

    });

    document.getElementById("totalVentasRegistradas").textContent =
        formatoMoneda(totalVentas);

    document.getElementById("totalCostoVentas").textContent =
        formatoMoneda(totalCosto);

    document.getElementById("totalGananciaVentas").textContent =
        formatoMoneda(totalGanancia);

    document.getElementById("totalUnidadesVendidas").textContent =
        formatoNumero(totalUnidades);

    mostrarCuentasPorCobrar();

}


/* ============================================================
   CUENTAS POR COBRAR
============================================================ */

function mostrarCuentasPorCobrar() {

    const tabla =
        document.getElementById("tablaCuentasCobrar");

    if (!tabla) return;

    const pendientes =
        obtenerVentas().filter(
            venta => saldoDeVenta(venta) > 0
        );

    tabla.innerHTML = "";

    let totalPorCobrar =
        0;

    pendientes.forEach(venta => {

        const saldo =
            saldoDeVenta(venta);

        totalPorCobrar +=
            saldo;

        const fila =
            document.createElement("tr");

        fila.innerHTML = `

            <td>${escaparTexto(venta.fecha)}</td>

            <td>${escaparTexto(venta.tercero)}</td>

            <td>
                ${
                    itemsDeVenta(venta)
                        .map(i => `${escaparTexto(i.producto)} × ${formatoNumero(i.cantidad)}`)
                        .join("<br>")
                }
            </td>

            <td>${formatoMoneda(venta.totalVenta)}</td>

            <td>${formatoMoneda(pagadoDeVenta(venta))}</td>

            <td>${formatoMoneda(saldo)}</td>

            <td>
                <input
                    type="number"
                    id="abonoVenta${venta.id}"
                    min="0"
                    step="1"
                    value="${saldo}"
                    style="width: 120px; padding: 6px;"
                >
                <button
                    type="button"
                    onclick="registrarPagoVenta(${venta.id})"
                >
                    Registrar pago
                </button>
            </td>

        `;

        tabla.appendChild(fila);

    });

    if (pendientes.length === 0) {

        tabla.innerHTML =
            `<tr><td colspan="7">No hay cuentas por cobrar.</td></tr>`;

    }

    const total =
        document.getElementById("totalPorCobrar");

    if (total) {
        total.textContent =
            formatoMoneda(totalPorCobrar);
    }

}


function registrarPagoVenta(id) {

    const ventas =
        obtenerVentas();

    const venta =
        ventas.find(v => String(v.id) === String(id));

    if (!venta || venta.anulada) {
        alert("No se encontró la venta.");
        return;
    }

    const saldo =
        saldoDeVenta(venta);

    const campo =
        document.getElementById(`abonoVenta${id}`);

    const valor =
        convertirNumero(campo ? campo.value : "");

    if (
        !numeroValido(valor) ||
        valor <= 0
    ) {
        alert("Ingrese un valor de pago mayor que 0.");
        return;
    }

    if (valor > saldo + 0.001) {
        alert(`El pago no puede ser mayor que el saldo pendiente (${formatoMoneda(saldo)}).`);
        return;
    }

    if (!Array.isArray(venta.pagos)) {
        venta.pagos = [];
    }

    venta.pagos.push({
        fecha: obtenerFechaActual(),
        valor: valor
    });

    venta.estadoPago =
        saldoDeVenta(venta) > 0
            ? "PENDIENTE"
            : "PAGADO";

    localStorage.setItem("ventas", JSON.stringify(ventas));

    alert(
        "Pago registrado correctamente.\n\n" +
        `Saldo pendiente: ${formatoMoneda(saldoDeVenta(venta))}`
    );

    mostrarVentas();

    actualizarResumenInicio();

}


/* ============================================================
   ANULAR VENTA
============================================================ */

function anularVenta(id) {

    const ventas =
        obtenerVentas();

    const venta =
        ventas.find(v => String(v.id) === String(id));

    if (!venta || venta.anulada) {
        return;
    }

    const productos =
        obtenerProductos();

    const insumos =
        obtenerInsumos();

    const items =
        itemsDeVenta(venta);

    const buscarProducto = nombre =>
        productos.find(
            p =>
                p.tipo === "PRODUCTO TERMINADO" &&
                coincideNombre(p, nombre)
        );

    for (const item of items) {

        if (!buscarProducto(item.producto)) {

            alert(`No se encontró el producto ${item.producto}; no se puede devolver al inventario.`);

            return;

        }

    }

    let empaques;

    if (Array.isArray(venta.empaqueComponentes)) {

        empaques =
            venta.empaqueComponentes.map(c => ({
                insumo: insumos.find(i => String(i.id) === String(c.insumoId)),
                nombre: c.nombre,
                cantidad: Number(c.cantidad ?? venta.cantidad ?? 0),
                costo: Number(c.costoUnitario || 0)
            }));

    }

    else {

        // Venta antigua: un empaque por unidad
        empaques =
            (PIEZAS_EMPAQUE[venta.empaque] || []).map(pieza => ({
                insumo: buscarInsumoEmpaque(insumos, pieza),
                nombre: NOMBRES_EMPAQUE[pieza][0],
                cantidad: Number(venta.cantidad || 0),
                costo: NaN
            }));

    }

    const faltante =
        empaques.find(e => !e.insumo);

    if (faltante) {

        alert(`No se encontró el insumo ${faltante.nombre}; no se puede devolver al inventario.`);

        return;

    }

    const motivo =
        pedirMotivoAnulacion(
            `la venta del ${venta.fecha} a ${venta.tercero} por ${formatoMoneda(venta.totalVenta)}`
        );

    if (motivo === null) {
        return;
    }

    items.forEach(item => {

        agregarStockConCosto(
            buscarProducto(item.producto),
            "costoUnitario",
            Number(item.cantidad || 0),
            Number(item.costoUnitario)
        );

    });

    empaques.forEach(e => {

        agregarStockConCosto(
            e.insumo,
            "costoPromedio",
            e.cantidad,
            e.costo
        );

    });

    const pagado =
        pagadoDeVenta(venta);

    marcarAnulado(venta, motivo);

    localStorage.setItem("productos", JSON.stringify(productos));
    localStorage.setItem("insumos", JSON.stringify(insumos));
    localStorage.setItem("ventas", JSON.stringify(ventas));

    alert(
        "Venta anulada. Los productos y empaques volvieron al inventario." +
        (
            pagado > 0
                ? `\n\nEl cliente había pagado ${formatoMoneda(pagado)}: recuerde gestionar la devolución.`
                : ""
        )
    );

    refrescarTodo();

}


/* ============================================================
   RESUMEN INICIO
============================================================ */

function actualizarResumenInicio() {

    const canecas =
        obtenerCanecas().filter(
            estaActivo
        );


    const productos =
        obtenerProductos().filter(
            estaActivo
        );


    const insumos =
        obtenerInsumos().filter(
            estaActivo
        );


    const ventas =
        obtenerVentas();


    const totalCanecas =
        canecas.length;


    const totalProductos =
        productos.length;


    const productosStockBajo =
        productos.filter(
            producto =>
                Number(
                    producto.stock || 0
                ) <=
                Number(
                    producto.stockMinimo || 0
                )
        ).length;


    const insumosStockBajo =
        insumos.filter(
            insumo =>
                Number(
                    insumo.stock || 0
                ) <=
                Number(
                    insumo.stockMinimo || 0
                )
        ).length;


    const stockBajo =
        productosStockBajo +
        insumosStockBajo;


    // Las ventas anuladas no suman
    const totalVentas =
        ventas
            .filter(
                venta => !venta.anulada
            )
            .reduce(
                (
                    total,
                    venta
                ) =>
                    total +
                    Number(
                        venta.totalVenta || 0
                    ),
                0
            );


    const elementoCanecas =
        document.getElementById(
            "totalCanecasInicio"
        );


    const elementoProductos =
        document.getElementById(
            "totalProductosInicio"
        );


    const elementoStock =
        document.getElementById(
            "totalStockBajoInicio"
        );


    const elementoVentas =
        document.getElementById(
            "totalVentasInicio"
        );


    if (
        elementoCanecas
    ) {

        elementoCanecas.textContent =
            formatoNumero(
                totalCanecas
            );

    }


    if (
        elementoProductos
    ) {

        elementoProductos.textContent =
            formatoNumero(
                totalProductos
            );

    }


    if (
        elementoStock
    ) {

        elementoStock.textContent =
            formatoNumero(
                stockBajo
            );

    }


    if (
        elementoVentas
    ) {

        elementoVentas.textContent =
            formatoMoneda(
                totalVentas
            );

    }



    mostrarAlertasInicio();

}


/* ============================================================
   ANULACIONES: APOYO

   Anular NO borra: devuelve las existencias y deja el
   registro en el historial marcado como ANULADO, con la
   fecha y el motivo.
============================================================ */

function pedirMotivoAnulacion(descripcion) {

    const motivo =
        prompt(
            `Va a ANULAR ${descripcion}.\n\n` +
            "Las existencias se devolverán y el registro quedará en el historial marcado como ANULADO.\n\n" +
            "Escriba el motivo de la anulación:",
            ""
        );

    if (motivo === null) {
        return null;
    }

    if (String(motivo).trim() === "") {
        alert("Debe escribir el motivo de la anulación.");
        return null;
    }

    return String(motivo).trim().toUpperCase();

}


function marcarAnulado(registro, motivo) {

    registro.anulada = true;
    registro.fechaAnulacion = obtenerFechaActual();
    registro.anuladaEn = nuevoId();
    registro.motivoAnulacion = motivo;

}


/*
   Suma existencias y recalcula el costo promedio ponderado.
*/

function agregarStockConCosto(registro, campoCosto, cantidad, costoUnitario) {

    const stock =
        Number(registro.stock || 0);

    const costo =
        Number(registro[campoCosto] || 0);

    if (
        Number.isFinite(costoUnitario) &&
        costoUnitario > 0
    ) {

        registro[campoCosto] =
            stock <= 0
                ? costoUnitario
                : ((stock * costo) + (cantidad * costoUnitario)) /
                  (stock + cantidad);

    }

    registro.stock =
        redondear(stock + cantidad);

}


/*
   Resta existencias y deshace el promedio ponderado
   de la entrada que se está anulando.
*/

function quitarStockConCosto(registro, campoCosto, cantidad, costoUnitario) {

    const stock =
        Number(registro.stock || 0);

    const costo =
        Number(registro[campoCosto] || 0);

    const restante =
        redondear(stock - cantidad);

    if (
        restante > 0 &&
        Number.isFinite(costoUnitario)
    ) {

        const nuevoCosto =
            ((stock * costo) - (cantidad * costoUnitario)) / restante;

        if (
            Number.isFinite(nuevoCosto) &&
            nuevoCosto > 0
        ) {
            registro[campoCosto] = nuevoCosto;
        }

    }

    registro.stock =
        restante;

}


/* ============================================================
   ANULAR COMPRA
============================================================ */

function anularCompra(id) {

    const compras =
        obtenerCompras();

    const compra =
        compras.find(c => String(c.id) === String(id));

    if (!compra || compra.anulada) {
        return;
    }

    /* ---------------- COMPRA DE INSUMO ---------------- */

    if (compra.tipo === "INSUMO") {

        const insumos =
            obtenerInsumos();

        const insumo =
            insumos.find(
                i =>
                    compra.insumoId !== undefined
                        ? String(i.id) === String(compra.insumoId)
                        : coincideNombre(i, compra.producto)
            );

        if (!insumo) {
            alert(`No se encontró el insumo ${compra.producto}.`);
            return;
        }

        const cantidad =
            Number(compra.cantidad || 0);

        if (Number(insumo.stock || 0) < cantidad) {

            alert(
                "No se puede anular esta compra porque ya se usaron unidades de ella.\n\n" +
                `Stock actual de ${insumo.nombre}: ${formatoNumero(insumo.stock)}\n` +
                `Cantidad comprada: ${formatoNumero(cantidad)}\n\n` +
                "Si la compra estaba mal, corrija las existencias con un Ajuste de inventario."
            );

            return;

        }

        const motivo =
            pedirMotivoAnulacion(
                `la compra de ${formatoNumero(cantidad)} ${insumo.nombre} del ${compra.fecha}`
            );

        if (motivo === null) {
            return;
        }

        quitarStockConCosto(
            insumo,
            "costoPromedio",
            cantidad,
            Number(compra.costoUnitario || 0)
        );

        marcarAnulado(compra, motivo);

        localStorage.setItem("insumos", JSON.stringify(insumos));

    }

    /* ---------------- COMPRA DE CANECA ---------------- */

    else {

        const canecas =
            obtenerCanecas();

        const idCaneca =
            String(
                compra.canecaId ||
                String(compra.producto || "").split(" - ")[0]
            ).toUpperCase();

        const caneca =
            canecas.find(
                c => String(c.id).toUpperCase() === idCaneca
            );

        if (!caneca) {
            alert(`No se encontró la caneca ${idCaneca}.`);
            return;
        }

        const tieneAjustes =
            obtenerAjustes().some(
                a =>
                    a.tipoItem === "CANECA" &&
                    String(a.itemId).toUpperCase() === idCaneca
            );

        if (
            canecaUsadaEnProduccion(caneca) ||
            tieneAjustes ||
            Number(caneca.pesoDisponible || 0) !== Number(caneca.pesoInicial || 0)
        ) {

            alert(
                `No se puede anular la compra de la caneca ${caneca.id} porque ya tiene movimientos (producción o ajustes).\n\n` +
                "Puede anular primero esas producciones, o corregir con un Ajuste de inventario."
            );

            return;

        }

        const motivo =
            pedirMotivoAnulacion(
                `la compra de la caneca ${caneca.id} (${caneca.tipoMiel}) del ${compra.fecha}`
            );

        if (motivo === null) {
            return;
        }

        // La caneca se conserva para la trazabilidad, sin existencias
        caneca.pesoDisponible = 0;
        caneca.activo = false;
        caneca.anulada = true;
        caneca.fechaInactivacion = obtenerFechaActual();

        marcarAnulado(compra, motivo);

        localStorage.setItem("canecas", JSON.stringify(canecas));

    }

    localStorage.setItem("compras", JSON.stringify(compras));

    alert("Compra anulada. Las existencias se ajustaron.");

    refrescarTodo();

}


/* ============================================================
   ANULAR PRODUCCIÓN
============================================================ */

function anularProduccion(id) {

    const producciones =
        obtenerProducciones();

    const produccion =
        producciones.find(p => String(p.id) === String(id));

    if (!produccion || produccion.anulada) {
        return;
    }

    if (!Array.isArray(produccion.componentes)) {

        alert(
            "Esta producción se registró antes de que el sistema guardara el detalle de lo consumido, por eso no se puede anular automáticamente.\n\n" +
            "Corrija las existencias con un Ajuste de inventario."
        );

        return;

    }

    const productos =
        obtenerProductos();

    const insumos =
        obtenerInsumos();

    const canecas =
        obtenerCanecas();

    const producto =
        productos.find(
            p =>
                p.tipo === "PRODUCTO TERMINADO" &&
                coincideNombre(p, produccion.producto)
        );

    if (!producto) {
        alert(`No se encontró el producto ${produccion.producto}.`);
        return;
    }

    const cantidad =
        Number(produccion.cantidad || 0);

    if (Number(producto.stock || 0) < cantidad) {

        alert(
            "No se puede anular esta producción porque ya salieron unidades de ella.\n\n" +
            `Stock actual de ${producto.nombre}: ${formatoNumero(producto.stock)}\n` +
            `Cantidad producida: ${formatoNumero(cantidad)}\n\n` +
            "Anule primero las ventas o producciones que usaron esas unidades, o corrija con un Ajuste de inventario."
        );

        return;

    }

    /* Verificar que todo lo consumido todavía exista */

    for (const usada of (produccion.canecasUsadas || [])) {

        if (!canecas.find(c => mismoNombre(c.id, usada.id))) {
            alert(`No se encontró la caneca ${usada.id}; no se puede devolver la miel.`);
            return;
        }

    }

    for (const componente of produccion.componentes) {

        if (
            componente.tipo === "INSUMO" &&
            !insumos.find(
                i =>
                    String(i.id) === String(componente.insumoId) ||
                    coincideNombre(i, componente.componente)
            )
        ) {
            alert(`No se encontró el insumo ${componente.componente}.`);
            return;
        }

        if (
            componente.tipo === "PRODUCTO" &&
            !productos.find(p => coincideNombre(p, componente.componente))
        ) {
            alert(`No se encontró el producto ${componente.componente}.`);
            return;
        }

    }

    const motivo =
        pedirMotivoAnulacion(
            `la producción de ${formatoNumero(cantidad)} ${producto.nombre}` +
            (produccion.lote ? ` (lote ${produccion.lote})` : "")
        );

    if (motivo === null) {
        return;
    }

    /* Quitar lo producido */

    quitarStockConCosto(
        producto,
        "costoUnitario",
        cantidad,
        Number(produccion.costoUnitario || 0)
    );

    /* Devolver lo consumido */

    produccion.componentes.forEach(componente => {

        const cantidadComponente =
            Number(componente.cantidad || 0);

        const costoUnitario =
            cantidadComponente > 0
                ? Number(componente.costoTotal || 0) / cantidadComponente
                : NaN;

        if (componente.tipo === "INSUMO") {

            const insumo =
                insumos.find(i => String(i.id) === String(componente.insumoId)) ||
                insumos.find(i => coincideNombre(i, componente.componente));

            agregarStockConCosto(insumo, "costoPromedio", cantidadComponente, costoUnitario);

        }

        else if (componente.tipo === "PRODUCTO") {

            const componenteProducto =
                productos.find(p => coincideNombre(p, componente.componente));

            agregarStockConCosto(componenteProducto, "costoUnitario", cantidadComponente, costoUnitario);

        }

    });

    // La miel vuelve a la misma caneca de la que salió
    (produccion.canecasUsadas || []).forEach(usada => {

        const caneca =
            canecas.find(c => mismoNombre(c.id, usada.id));

        caneca.pesoDisponible =
            redondear(
                (Number(caneca.pesoDisponible || 0) * 1000 + Number(usada.gramos || 0)) / 1000
            );

    });

    marcarAnulado(produccion, motivo);

    localStorage.setItem("productos", JSON.stringify(productos));
    localStorage.setItem("insumos", JSON.stringify(insumos));
    localStorage.setItem("canecas", JSON.stringify(canecas));
    localStorage.setItem("producciones", JSON.stringify(producciones));

    alert("Producción anulada. Los materiales y la miel volvieron al inventario.");

    refrescarTodo();

}


/* ============================================================
   AJUSTES DE INVENTARIO
============================================================ */

const TIPOS_AJUSTE = {

    ROTURA: "ROTURA / DAÑO",

    MUESTRA: "MUESTRA O REGALO",

    MERMA: "MERMA",

    VENCIMIENTO: "VENCIMIENTO",

    CONTEO: "CONTEO FÍSICO"

};


function obtenerAjustes() {

    return JSON.parse(
        localStorage.getItem("ajustes")
    ) || [];

}


/*
   Datos comunes del ítem a ajustar.
   Las canecas se ajustan en kg; productos e insumos en su unidad.
*/

function datosItemAjuste(tipoItem, id) {

    if (tipoItem === "CANECA") {

        const lista =
            obtenerCanecas();

        const registro =
            lista.find(c => String(c.id) === String(id));

        if (!registro) {
            return null;
        }

        return {
            lista: lista,
            clave: "canecas",
            registro: registro,
            nombre: `${registro.id} - ${registro.tipoMiel}`,
            stock: Number(registro.pesoDisponible || 0),
            unidad: "kg",
            costoUnidad: Number(registro.costoGramo || 0) * 1000
        };

    }

    const clave =
        tipoItem === "PRODUCTO"
            ? "productos"
            : "insumos";

    const lista =
        JSON.parse(localStorage.getItem(clave)) || [];

    const registro =
        lista.find(r => String(r.id) === String(id));

    if (!registro) {
        return null;
    }

    return {
        lista: lista,
        clave: clave,
        registro: registro,
        nombre: registro.nombre,
        stock: Number(registro.stock || 0),
        unidad: registro.unidad || "",
        costoUnidad: Number(
            tipoItem === "PRODUCTO"
                ? registro.costoUnitario || 0
                : registro.costoPromedio || 0
        )
    };

}


function cargarItemsAjuste() {

    const tipo =
        document.getElementById("tipoItemAjuste");

    const select =
        document.getElementById("itemAjuste");

    if (!tipo || !select) return;

    const anterior =
        select.value;

    let opciones =
        [];

    if (tipo.value === "PRODUCTO") {

        opciones =
            obtenerProductos()
                .filter(estaActivo)
                .map(p => ({ valor: p.id, texto: p.nombre }));

    }

    else if (tipo.value === "INSUMO") {

        opciones =
            obtenerInsumos()
                .filter(estaActivo)
                .map(i => ({ valor: i.id, texto: `${i.nombre} (${i.unidad})` }));

    }

    else {

        opciones =
            obtenerCanecas()
                .filter(estaActivo)
                .map(c => ({ valor: c.id, texto: `${c.id} - ${c.tipoMiel}` }));

    }

    select.innerHTML =
        `<option value="">Seleccione un ítem</option>`;

    opciones.forEach(opcion => {

        const option =
            document.createElement("option");

        option.value = opcion.valor;
        option.textContent = opcion.texto;

        select.appendChild(option);

    });

    if (opciones.some(o => String(o.valor) === anterior)) {
        select.value = anterior;
    }

    mostrarInfoItemAjuste();

}


function mostrarInfoItemAjuste() {

    const tipoItem =
        document.getElementById("tipoItemAjuste");

    if (!tipoItem) return;

    const id =
        document.getElementById("itemAjuste").value;

    const tipoAjuste =
        document.getElementById("tipoAjuste").value;

    const datos =
        id
            ? datosItemAjuste(tipoItem.value, id)
            : null;

    const unidad =
        tipoItem.value === "CANECA"
            ? "kg"
            : datos
                ? datos.unidad
                : "";

    const etiqueta =
        document.getElementById("etiquetaCantidadAjuste");

    if (etiqueta) {

        etiqueta.textContent =
            (
                tipoAjuste === "CONTEO"
                    ? "Cantidad contada"
                    : "Cantidad a descontar"
            ) +
            (unidad ? ` (${unidad})` : "");

    }

    const info =
        document.getElementById("infoItemAjuste");

    if (info) {

        info.textContent =
            datos
                ? `Existencia actual en el sistema: ${formatoNumero(redondear(datos.stock, 3))} ${datos.unidad}`
                : "";

    }

}


function registrarAjuste() {

    const fecha =
        document.getElementById("fechaAjuste").value;

    const tipoItem =
        document.getElementById("tipoItemAjuste").value;

    const id =
        document.getElementById("itemAjuste").value;

    const tipoAjuste =
        document.getElementById("tipoAjuste").value;

    const observacion =
        document.getElementById("observacionAjuste").value
            .trim()
            .toUpperCase();

    if (!fecha) {
        alert("Seleccione la fecha.");
        return;
    }

    if (!id) {
        alert("Seleccione el ítem a ajustar.");
        return;
    }

    const datos =
        datosItemAjuste(tipoItem, id);

    if (!datos) {
        alert("No se encontró el ítem.");
        return;
    }

    const cantidad =
        leerNumeroCampo(
            "cantidadAjuste",
            tipoItem === "CANECA"
                ? { puntoDecimal: true }
                : {}
        );

    if (
        !numeroValido(cantidad) ||
        cantidad < 0
    ) {
        alert("Ingrese una cantidad válida.");
        return;
    }

    const antes =
        datos.stock;

    let despues;

    if (tipoAjuste === "CONTEO") {

        despues = cantidad;

    }

    else {

        if (cantidad <= 0) {
            alert("La cantidad a descontar debe ser mayor que 0.");
            return;
        }

        if (cantidad > antes + 0.000001) {

            alert(
                "No se puede descontar más de lo que hay.\n\n" +
                `Existencia actual: ${formatoNumero(redondear(antes, 3))} ${datos.unidad}`
            );

            return;

        }

        despues = antes - cantidad;

    }

    despues =
        redondear(despues);

    const diferencia =
        redondear(despues - antes);

    if (diferencia === 0) {
        alert("La cantidad contada coincide con el sistema. No hay nada que ajustar.");
        return;
    }

    const valor =
        diferencia * datos.costoUnidad;

    const confirmar =
        confirm(
            `Ajuste de ${datos.nombre} (${TIPOS_AJUSTE[tipoAjuste]})\n\n` +
            `Antes: ${formatoNumero(redondear(antes, 3))} ${datos.unidad}\n` +
            `Después: ${formatoNumero(redondear(despues, 3))} ${datos.unidad}\n` +
            `Diferencia: ${diferencia > 0 ? "+" : ""}${formatoNumero(redondear(diferencia, 3))} ${datos.unidad}\n` +
            `Valor: ${formatoMoneda(redondear(valor, 2))}\n\n` +
            "¿Registrar el ajuste?"
        );

    if (!confirmar) {
        return;
    }

    if (tipoItem === "CANECA") {
        datos.registro.pesoDisponible = despues;
    }

    else {
        datos.registro.stock = despues;
    }

    localStorage.setItem(datos.clave, JSON.stringify(datos.lista));

    const ajustes =
        obtenerAjustes();

    ajustes.push({

        id: nuevoId(),

        fecha: fecha,

        tipoItem: tipoItem,

        itemId: datos.registro.id,

        itemNombre: datos.nombre,

        tipoAjuste: tipoAjuste,

        tipoAjusteNombre: TIPOS_AJUSTE[tipoAjuste],

        unidad: datos.unidad,

        cantidadAnterior: antes,

        cantidadNueva: despues,

        diferencia: diferencia,

        costoUnitario: datos.costoUnidad,

        valor: valor,

        observacion: observacion

    });

    localStorage.setItem("ajustes", JSON.stringify(ajustes));

    document.getElementById("cantidadAjuste").value = "";
    document.getElementById("observacionAjuste").value = "";

    alert("Ajuste registrado correctamente.");

    refrescarTodo();

}


function mostrarAjustes() {

    const tabla =
        document.getElementById("tablaAjustes");

    if (!tabla) return;

    const ajustes =
        obtenerAjustes();

    tabla.innerHTML = "";

    ajustes.forEach(ajuste => {

        const fila =
            document.createElement("tr");

        const diferencia =
            Number(ajuste.diferencia || 0);

        fila.innerHTML = `

            <td>${escaparTexto(ajuste.fecha)}</td>

            <td>
                ${escaparTexto(ajuste.itemNombre)}
                <br><small>${escaparTexto(ajuste.tipoItem)}</small>
            </td>

            <td>${escaparTexto(ajuste.tipoAjusteNombre || ajuste.tipoAjuste)}</td>

            <td>${formatoNumero(redondear(ajuste.cantidadAnterior, 3))} ${escaparTexto(ajuste.unidad)}</td>

            <td>${diferencia > 0 ? "+" : ""}${formatoNumero(redondear(diferencia, 3))}</td>

            <td>${formatoNumero(redondear(ajuste.cantidadNueva, 3))} ${escaparTexto(ajuste.unidad)}</td>

            <td>${formatoMoneda(redondear(ajuste.valor, 2))}</td>

            <td>${escaparTexto(ajuste.observacion || "")}</td>

        `;

        tabla.appendChild(fila);

    });

    if (ajustes.length === 0) {

        tabla.innerHTML =
            `<tr><td colspan="8">No hay ajustes registrados.</td></tr>`;

    }

}


/* ============================================================
   KARDEX

   Reúne todas las entradas y salidas de un ítem desde los
   historiales (compras, producción, ventas, ajustes y
   anulaciones) y calcula el saldo después de cada una.
============================================================ */

function movimientoKardex(fecha, orden, tipo, referencia, entrada, salida) {

    return {
        fecha: fecha || "",
        orden: Number(orden) || 0,
        movimiento: tipo,
        referencia: referencia || "",
        entrada: Number(entrada) || 0,
        salida: Number(salida) || 0
    };

}


function referenciaProduccion(produccion) {

    return String(produccion.producto || "") +
        (produccion.lote ? ` · Lote ${produccion.lote}` : "");

}


/*
   Cantidad de un componente consumida en una producción.
   Las producciones antiguas sin detalle se calculan con la
   receta que existía en ese momento.
*/

function cantidadConsumidaEnProduccion(produccion, tipo, registro, recetas) {

    if (Array.isArray(produccion.componentes)) {

        return produccion.componentes
            .filter(
                c =>
                    c.tipo === tipo &&
                    coincideNombre(registro, c.componente)
            )
            .reduce((total, c) => total + Number(c.cantidad || 0), 0);

    }

    return recetas
        .filter(
            r =>
                r.tipo === tipo &&
                coincideNombre(registro, r.componente) &&
                mismoNombre(r.producto, produccion.producto) &&
                Number(r.id) <= Number(produccion.id)
        )
        .reduce(
            (total, r) =>
                total + Number(r.cantidad || 0) * Number(produccion.cantidad || 0),
            0
        );

}


function movimientosAjustesKardex(tipoItem, registro) {

    return obtenerAjustes()
        .filter(
            a =>
                a.tipoItem === tipoItem &&
                String(a.itemId).toUpperCase() === String(registro.id).toUpperCase()
        )
        .map(a => {

            const diferencia =
                Number(a.diferencia || 0);

            return movimientoKardex(
                a.fecha,
                a.id,
                `AJUSTE: ${a.tipoAjusteNombre || a.tipoAjuste}`,
                a.observacion,
                diferencia > 0 ? diferencia : 0,
                diferencia < 0 ? -diferencia : 0
            );

        });

}


function movimientosKardexProducto(producto) {

    const movimientos = [];

    const recetas = obtenerRecetas();

    obtenerProducciones().forEach(p => {

        // Entradas por producción del producto
        if (coincideNombre(producto, p.producto)) {

            const cantidad = Number(p.cantidad || 0);

            movimientos.push(
                movimientoKardex(p.fecha, p.id, "PRODUCCIÓN", p.lote ? `Lote ${p.lote}` : "", cantidad, 0)
            );

            if (p.anulada) {
                movimientos.push(
                    movimientoKardex(p.fechaAnulacion, p.anuladaEn, "ANULACIÓN DE PRODUCCIÓN", p.motivoAnulacion, 0, cantidad)
                );
            }

        }

        // Salidas por usarse como componente (ej: CAJA X3)
        const consumido =
            cantidadConsumidaEnProduccion(p, "PRODUCTO", producto, recetas);

        if (consumido > 0) {

            movimientos.push(
                movimientoKardex(p.fecha, p.id, "CONSUMO EN PRODUCCIÓN", referenciaProduccion(p), 0, consumido)
            );

            if (p.anulada) {
                movimientos.push(
                    movimientoKardex(p.fechaAnulacion, p.anuladaEn, "ANULACIÓN DE PRODUCCIÓN", p.motivoAnulacion, consumido, 0)
                );
            }

        }

    });

    obtenerVentas().forEach(v => {

        const cantidad =
            itemsDeVenta(v)
                .filter(i => coincideNombre(producto, i.producto))
                .reduce((total, i) => total + Number(i.cantidad || 0), 0);

        if (cantidad <= 0) return;

        movimientos.push(
            movimientoKardex(v.fecha, v.id, "VENTA", v.tercero, 0, cantidad)
        );

        if (v.anulada) {
            movimientos.push(
                movimientoKardex(v.fechaAnulacion, v.anuladaEn, "ANULACIÓN DE VENTA", v.motivoAnulacion, cantidad, 0)
            );
        }

    });

    return movimientos.concat(
        movimientosAjustesKardex("PRODUCTO", producto)
    );

}


function movimientosKardexInsumo(insumo) {

    const movimientos = [];

    const recetas = obtenerRecetas();

    obtenerCompras().forEach(c => {

        if (c.tipo !== "INSUMO") return;

        const coincide =
            c.insumoId !== undefined
                ? String(c.insumoId) === String(insumo.id)
                : coincideNombre(insumo, c.producto);

        if (!coincide) return;

        const cantidad = Number(c.cantidad || 0);

        movimientos.push(
            movimientoKardex(c.fecha, c.id, "COMPRA", c.proveedor, cantidad, 0)
        );

        if (c.anulada) {
            movimientos.push(
                movimientoKardex(c.fechaAnulacion, c.anuladaEn, "ANULACIÓN DE COMPRA", c.motivoAnulacion, 0, cantidad)
            );
        }

    });

    obtenerProducciones().forEach(p => {

        const consumido =
            cantidadConsumidaEnProduccion(p, "INSUMO", insumo, recetas);

        if (consumido <= 0) return;

        movimientos.push(
            movimientoKardex(p.fecha, p.id, "CONSUMO EN PRODUCCIÓN", referenciaProduccion(p), 0, consumido)
        );

        if (p.anulada) {
            movimientos.push(
                movimientoKardex(p.fechaAnulacion, p.anuladaEn, "ANULACIÓN DE PRODUCCIÓN", p.motivoAnulacion, consumido, 0)
            );
        }

    });

    obtenerVentas().forEach(v => {

        let cantidad = 0;

        if (Array.isArray(v.empaqueComponentes)) {

            cantidad =
                v.empaqueComponentes
                    .filter(c => String(c.insumoId) === String(insumo.id))
                    .reduce((total, c) => total + Number(c.cantidad ?? v.cantidad ?? 0), 0);

        }

        else if (
            (PIEZAS_EMPAQUE[v.empaque] || []).some(
                pieza => insumoCorrespondeAPieza(insumo.nombre, pieza)
            )
        ) {

            // Venta antigua: un empaque por unidad
            cantidad = Number(v.cantidad || 0);

        }

        if (cantidad <= 0) return;

        movimientos.push(
            movimientoKardex(v.fecha, v.id, "EMPAQUE EN VENTA", v.tercero, 0, cantidad)
        );

        if (v.anulada) {
            movimientos.push(
                movimientoKardex(v.fechaAnulacion, v.anuladaEn, "ANULACIÓN DE VENTA", v.motivoAnulacion, cantidad, 0)
            );
        }

    });

    return movimientos.concat(
        movimientosAjustesKardex("INSUMO", insumo)
    );

}


function movimientosKardexCaneca(caneca) {

    const movimientos = [];

    const id =
        String(caneca.id).toUpperCase();

    const pesoInicial =
        Number(caneca.pesoInicial || 0);

    const compra =
        obtenerCompras().find(
            c =>
                c.tipo === "CANECA" &&
                (
                    String(c.canecaId || "").toUpperCase() === id ||
                    String(c.producto || "").toUpperCase().startsWith(id + " - ")
                )
        );

    const entrada =
        compra
            ? movimientoKardex(compra.fecha, compra.id, "COMPRA", compra.proveedor, pesoInicial, 0)
            : movimientoKardex("", 0, "EXISTENCIA INICIAL", caneca.proveedor, pesoInicial, 0);

    movimientos.push(entrada);

    if (compra && compra.anulada) {
        movimientos.push(
            movimientoKardex(compra.fechaAnulacion, compra.anuladaEn, "ANULACIÓN DE COMPRA", compra.motivoAnulacion, 0, pesoInicial)
        );
    }

    obtenerProducciones().forEach(p => {

        if (!Array.isArray(p.canecasUsadas)) return;

        const gramos =
            p.canecasUsadas
                .filter(u => String(u.id).toUpperCase() === id)
                .reduce((total, u) => total + Number(u.gramos || 0), 0);

        if (gramos <= 0) return;

        const kg = gramos / 1000;

        movimientos.push(
            movimientoKardex(p.fecha, p.id, "CONSUMO EN PRODUCCIÓN", referenciaProduccion(p), 0, kg)
        );

        if (p.anulada) {
            movimientos.push(
                movimientoKardex(p.fechaAnulacion, p.anuladaEn, "ANULACIÓN DE PRODUCCIÓN", p.motivoAnulacion, kg, 0)
            );
        }

    });

    movimientos.push(
        ...movimientosAjustesKardex("CANECA", caneca)
    );

    // Producciones registradas antes de la trazabilidad por caneca
    const calculado =
        movimientos.reduce((total, m) => total + m.entrada - m.salida, 0);

    const diferencia =
        redondear(calculado - Number(caneca.pesoDisponible || 0));

    if (Math.abs(diferencia) > 0.000001) {

        movimientos.push(
            movimientoKardex(
                entrada.fecha,
                entrada.orden + 1,
                "CONSUMO SIN DETALLE (REGISTROS ANTERIORES)",
                "",
                diferencia < 0 ? -diferencia : 0,
                diferencia > 0 ? diferencia : 0
            )
        );

    }

    return movimientos;

}


function obtenerKardex(tipoItem, id) {

    const lista =
        tipoItem === "PRODUCTO"
            ? obtenerProductos()
            : tipoItem === "INSUMO"
                ? obtenerInsumos()
                : obtenerCanecas();

    const registro =
        lista.find(r => String(r.id) === String(id));

    if (!registro) {
        return null;
    }

    let movimientos;
    let saldoInicial = 0;
    let saldoActual;
    let unidad;

    if (tipoItem === "CANECA") {

        movimientos = movimientosKardexCaneca(registro);
        saldoActual = Number(registro.pesoDisponible || 0);
        unidad = "kg";

    }

    else {

        movimientos =
            tipoItem === "PRODUCTO"
                ? movimientosKardexProducto(registro)
                : movimientosKardexInsumo(registro);

        saldoActual = Number(registro.stock || 0);
        unidad = registro.unidad || "";

        // Lo que no explican los historiales es el stock inicial registrado al crear el ítem
        const entradas = movimientos.reduce((t, m) => t + m.entrada, 0);
        const salidas = movimientos.reduce((t, m) => t + m.salida, 0);

        saldoInicial = redondear(saldoActual - entradas + salidas);

    }

    movimientos.sort(
        (a, b) =>
            a.fecha < b.fecha
                ? -1
                : a.fecha > b.fecha
                    ? 1
                    : a.orden - b.orden
    );

    let saldo = saldoInicial;

    const filas =
        movimientos.map(m => {
            saldo = redondear(saldo + m.entrada - m.salida);
            return { ...m, saldo: saldo };
        });

    return {
        registro: registro,
        unidad: unidad,
        saldoInicial: saldoInicial,
        saldoActual: saldoActual,
        filas: filas
    };

}


function cargarItemsKardex() {

    const tipo =
        document.getElementById("tipoItemKardex");

    const select =
        document.getElementById("itemKardex");

    if (!tipo || !select) return;

    const anterior =
        select.value;

    let opciones = [];

    if (tipo.value === "PRODUCTO") {

        opciones =
            obtenerProductos().map(p => ({
                valor: p.id,
                texto: p.nombre + (estaActivo(p) ? "" : " (INACTIVO)")
            }));

    }

    else if (tipo.value === "INSUMO") {

        opciones =
            obtenerInsumos().map(i => ({
                valor: i.id,
                texto: `${i.nombre} (${i.unidad})` + (estaActivo(i) ? "" : " (INACTIVO)")
            }));

    }

    else {

        opciones =
            obtenerCanecas().map(c => ({
                valor: c.id,
                texto: `${c.id} - ${c.tipoMiel}` + (estaActivo(c) ? "" : " (INACTIVA)")
            }));

    }

    select.innerHTML =
        `<option value="">Seleccione un ítem</option>`;

    opciones.forEach(opcion => {

        const option =
            document.createElement("option");

        option.value = opcion.valor;
        option.textContent = opcion.texto;

        select.appendChild(option);

    });

    if (opciones.some(o => String(o.valor) === anterior)) {
        select.value = anterior;
    }

    mostrarKardex();

}


function mostrarKardex() {

    const tabla =
        document.getElementById("tablaKardex");

    const resumen =
        document.getElementById("resumenKardex");

    if (!tabla) return;

    const tipo =
        document.getElementById("tipoItemKardex").value;

    const id =
        document.getElementById("itemKardex").value;

    if (!id) {

        tabla.innerHTML =
            `<tr><td colspan="6">Seleccione un ítem para ver sus movimientos.</td></tr>`;

        if (resumen) resumen.textContent = "";

        return;

    }

    const kardex =
        obtenerKardex(tipo, id);

    if (!kardex) {
        tabla.innerHTML = `<tr><td colspan="6">No se encontró el ítem.</td></tr>`;
        return;
    }

    const desde =
        document.getElementById("desdeKardex").value;

    const hasta =
        document.getElementById("hastaKardex").value;

    // Los movimientos anteriores al rango se resumen en "SALDO ANTERIOR"
    let saldoAnterior =
        kardex.saldoInicial;

    const visibles = [];

    kardex.filas.forEach(fila => {

        const fecha =
            fila.fecha || "0000-00-00";

        if (desde && fecha < desde) {
            saldoAnterior = fila.saldo;
            return;
        }

        if (hasta && fecha > hasta) {
            return;
        }

        visibles.push(fila);

    });

    const u =
        escaparTexto(kardex.unidad);

    const numero = valor =>
        formatoNumero(redondear(valor, 3));

    let html = "";

    if (desde) {

        html += `<tr><td>—</td><td><strong>SALDO ANTERIOR</strong></td><td></td><td></td><td></td><td><strong>${numero(saldoAnterior)} ${u}</strong></td></tr>`;

    }

    else if (tipo !== "CANECA") {

        html += `<tr><td>—</td><td><strong>SALDO INICIAL</strong></td><td>Stock registrado al crear el ítem</td><td></td><td></td><td><strong>${numero(kardex.saldoInicial)} ${u}</strong></td></tr>`;

    }

    visibles.forEach(fila => {

        html += `
            <tr>
                <td>${escaparTexto(fila.fecha || "—")}</td>
                <td>${escaparTexto(fila.movimiento)}</td>
                <td>${escaparTexto(fila.referencia)}</td>
                <td>${fila.entrada > 0 ? numero(fila.entrada) : ""}</td>
                <td>${fila.salida > 0 ? numero(fila.salida) : ""}</td>
                <td>${numero(fila.saldo)} ${u}</td>
            </tr>
        `;

    });

    if (visibles.length === 0) {
        html += `<tr><td colspan="6">No hay movimientos en el período.</td></tr>`;
    }

    tabla.innerHTML = html;

    if (resumen) {

        const entradas = visibles.reduce((t, f) => t + f.entrada, 0);
        const salidas = visibles.reduce((t, f) => t + f.salida, 0);

        const nombre =
            tipo === "CANECA"
                ? `${kardex.registro.id} - ${kardex.registro.tipoMiel}`
                : kardex.registro.nombre;

        resumen.textContent =
            `${nombre} · Entradas: ${numero(entradas)} · Salidas: ${numero(salidas)} · Saldo actual: ${numero(kardex.saldoActual)} ${kardex.unidad}`;

    }

}


/* ============================================================
   REPORTES
============================================================ */

function enRangoFechas(fecha, desde, hasta) {

    if (!fecha) {
        return !desde;
    }

    if (desde && fecha < desde) return false;

    if (hasta && fecha > hasta) return false;

    return true;

}


function primerDiaDelMes() {

    return obtenerFechaActual().slice(0, 8) + "01";

}


function mostrarReportes() {

    const campoDesde =
        document.getElementById("desdeReporte");

    if (!campoDesde) return;

    const desde =
        campoDesde.value;

    const hasta =
        document.getElementById("hastaReporte").value;

    if (desde && hasta && desde > hasta) {
        alert("La fecha inicial no puede ser mayor que la final.");
        return;
    }

    const ventas =
        obtenerVentas().filter(
            v => !v.anulada && enRangoFechas(v.fecha, desde, hasta)
        );

    let totalVentas = 0;
    let totalCosto = 0;
    let porCobrar = 0;
    let costoEmpaques = 0;

    const porProducto = {};
    const porCanal = {};

    ventas.forEach(venta => {

        totalVentas += Number(venta.totalVenta || 0);
        totalCosto += Number(venta.costoTotal || 0);
        porCobrar += saldoDeVenta(venta);
        costoEmpaques += costoEmpaqueDeVenta(venta);

        itemsDeVenta(venta).forEach(item => {

            const clave =
                String(item.producto).toUpperCase();

            if (!porProducto[clave]) {
                porProducto[clave] = { producto: item.producto, unidades: 0, ventas: 0, costo: 0 };
            }

            porProducto[clave].unidades += Number(item.cantidad || 0);
            porProducto[clave].ventas += Number(item.total || 0);
            porProducto[clave].costo += Number(item.costoTotal || 0);

        });

        const canal =
            canalDeVenta(venta);

        if (!porCanal[canal]) {
            porCanal[canal] = { canal: canal, numero: 0, ventas: 0, costo: 0 };
        }

        porCanal[canal].numero += 1;
        porCanal[canal].ventas += Number(venta.totalVenta || 0);
        porCanal[canal].costo += Number(venta.costoTotal || 0);

    });

    const ganancia =
        totalVentas - totalCosto;

    const margen = valor =>
        valor.ventas > 0
            ? `${formatoNumero(redondear((valor.ventas - valor.costo) / valor.ventas * 100, 1))}%`
            : "—";

    const compras =
        obtenerCompras()
            .filter(c => !c.anulada && enRangoFechas(c.fecha, desde, hasta))
            .reduce((t, c) => t + Number(c.total || 0), 0);

    const produccion =
        obtenerProducciones()
            .filter(p => !p.anulada && enRangoFechas(p.fecha, desde, hasta))
            .reduce((t, p) => t + Number(p.costoTotal || 0), 0);

    const perdidas =
        obtenerAjustes()
            .filter(a => enRangoFechas(a.fecha, desde, hasta) && Number(a.valor) < 0)
            .reduce((t, a) => t - Number(a.valor || 0), 0);

    const poner = (id, texto) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = texto;
    };

    poner("repVentas", formatoMoneda(redondear(totalVentas, 2)));
    poner("repCosto", formatoMoneda(redondear(totalCosto, 2)));
    poner("repGanancia", formatoMoneda(redondear(ganancia, 2)));
    poner("repMargen", margen({ ventas: totalVentas, costo: totalCosto }));
    poner("repPorCobrar", formatoMoneda(redondear(porCobrar, 2)));
    poner("repCompras", formatoMoneda(redondear(compras, 2)));
    poner("repProduccion", formatoMoneda(redondear(produccion, 2)));
    poner("repPerdidas", formatoMoneda(redondear(perdidas, 2)));

    /* Ventas por producto */

    const tablaProductos =
        document.getElementById("tablaReporteProductos");

    if (tablaProductos) {

        const filas =
            Object.values(porProducto)
                .sort((a, b) => b.ventas - a.ventas);

        let html =
            filas.map(f => `
                <tr>
                    <td>${escaparTexto(f.producto)}</td>
                    <td>${formatoNumero(f.unidades)}</td>
                    <td>${formatoMoneda(redondear(f.ventas, 2))}</td>
                    <td>${formatoMoneda(redondear(f.costo, 2))}</td>
                    <td>${formatoMoneda(redondear(f.ventas - f.costo, 2))}</td>
                    <td>${margen(f)}</td>
                </tr>
            `).join("");

        if (filas.length > 0) {

            html += `
                <tr>
                    <td>EMPAQUES DE ENVÍO</td>
                    <td>—</td>
                    <td>—</td>
                    <td>${formatoMoneda(redondear(costoEmpaques, 2))}</td>
                    <td>${formatoMoneda(redondear(-costoEmpaques, 2))}</td>
                    <td>—</td>
                </tr>
                <tr>
                    <td><strong>TOTAL</strong></td>
                    <td><strong>${formatoNumero(filas.reduce((t, f) => t + f.unidades, 0))}</strong></td>
                    <td><strong>${formatoMoneda(redondear(totalVentas, 2))}</strong></td>
                    <td><strong>${formatoMoneda(redondear(totalCosto, 2))}</strong></td>
                    <td><strong>${formatoMoneda(redondear(ganancia, 2))}</strong></td>
                    <td><strong>${margen({ ventas: totalVentas, costo: totalCosto })}</strong></td>
                </tr>
            `;

        }

        tablaProductos.innerHTML =
            html || `<tr><td colspan="6">No hay ventas en el período.</td></tr>`;

    }

    /* Ventas por canal */

    const tablaCanales =
        document.getElementById("tablaReporteCanales");

    if (tablaCanales) {

        const filas =
            Object.values(porCanal)
                .sort((a, b) => b.ventas - a.ventas);

        tablaCanales.innerHTML =
            filas.map(f => `
                <tr>
                    <td>${escaparTexto(f.canal)}</td>
                    <td>${formatoNumero(f.numero)}</td>
                    <td>${formatoMoneda(redondear(f.ventas, 2))}</td>
                    <td>${formatoMoneda(redondear(f.costo, 2))}</td>
                    <td>${formatoMoneda(redondear(f.ventas - f.costo, 2))}</td>
                    <td>${margen(f)}</td>
                </tr>
            `).join("") ||
            `<tr><td colspan="6">No hay ventas en el período.</td></tr>`;

    }

}


/* ============================================================
   INICIO: ALERTAS
============================================================ */

/*
   Stock bajo y canecas por agotarse se muestran en óxido
   (urgente); cobros y respaldo en oliva (aviso).
*/

function claseAlerta(html) {

    return html.startsWith("<strong>Stock bajo") ||
        html.startsWith("<strong>Caneca")
            ? "alerta-urgente"
            : "alerta-aviso";

}


function mostrarAlertasInicio() {

    const contenedor =
        document.getElementById("alertasInicio");

    if (!contenedor) return;

    const alertas = [];

    obtenerProductos()
        .filter(estaActivo)
        .forEach(p => {

            if (Number(p.stock || 0) <= Number(p.stockMinimo || 0)) {

                alertas.push(
                    `<strong>Stock bajo</strong> — PRODUCTO ${escaparTexto(p.nombre)}: ` +
                    `${formatoNumero(p.stock || 0)} ${escaparTexto(p.unidad || "")} (mínimo ${formatoNumero(p.stockMinimo || 0)})`
                );

            }

        });

    obtenerInsumos()
        .filter(estaActivo)
        .forEach(i => {

            if (Number(i.stock || 0) <= Number(i.stockMinimo || 0)) {

                alertas.push(
                    `<strong>Stock bajo</strong> — INSUMO ${escaparTexto(i.nombre)}: ` +
                    `${formatoNumero(redondear(i.stock || 0, 3))} ${escaparTexto(i.unidad || "")} (mínimo ${formatoNumero(i.stockMinimo || 0)})`
                );

            }

        });

    // Canecas con 20% o menos de su peso inicial
    obtenerCanecas()
        .filter(estaActivo)
        .forEach(c => {

            const inicial = Number(c.pesoInicial || 0);
            const disponible = Number(c.pesoDisponible || 0);

            if (
                inicial > 0 &&
                disponible > 0 &&
                disponible <= inicial * 0.2
            ) {

                alertas.push(
                    `<strong>Caneca por agotarse</strong> — ${escaparTexto(c.id)} (${escaparTexto(c.tipoMiel)}): ` +
                    `quedan ${formatoNumero(redondear(disponible, 3))} kg de ${formatoNumero(inicial)} kg`
                );

            }

        });

    const pendientes =
        obtenerVentas().filter(v => saldoDeVenta(v) > 0);

    if (pendientes.length > 0) {

        const total =
            pendientes.reduce((t, v) => t + saldoDeVenta(v), 0);

        alertas.push(
            `<strong>Cuentas por cobrar</strong> — ${pendientes.length} venta(s) con saldo pendiente por ${formatoMoneda(redondear(total, 2))}`
        );

    }

    // Recordatorio de respaldo (solo si ya hay información registrada)
    const hayDatos =
        CLAVES_RESPALDO.some(
            clave => (JSON.parse(localStorage.getItem(clave)) || []).length > 0
        );

    if (hayDatos) {

        const ultimo =
            localStorage.getItem("ultimoRespaldo");

        if (!ultimo) {

            alertas.push(
                "<strong>Respaldo</strong> — aún no se ha exportado un respaldo de los datos"
            );

        }

        else {

            const dias =
                Math.floor(
                    (new Date(obtenerFechaActual()) - new Date(ultimo)) / 86400000
                );

            if (dias > 7) {

                alertas.push(
                    `<strong>Respaldo</strong> — han pasado ${dias} días desde el último respaldo`
                );

            }

        }

    }

    contenedor.innerHTML =
        alertas.length > 0
            ? `<ul class="lista-alertas">${alertas.map(a => `<li class="${claseAlerta(a)}">${a}</li>`).join("")}</ul>`
            : `<p class="sin-alertas">Sin alertas. Todo en orden.</p>`;

}


/* ============================================================
   RESPALDO DE DATOS (EXPORTAR / IMPORTAR)
============================================================ */

const CLAVES_RESPALDO = [
    "productos",
    "insumos",
    "canecas",
    "recetas",
    "terceros",
    "compras",
    "producciones",
    "ventas",
    "ajustes"
];


function construirRespaldo() {

    const datos = {};

    CLAVES_RESPALDO.forEach(clave => {
        datos[clave] = JSON.parse(localStorage.getItem(clave)) || [];
    });

    return {
        sistema: "EUCAS - Control de Inventario",
        version: 1,
        fecha: new Date().toISOString(),
        datos: datos
    };

}


function exportarRespaldo() {

    const respaldo =
        construirRespaldo();

    const archivo =
        new Blob(
            [JSON.stringify(respaldo, null, 2)],
            { type: "application/json" }
        );

    const url =
        URL.createObjectURL(archivo);

    const enlace =
        document.createElement("a");

    enlace.href = url;
    enlace.download = `eucas-respaldo-${obtenerFechaActual()}.json`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    localStorage.setItem("ultimoRespaldo", obtenerFechaActual());

    mostrarEstadoRespaldo();

    mostrarAlertasInicio();

}


function importarRespaldo(evento) {

    const entrada =
        evento.target;

    const archivo =
        entrada.files && entrada.files[0];

    if (!archivo) return;

    const lector =
        new FileReader();

    lector.onload = () => {

        try {
            aplicarRespaldo(JSON.parse(lector.result));
        }

        catch (error) {
            alert("El archivo no es un respaldo válido de EUCAS.");
        }

        entrada.value = "";

    };

    lector.readAsText(archivo);

}


function aplicarRespaldo(contenido) {

    const datos =
        contenido && contenido.datos;

    const valido =
        datos &&
        typeof datos === "object" &&
        CLAVES_RESPALDO.some(clave => Array.isArray(datos[clave])) &&
        CLAVES_RESPALDO.every(
            clave => datos[clave] === undefined || Array.isArray(datos[clave])
        );

    if (!valido) {
        alert("El archivo no es un respaldo válido de EUCAS.");
        return false;
    }

    const cantidad = clave =>
        Array.isArray(datos[clave]) ? datos[clave].length : 0;

    const fechaRespaldo =
        contenido.fecha
            ? String(contenido.fecha).slice(0, 10)
            : "fecha desconocida";

    const confirmar =
        confirm(
            `Se reemplazarán TODOS los datos actuales por los del respaldo (${fechaRespaldo}):\n\n` +
            `• ${cantidad("productos")} productos\n` +
            `• ${cantidad("insumos")} insumos\n` +
            `• ${cantidad("canecas")} canecas\n` +
            `• ${cantidad("recetas")} componentes de receta\n` +
            `• ${cantidad("terceros")} terceros\n` +
            `• ${cantidad("compras")} compras, ${cantidad("producciones")} producciones, ${cantidad("ventas")} ventas, ${cantidad("ajustes")} ajustes\n\n` +
            "Recomendación: exporte primero un respaldo de los datos actuales.\n\n" +
            "¿Desea continuar?"
        );

    if (!confirmar) {
        return false;
    }

    CLAVES_RESPALDO.forEach(clave => {

        localStorage.setItem(
            clave,
            JSON.stringify(Array.isArray(datos[clave]) ? datos[clave] : [])
        );

    });

    limpiarPedidoVenta();

    alert("Respaldo importado correctamente.");

    refrescarTodo();

    return true;

}


function mostrarEstadoRespaldo() {

    const estado =
        document.getElementById("estadoRespaldo");

    if (!estado) return;

    const ultimo =
        localStorage.getItem("ultimoRespaldo");

    estado.textContent =
        ultimo
            ? `Último respaldo exportado: ${ultimo}`
            : "Aún no se ha exportado ningún respaldo. Los datos solo existen en este navegador.";

}


/* ============================================================
   REFRESCAR TODAS LAS VISTAS
============================================================ */

function refrescarTodo() {

    mostrarInventario();
    mostrarProductosGestion();
    mostrarCanecas();
    mostrarInsumos();
    mostrarRecetas();
    mostrarTerceros();
    mostrarCompras();
    mostrarProduccion();
    mostrarVentas();
    mostrarAjustes();

    cargarProveedoresCompra();
    cargarInsumosCompra();
    cargarProductosProduccion();
    cargarProductosVenta();
    cargarTercerosVenta();
    cargarItemsAjuste();
    cargarItemsKardex();

    mostrarLineasVenta();
    mostrarResumenProduccion();
    calcularTotalesVenta();

    actualizarResumenInicio();
    mostrarEstadoRespaldo();

    const reportes =
        document.getElementById("seccionReportes");

    if (reportes && reportes.style.display === "block") {
        mostrarReportes();
    }

}


/* ============================================================
   ELIMINAR / DESACTIVAR REGISTROS MANUALES

   Regla general:
   - Sin movimientos asociados: se elimina, previa
     confirmación.
   - Con movimientos (ventas, compras, producción):
     no se elimina. Se ofrece DESACTIVAR, que oculta
     el registro de los formularios pero lo conserva
     en las tablas y en los historiales.
   - Los historiales de compras, producción y ventas
     nunca se modifican.
============================================================ */

function cambiarEstadoRegistro(
    clave,
    id,
    activo
) {

    const registros =
        JSON.parse(
            localStorage.getItem(clave)
        ) || [];


    const registro =
        registros.find(
            r =>
                String(r.id) ===
                String(id)
        );


    if (!registro) {

        return false;

    }


    registro.activo =
        activo;


    if (activo) {

        delete registro.fechaInactivacion;

    }

    else {

        registro.fechaInactivacion =
            obtenerFechaActual();

    }


    localStorage.setItem(
        clave,
        JSON.stringify(registros)
    );


    return true;

}


function refrescarVistasInventario() {

    refrescarTodo();

}


function ofrecerDesactivacion(
    descripcion,
    motivos,
    clave,
    id,
    nota = ""
) {

    const aceptar =
        confirm(
            `No se puede eliminar ${descripcion} porque tiene movimientos asociados:\n\n` +
            motivos
                .map(m => "• " + m)
                .join("\n") +
            "\n\nPara no perder la trazabilidad puede DESACTIVARLO: dejará de aparecer en los formularios, pero se conservará en las tablas y en los historiales." +
            (nota ? "\n\n" + nota : "") +
            "\n\n¿Desea desactivarlo?"
        );


    if (!aceptar) {

        return;

    }


    cambiarEstadoRegistro(
        clave,
        id,
        false
    );


    alert(
        "Registro desactivado correctamente."
    );


    refrescarVistasInventario();

}


function reactivarRegistro(
    clave,
    id
) {

    const aceptar =
        confirm(
            "¿Desea reactivar este registro?\n\n" +
            "Volverá a estar disponible en los formularios."
        );


    if (!aceptar) {

        return;

    }


    cambiarEstadoRegistro(
        clave,
        id,
        true
    );


    alert(
        "Registro reactivado correctamente."
    );


    refrescarVistasInventario();

}


/* ------------------------------------------------------------
   DETECCIÓN DE MOVIMIENTOS
------------------------------------------------------------ */

/*
   ¿Esta producción consumió el componente indicado?
   Las producciones nuevas guardan el detalle. Para las
   anteriores se usa la receta que existía en ese momento
   (los IDs son fechas, así que una receta creada después
   de la producción no pudo intervenir en ella).
*/

function produccionUsoComponente(
    produccion,
    tipo,
    nombre,
    recetas
) {

    if (
        Array.isArray(produccion.componentes)
    ) {

        return produccion.componentes.some(
            c =>
                c.tipo === tipo &&
                mismoNombre(c.componente, nombre)
        );

    }


    return recetas.some(
        receta =>
            receta.tipo === tipo &&
            mismoNombre(receta.componente, nombre) &&
            mismoNombre(receta.producto, produccion.producto) &&
            Number(receta.id) <= Number(produccion.id)
    );

}


function recetaIntervinoEnProduccion(
    receta,
    produccion
) {

    if (
        !mismoNombre(
            produccion.producto,
            receta.producto
        )
    ) {

        return false;

    }


    if (
        Array.isArray(produccion.recetaIds)
    ) {

        return produccion.recetaIds.some(
            idReceta =>
                String(idReceta) ===
                String(receta.id)
        );

    }


    return Number(receta.id) <=
        Number(produccion.id);

}


function ventaUsoInsumo(
    venta,
    insumo
) {

    if (
        Array.isArray(venta.empaqueComponentes)
    ) {

        return venta.empaqueComponentes.some(
            c =>
                String(c.insumoId) ===
                String(insumo.id)
        );

    }


    return (PIEZAS_EMPAQUE[venta.empaque] || [])
        .some(
            pieza =>
                insumoCorrespondeAPieza(
                    insumo.nombre,
                    pieza
                )
        );

}


/* ------------------------------------------------------------
   ELIMINAR PRODUCTO
------------------------------------------------------------ */

function eliminarProducto(id) {

    const productos =
        obtenerProductos();


    const producto =
        productos.find(
            p =>
                String(p.id) ===
                String(id)
        );


    if (!producto) {

        alert(
            "No se encontró el producto."
        );

        return;

    }


    const nombre =
        producto.nombre;


    const recetas =
        obtenerRecetas();


    const producciones =
        obtenerProducciones();


    const ventas =
        obtenerVentas().filter(
            v =>
                itemsDeVenta(v).some(
                    i => coincideNombre(producto, i.producto)
                )
        ).length;


    const produccionesPropias =
        producciones.filter(
            p =>
                coincideNombre(producto, p.producto)
        ).length;


    const ajustesProducto =
        obtenerAjustes().filter(
            a =>
                a.tipoItem === "PRODUCTO" &&
                String(a.itemId) === String(producto.id)
        ).length;


    const consumos =
        producciones.filter(
            p =>
                produccionUsoComponente(
                    p,
                    "PRODUCTO",
                    nombre,
                    recetas
                )
        ).length;


    const recetasComoComponente =
        recetas.filter(
            r =>
                r.tipo === "PRODUCTO" &&
                mismoNombre(r.componente, nombre)
        );


    const recetasPropias =
        recetas.filter(
            r =>
                mismoNombre(r.producto, nombre)
        );


    const motivos =
        [];


    if (ventas > 0) {

        motivos.push(
            `${ventas} venta(s) registrada(s)`
        );

    }


    if (produccionesPropias > 0) {

        motivos.push(
            `${produccionesPropias} producción(es) registrada(s)`
        );

    }


    if (consumos > 0) {

        motivos.push(
            `se usó como componente en ${consumos} producción(es)`
        );

    }


    if (ajustesProducto > 0) {

        motivos.push(
            `${ajustesProducto} ajuste(s) de inventario`
        );

    }


    const productosQueLoUsan =
        [
            ...new Set(
                recetasComoComponente
                    .filter(estaActivo)
                    .map(r => r.producto)
            )
        ];


    if (motivos.length > 0) {

        ofrecerDesactivacion(
            `el producto ${nombre}`,
            motivos,
            "productos",
            producto.id,
            productosQueLoUsan.length > 0
                ? `Nota: es componente de ${productosQueLoUsan.join(", ")}. Mientras esté inactivo, ese producto no se podrá producir.`
                : ""
        );

        return;

    }


    if (recetasComoComponente.length > 0) {

        alert(
            `No se puede eliminar ${nombre} porque es componente de la receta de: ` +
            `${[...new Set(recetasComoComponente.map(r => r.producto))].join(", ")}.\n\n` +
            "Elimine primero ese componente en Recetas."
        );

        return;

    }


    let mensaje =
        `¿Está seguro de eliminar el producto ${nombre}?`;


    if (Number(producto.stock || 0) > 0) {

        mensaje +=
            `\n\nTiene ${formatoNumero(producto.stock)} en stock.`;

    }


    if (recetasPropias.length > 0) {

        mensaje +=
            `\n\nTambién se eliminarán los ${recetasPropias.length} componente(s) de su receta (nunca se usaron en producción).`;

    }


    mensaje +=
        "\n\nEsta acción no se puede deshacer.";


    if (!confirm(mensaje)) {

        return;

    }


    if (
        String(document.getElementById("idProductoEditando").value) ===
        String(producto.id)
    ) {

        cancelarEdicionProducto();

    }


    if (
        recetasPropias.some(
            r =>
                String(r.id) ===
                String(document.getElementById("idRecetaEditando").value)
        )
    ) {

        cancelarEdicionReceta();

    }


    localStorage.setItem(
        "productos",
        JSON.stringify(
            productos.filter(
                p =>
                    String(p.id) !==
                    String(producto.id)
            )
        )
    );


    if (recetasPropias.length > 0) {

        localStorage.setItem(
            "recetas",
            JSON.stringify(
                recetas.filter(
                    r =>
                        !mismoNombre(r.producto, nombre)
                )
            )
        );

    }


    alert(
        "Producto eliminado correctamente."
    );


    refrescarVistasInventario();

}


/* ------------------------------------------------------------
   ELIMINAR INSUMO
------------------------------------------------------------ */

function eliminarInsumo(id) {

    const insumos =
        obtenerInsumos();


    const insumo =
        insumos.find(
            i =>
                String(i.id) ===
                String(id)
        );


    if (!insumo) {

        alert(
            "No se encontró el insumo."
        );

        return;

    }


    const nombre =
        insumo.nombre;


    const recetas =
        obtenerRecetas();


    const compras =
        obtenerCompras().filter(
            c =>
                c.tipo === "INSUMO" &&
                (
                    String(c.insumoId) === String(insumo.id) ||
                    coincideNombre(insumo, c.producto)
                )
        ).length;


    const ajustesInsumo =
        obtenerAjustes().filter(
            a =>
                a.tipoItem === "INSUMO" &&
                String(a.itemId) === String(insumo.id)
        ).length;


    const producciones =
        obtenerProducciones().filter(
            p =>
                produccionUsoComponente(
                    p,
                    "INSUMO",
                    nombre,
                    recetas
                )
        ).length;


    const ventas =
        obtenerVentas().filter(
            v =>
                ventaUsoInsumo(v, insumo)
        ).length;


    const recetasQueLoUsan =
        recetas.filter(
            r =>
                r.tipo === "INSUMO" &&
                mismoNombre(r.componente, nombre)
        );


    const motivos =
        [];


    if (compras > 0) {

        motivos.push(
            `${compras} compra(s) registrada(s)`
        );

    }


    if (producciones > 0) {

        motivos.push(
            `se usó en ${producciones} producción(es)`
        );

    }


    if (ventas > 0) {

        motivos.push(
            `se usó como empaque en ${ventas} venta(s)`
        );

    }


    if (ajustesInsumo > 0) {

        motivos.push(
            `${ajustesInsumo} ajuste(s) de inventario`
        );

    }


    const productosQueLoUsan =
        [
            ...new Set(
                recetasQueLoUsan
                    .filter(estaActivo)
                    .map(r => r.producto)
            )
        ];


    if (motivos.length > 0) {

        ofrecerDesactivacion(
            `el insumo ${nombre}`,
            motivos,
            "insumos",
            insumo.id,
            productosQueLoUsan.length > 0
                ? `Nota: está en la receta de ${productosQueLoUsan.join(", ")}. Mientras esté inactivo, esos productos no se podrán producir.`
                : ""
        );

        return;

    }


    if (recetasQueLoUsan.length > 0) {

        alert(
            `No se puede eliminar ${nombre} porque está en la receta de: ` +
            `${[...new Set(recetasQueLoUsan.map(r => r.producto))].join(", ")}.\n\n` +
            "Elimine primero ese componente en Recetas."
        );

        return;

    }


    let mensaje =
        `¿Está seguro de eliminar el insumo ${nombre}?`;


    if (Number(insumo.stock || 0) > 0) {

        mensaje +=
            `\n\nTiene ${formatoNumero(insumo.stock)} en stock.`;

    }


    mensaje +=
        "\n\nEsta acción no se puede deshacer.";


    if (!confirm(mensaje)) {

        return;

    }


    if (
        String(document.getElementById("idInsumoEditando").value) ===
        String(insumo.id)
    ) {

        cancelarEdicionInsumo();

    }


    localStorage.setItem(
        "insumos",
        JSON.stringify(
            insumos.filter(
                i =>
                    String(i.id) !==
                    String(insumo.id)
            )
        )
    );


    alert(
        "Insumo eliminado correctamente."
    );


    refrescarVistasInventario();

}


/* ------------------------------------------------------------
   ELIMINAR CANECA
------------------------------------------------------------ */

function eliminarCaneca(id) {

    const canecas =
        obtenerCanecas();


    const caneca =
        canecas.find(
            c =>
                String(c.id) ===
                String(id)
        );


    if (!caneca) {

        alert(
            "No se encontró la caneca."
        );

        return;

    }


    const motivos =
        [];


    const usos =
        obtenerProducciones().filter(
            p =>
                Array.isArray(p.canecasUsadas) &&
                p.canecasUsadas.some(
                    c =>
                        String(c.id).toUpperCase() ===
                        String(caneca.id).toUpperCase()
                )
        ).length;


    const ajustesCaneca =
        obtenerAjustes().filter(
            a =>
                a.tipoItem === "CANECA" &&
                String(a.itemId).toUpperCase() ===
                String(caneca.id).toUpperCase()
        ).length;


    if (usos > 0) {

        motivos.push(
            `se utilizó en ${usos} producción(es)`
        );

    }


    if (ajustesCaneca > 0) {

        motivos.push(
            `${ajustesCaneca} ajuste(s) de inventario`
        );

    }

    else if (usos === 0 && canecaUsadaEnProduccion(caneca)) {

        const gramosConsumidos =
            Math.round(
                (
                    Number(caneca.pesoInicial || 0) -
                    Number(caneca.pesoDisponible || 0)
                ) *
                1000 *
                100
            ) / 100;


        motivos.push(
            `ya se consumieron ${formatoNumero(gramosConsumidos)} g en producción`
        );

    }


    if (canecaVieneDeCompra(caneca)) {

        motivos.push(
            "proviene de una compra registrada en el historial de COMPRAS"
        );

    }


    if (motivos.length > 0) {

        ofrecerDesactivacion(
            `la caneca ${caneca.id}`,
            motivos,
            "canecas",
            caneca.id,
            "La miel que le quede no se usará en nuevas producciones mientras esté inactiva."
        );

        return;

    }


    const confirmar =
        confirm(
            `¿Está seguro de eliminar la caneca ${caneca.id} (${caneca.tipoMiel})?\n\n` +
            "Es una existencia inicial que no se ha usado en producción.\n\n" +
            "Esta acción no se puede deshacer."
        );


    if (!confirmar) {

        return;

    }


    if (
        String(document.getElementById("idCanecaEditando").value) ===
        String(caneca.id)
    ) {

        cancelarEdicionCaneca();

    }


    localStorage.setItem(
        "canecas",
        JSON.stringify(
            canecas.filter(
                c =>
                    String(c.id) !==
                    String(caneca.id)
            )
        )
    );


    alert(
        "Caneca eliminada correctamente."
    );


    refrescarVistasInventario();

}


/* ------------------------------------------------------------
   ELIMINAR COMPONENTE DE RECETA
------------------------------------------------------------ */

function eliminarReceta(id) {

    const recetas =
        obtenerRecetas();


    const receta =
        recetas.find(
            r =>
                String(r.id) ===
                String(id)
        );


    if (!receta) {

        alert(
            "No se encontró el componente de la receta."
        );

        return;

    }


    const descripcion =
        `el componente ${receta.componente} de la receta de ${receta.producto}`;


    const producciones =
        obtenerProducciones().filter(
            p =>
                recetaIntervinoEnProduccion(
                    receta,
                    p
                )
        ).length;


    if (producciones > 0) {

        ofrecerDesactivacion(
            descripcion,
            [
                `intervino en ${producciones} producción(es) de ${receta.producto}`
            ],
            "recetas",
            receta.id,
            "Un componente inactivo no se usa en nuevas producciones; los demás componentes de la receta siguen igual."
        );

        return;

    }


    const confirmar =
        confirm(
            `¿Está seguro de eliminar ${descripcion}?\n\n` +
            "Solo se elimina este componente; los demás componentes de la receta se conservan.\n\n" +
            "Esta acción no se puede deshacer."
        );


    if (!confirmar) {

        return;

    }


    if (
        String(document.getElementById("idRecetaEditando").value) ===
        String(receta.id)
    ) {

        cancelarEdicionReceta();

    }


    localStorage.setItem(
        "recetas",
        JSON.stringify(
            recetas.filter(
                r =>
                    String(r.id) !==
                    String(receta.id)
            )
        )
    );


    alert(
        "Componente eliminado correctamente."
    );


    refrescarVistasInventario();

}


function reactivarReceta(id) {

    const recetas =
        obtenerRecetas();


    const receta =
        recetas.find(
            r =>
                String(r.id) ===
                String(id)
        );


    if (!receta) {

        alert(
            "No se encontró el componente de la receta."
        );

        return;

    }


    const duplicado =
        recetas.some(
            r =>
                estaActivo(r) &&
                String(r.id) !== String(receta.id) &&
                mismoNombre(r.producto, receta.producto) &&
                r.tipo === receta.tipo &&
                mismoNombre(r.componente, receta.componente)
        );


    if (duplicado) {

        alert(
            `La receta de ${receta.producto} ya tiene un componente activo ${receta.componente}.\n\n` +
            "Elimine o desactive ese componente antes de reactivar este."
        );

        return;

    }


    reactivarRegistro(
        "recetas",
        receta.id
    );

}


/* ============================================================
   BLOQUEAR CAMPOS CALCULADOS DE VENTA
============================================================ */

function bloquearCamposCalculadosVenta() {

    const campos = [

        "totalVenta",

        "costoUnitarioVenta",

        "costoTotalVenta",

        "gananciaVenta"

    ];


    campos.forEach(id => {

        const campo =
            document.getElementById(id);


        if (!campo) return;


        campo.readOnly =
            true;


        campo.disabled =
            false;


        campo.setAttribute(
            "readonly",
            "readonly"
        );

    });

}


/* ============================================================
   INICIALIZACIÓN
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /* ------------------------------------------------------
           CAMPOS CALCULADOS
        ------------------------------------------------------ */

        bloquearCamposCalculadosVenta();


        /* ------------------------------------------------------
           FECHAS
        ------------------------------------------------------ */

        const fechaActual =
            obtenerFechaActual();


        const fechaCompra =
            document.getElementById(
                "fechaCompra"
            );


        const fechaProduccion =
            document.getElementById(
                "fechaProduccion"
            );


        const fechaVenta =
            document.getElementById(
                "fechaVenta"
            );


        if (
            fechaCompra
        ) {

            fechaCompra.value =
                fechaActual;

        }


        if (
            fechaProduccion
        ) {

            fechaProduccion.value =
                fechaActual;

        }


        if (
            fechaVenta
        ) {

            fechaVenta.value =
                fechaActual;

        }


        /* ------------------------------------------------------
           TABLA DINÁMICA DE PRODUCTOS
        ------------------------------------------------------ */

        asegurarTablaProductosGestion();


        /* ------------------------------------------------------
           MOSTRAR DATOS
        ------------------------------------------------------ */

        mostrarInventario();

        mostrarProductosGestion();

        mostrarCanecas();

        mostrarInsumos();

        mostrarRecetas();

        mostrarTerceros();

        mostrarCompras();

        mostrarProduccion();

        mostrarVentas();


        /* ------------------------------------------------------
           CARGAR SELECTS
        ------------------------------------------------------ */

        cargarProveedoresCompra();

        cargarInsumosCompra();

        cargarProductosProduccion();

        cargarProductosVenta();

        cargarTercerosVenta();


        /* ------------------------------------------------------
           RESUMEN
        ------------------------------------------------------ */

        actualizarResumenInicio();


        /* ------------------------------------------------------
           MÓDULOS NUEVOS
        ------------------------------------------------------ */

        const fechaAjuste =
            document.getElementById("fechaAjuste");

        if (fechaAjuste) {
            fechaAjuste.value = fechaActual;
        }

        mostrarAjustes();

        cargarItemsAjuste();

        cargarItemsKardex();

        mostrarLineasVenta();

        cambiarEstadoPagoVenta();

        mostrarEstadoRespaldo();

        actualizarResumenVenta();


        /*
           Mensajes dentro de la página en lugar de la
           ventana del navegador (ver mostrarAviso).
        */

        window.alert = mostrarAviso;


        /*
           Aplicación instalable: modo sin internet y, en iPhone,
           la indicación de cómo agregarla a la pantalla de inicio.
        */

        registrarServiceWorker();

        if (esIPhone()) {
            mostrarTarjetaInstalar(true);
        }


        /*
           Cuando el usuario escribe en un campo que se llenó
           al editar, se vuelve a leer con el formato colombiano.
        */

        document.addEventListener(
            "input",
            evento => {
                if (evento.target && evento.target.dataset) {
                    delete evento.target.dataset.valorAsignado;
                }
            }
        );


        /* ------------------------------------------------------
           INICIO VISIBLE
        ------------------------------------------------------ */

        mostrarSeccion(
            "inicio"
        );

    }
);