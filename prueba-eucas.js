/* ============================================================
   EUCAS - SCRIPT DE PRUEBAS AUTOMÁTICAS

   CÓMO USARLO
   1. Abra la aplicación en Chrome.
   2. Presione F12 y vaya a la pestaña "Console".
   3. Pegue TODO este archivo y presione Enter.
      (Si Chrome no deja pegar, escriba primero: allow pasting)

   QUÉ HACE
   - Prueba todos los módulos con datos de ejemplo y muestra
     cada prueba como ✅ (bien) o ❌ (falló).
   - Al terminar DEJA CARGADOS los datos de la prueba para
     que pueda recorrer el sistema y verlos.

   SUS DATOS NO SE PIERDEN
   - Antes de empezar se descarga el archivo
     eucas-datos-antes-de-prueba-FECHA.json (carpeta Descargas)
     y se guarda además una copia dentro del navegador.
   - Para volver a sus datos cuando termine de revisar:
       a) En la misma página, escriba en la consola:
          restaurarDatosAntesDePrueba()
       b) Si ya cerró o recargó la página: pegue en la consola
          el archivo restaurar-datos.js y presione Enter.
       c) O bien: Inicio > Importar respaldo > elegir ese archivo.
   - Vuelva a sus datos ANTES de registrar información real:
     lo que se registre encima de los datos de prueba no se
     conserva al restaurar.
============================================================ */

(function pruebaEUCAS() {

    // true = al terminar quedan los datos de la prueba para revisarlos;
    // sus datos quedan guardados y vuelven con restaurarDatosAntesDePrueba().
    const DEJAR_DATOS_DE_PRUEBA = true;


    /*
       Vuelve a los datos que había antes de la primera prueba.
       Queda disponible en la consola: restaurarDatosAntesDePrueba()
    */

    window.restaurarDatosAntesDePrueba = function () {

        const copia = localStorage.getItem("eucasDatosAntesDePrueba");

        if (!copia) {
            console.log("No hay una copia guardada de los datos anteriores a la prueba.");
            return "Sin copia";
        }

        const datos = JSON.parse(copia);

        Object.keys(datos).forEach(k => {
            if (datos[k] === null) localStorage.removeItem(k);
            else localStorage.setItem(k, datos[k]);
        });

        localStorage.removeItem("eucasDatosAntesDePrueba");

        limpiarPedidoVenta();
        refrescarTodo();
        mostrarSeccion("inicio");

        console.log("Listo: se restauraron los datos que había antes de la prueba.");
        return "Datos restaurados";

    };


    const CLAVES = [
        "productos", "insumos", "canecas", "recetas", "terceros",
        "compras", "producciones", "ventas", "ajustes", "ultimoRespaldo",
        "comisionesPago"
    ];

    /* ---------- Guardar datos reales y funciones del navegador ---------- */

    const datosOriginales = {};
    CLAVES.forEach(k => { datosOriginales[k] = localStorage.getItem(k); });

    const habiaDatos =
        CLAVES.some(k => k !== "ultimoRespaldo" && (JSON.parse(datosOriginales[k] || "[]")).length > 0);

    let copiaNueva = false;

    /*
       Si la prueba va a dejar sus datos, primero se guardan los
       datos actuales. Si ya existe una copia (de una prueba
       anterior), se conserva esa: es la de los datos reales.
    */

    if (
        DEJAR_DATOS_DE_PRUEBA &&
        !localStorage.getItem("eucasDatosAntesDePrueba")
    ) {
        localStorage.setItem("eucasDatosAntesDePrueba", JSON.stringify(datosOriginales));
        copiaNueva = true;
    }

    if (copiaNueva && habiaDatos) {

        const respaldo = {
            sistema: "EUCAS - Control de Inventario",
            version: 1,
            fecha: new Date().toISOString(),
            datos: {}
        };

        CLAVES
            .filter(k => k !== "ultimoRespaldo")
            .forEach(k => { respaldo.datos[k] = JSON.parse(datosOriginales[k] || "[]"); });

        const archivo = new Blob([JSON.stringify(respaldo, null, 2)], { type: "application/json" });
        const enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(archivo);
        enlace.download = `eucas-datos-antes-de-prueba-${obtenerFechaActual()}.json`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

    }

    /*
       Copia de seguridad mientras corre la prueba: si algo la
       interrumpe, sus datos se recuperan con restaurarDatosAntesDePrueba().
       Al terminar bien, esta copia se borra.
    */

    let copiaDuranteLaPrueba = false;

    if (
        !DEJAR_DATOS_DE_PRUEBA &&
        habiaDatos &&
        !localStorage.getItem("eucasDatosAntesDePrueba")
    ) {
        localStorage.setItem("eucasDatosAntesDePrueba", JSON.stringify(datosOriginales));
        copiaDuranteLaPrueba = true;
    }

    const funcionesOriginales = {
        alert: window.alert,
        confirm: window.confirm,
        prompt: window.prompt
    };

    const avisos = [];
    let respuestaConfirm = true;
    let respuestaPrompt = "PRUEBA AUTOMÁTICA";

    window.alert = m => { avisos.push(String(m)); };
    window.confirm = m => { avisos.push(String(m)); return respuestaConfirm; };
    window.prompt = () => respuestaPrompt;

    const resultados = [];

    const ok = (condicion, descripcion) => {
        resultados.push({ ok: Boolean(condicion), descripcion });
    };

    const cerca = (a, b, tolerancia = 0.01) =>
        Math.abs(Number(a) - Number(b)) <= tolerancia;

    const $ = id => document.getElementById(id);

    // Escribe en un campo como si lo hiciera el usuario
    const escribir = (id, valor) => {
        const campo = $(id);
        campo.value = valor;
        campo.dispatchEvent(new Event(campo.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    };

    const leer = clave => JSON.parse(localStorage.getItem(clave) || "[]");
    const ultimoAviso = () => avisos[avisos.length - 1] || "";
    const buscar = (clave, nombre) => leer(clave).find(r => r.nombre === nombre);

    const hoy = obtenerFechaActual();
    const vence = (Number(hoy.slice(0, 4)) + 2) + hoy.slice(4);

    try {

        /* ======================================================
           0. EMPEZAR CON EL SISTEMA VACÍO
        ====================================================== */

        CLAVES.forEach(k => localStorage.removeItem(k));
        limpiarPedidoVenta();
        refrescarTodo();


        /* ======================================================
           1. LECTURA DE NÚMEROS
        ====================================================== */

        ok(convertirNumero(2.125) === 2.125, "Números: un valor guardado (2.125) no se convierte en 2125");
        ok(convertirNumero("2.125", { puntoDecimal: true }) === 2.125, "Números: costo por gramo 2.125 se lee como decimal");
        ok(convertirNumero("25.000") === 25000, "Números: precio 25.000 se sigue leyendo como 25000 (formato colombiano)");
        ok(convertirNumero("2,5") === 2.5 && convertirNumero("1.250,50") === 1250.5, "Números: 2,5 y 1.250,50 se leen bien");
        ok(formatoMoneda(13654.400000000001) === "$13.654,40" && formatoMoneda(16034.8) === "$16.034,80" && formatoMoneda(21000) === "$21.000", "Formato: los valores con centavos muestran siempre dos decimales ($16.034,80)");
        ok(formatoMoneda(-5000) === "-$5.000", "Formato: los negativos se muestran como -$5.000");


        /* ======================================================
           2. INSUMOS CON STOCK MÍNIMO
        ====================================================== */

        const insumo = (nombre, stock, minimo, costo) => {
            escribir("nombreInsumo", nombre);
            escribir("unidadInsumo", "UNIDAD");
            escribir("stockInsumo", stock);
            escribir("stockMinimoInsumo", minimo);
            escribir("costoInsumo", costo);
            registrarInsumo();
        };

        insumo("TARRO", 200, 20, 1000);
        insumo("TAPA", 200, 20, 300);
        insumo("ETIQUETA", 200, 20, 200);
        insumo("BOLSA", 50, 5, 500);
        insumo("CAJA DE ENVIO", 30, 40, 2000);   // sin tilde y por debajo del mínimo
        insumo("CERA", 50, 5, 3000);

        ok(leer("insumos").length === 6, "Insumos: se registran 6 insumos");
        ok(buscar("insumos", "TARRO").stockMinimo === 20, "Insumos: se guarda el stock mínimo");
        ok($("totalStockBajoInicio").textContent === "1", "Inicio: el indicador cuenta 1 insumo con stock bajo");
        ok($("alertasInicio").textContent.includes("CAJA DE ENVIO"), "Inicio: la alerta dice cuál insumo está bajo");


        /* ======================================================
           3. PRODUCTOS Y TERCEROS
        ====================================================== */

        const producto = (nombre, minimo) => {
            escribir("nombreProducto", nombre);
            escribir("tipoProducto", "PRODUCTO TERMINADO");
            escribir("stockProducto", 0);
            escribir("stockMinimo", minimo);
            registrarProducto();
        };

        producto("MIEL DE PÁRAMO ANDINO", 5);
        producto("VELAS DE CERA DE ABEJAS", 2);

        const tercero = (nombre, tipo) => {
            escribir("nombreTercero", nombre);
            escribir("telefonoTercero", "3001234567");
            escribir("contactoTercero", "CONTACTO");
            escribir("tipoTercero", tipo);
            registrarTercero();
        };

        tercero("APIARIOS DEL PARAMO", "PROVEEDOR");
        tercero("DISTRIBUIDORA ANDES", "DISTRIBUIDOR");
        tercero("CLIENTE FINAL", "DIRECTO");

        ok(leer("productos").length === 2 && leer("terceros").length === 3, "Productos y terceros registrados");


        /* ======================================================
           4. COMPRAS Y COSTO PROMEDIO
        ====================================================== */

        const compraInsumo = (nombre, cantidad, costo) => {
            escribir("fechaCompra", hoy);
            escribir("proveedorCompra", "APIARIOS DEL PARAMO");
            escribir("tipoCompra", "INSUMO");
            escribir("insumoCompra", nombre);
            escribir("cantidadCompra", cantidad);
            escribir("costoUnitarioCompra", costo);
            registrarCompra();
        };

        const compraCaneca = (id, peso, costoGramo) => {
            escribir("fechaCompra", hoy);
            escribir("proveedorCompra", "APIARIOS DEL PARAMO");
            escribir("tipoCompra", "CANECA");
            escribir("idCanecaCompra", id);
            escribir("tipoMielCompra", "MIEL DE PÁRAMO");
            escribir("pesoCanecaCompra", peso);
            escribir("costoGramoCompra", costoGramo);
            registrarCompra();
        };

        compraInsumo("TAPA", 200, "300.25");
        ok(buscar("insumos", "TAPA").stock === 400 && cerca(buscar("insumos", "TAPA").costoPromedio, 300.125, 0.0001),
            "Compras: costo promedio ponderado de TAPA = 300,125");

        // Editar y guardar sin cambios no debe dañar el costo (antes 300.125 se volvía 300125)
        editarInsumo(buscar("insumos", "TAPA").id);
        registrarInsumo();
        ok(cerca(buscar("insumos", "TAPA").costoPromedio, 300.125, 0.0001), "Números: editar un insumo conserva su costo 300,125");

        compraCaneca("", 30, "2.125");
        compraCaneca("", 25, "2.8");

        let canecas = leer("canecas");
        ok(canecas.length === 2 && canecas[0].id === "C001" && canecas[1].id === "C002", "Canecas: las compras crean C001 y C002 con ID automático");
        ok(canecas[0].costoGramo === 2.125, "Canecas: el costo por gramo 2.125 se guarda bien (antes quedaba 2125)");

        escribir("idCaneca", "");
        escribir("tipoMielCaneca", "MIEL DE PÁRAMO");
        escribir("pesoCaneca", 5);
        escribir("costoGramo", 3);
        escribir("proveedorCaneca", "INVENTARIO PREVIO");
        registrarCaneca();
        ok(leer("canecas").find(c => c.id === "C003").origen === "INICIAL", "Canecas: el registro directo crea C003 como existencia inicial");


        /* ======================================================
           5. RECETAS Y PRODUCCIÓN CON LOTE
        ====================================================== */

        const receta = (productoReceta, tipo, componente, cantidad) => {
            escribir("productoReceta", productoReceta);
            escribir("tipoComponente", tipo);
            escribir("componenteReceta", componente);
            escribir("cantidadReceta", cantidad);
            registrarReceta();
        };

        receta("MIEL DE PÁRAMO ANDINO", "MIEL", "MIEL DE PÁRAMO", 317);
        receta("MIEL DE PÁRAMO ANDINO", "INSUMO", "TARRO", 1);
        receta("MIEL DE PÁRAMO ANDINO", "INSUMO", "TAPA", 1);
        receta("MIEL DE PÁRAMO ANDINO", "INSUMO", "ETIQUETA", 1);
        receta("VELAS DE CERA DE ABEJAS", "INSUMO", "CERA", 1);

        const producir = (nombre, cantidad, lote = "", vencimiento = "") => {
            cargarProductosProduccion();
            escribir("fechaProduccion", hoy);
            escribir("productoProduccion", nombre);
            escribir("cantidadProduccion", cantidad);
            escribir("loteProduccion", lote);
            escribir("vencimientoProduccion", vencimiento);
            registrarProduccion();
        };

        producir("MIEL DE PÁRAMO ANDINO", 100, "", vence);
        producir("VELAS DE CERA DE ABEJAS", 10);

        const loteBase = "L" + hoy.replace(/-/g, "");
        const produccionMiel = leer("producciones")[0];

        ok(produccionMiel.lote === loteBase + "-01" && produccionMiel.fechaVencimiento === vence, "Producción: lote automático y fecha de vencimiento guardados");
        ok(leer("producciones")[1].lote === loteBase + "-02", "Producción: el segundo lote es consecutivo");
        ok(produccionMiel.canecasUsadas.length === 2 && produccionMiel.canecasUsadas[0].gramos === 30000, "Producción: toma 30.000 g de C001 y el resto de C002");

        const costoMiel = 30000 * 2.125 + 1700 * 2.8 + 100 * (1000 + 300.125 + 200);
        ok(cerca(produccionMiel.costoTotal, costoMiel), "Producción: costo total correcto (" + formatoMoneda(costoMiel) + ")");

        producir("VELAS DE CERA DE ABEJAS", 1, loteBase + "-01");
        ok(leer("producciones").length === 2 && ultimoAviso().includes("ya existe"), "Producción: no permite repetir un lote");


        /* ======================================================
           6. VENTA CON VARIOS PRODUCTOS Y PAGO PENDIENTE
        ====================================================== */

        const costoUnitMiel = costoMiel / 100;

        cargarProductosVenta();
        cargarTercerosVenta();
        escribir("fechaVenta", hoy);
        escribir("productoVenta", "MIEL DE PÁRAMO ANDINO");
        escribir("cantidadVenta", 3);
        escribir("precioVenta", 25000);
        agregarLineaVenta();

        ok($("tablaPedidoVenta").rows.length === 1 && $("productoVenta").value === "", "Ventas: el producto se agrega al pedido y el formulario queda listo para otro");

        escribir("productoVenta", "VELAS DE CERA DE ABEJAS");
        escribir("cantidadVenta", 2);
        escribir("precioVenta", 15000);
        escribir("terceroVenta", "DISTRIBUIDORA ANDES");
        escribir("empaqueVenta", "CAJA_BOLSA");
        escribir("cantidadEmpaquesVenta", 1);
        escribir("estadoPagoVenta", "PENDIENTE");
        escribir("abonoInicialVenta", "30.000");
        calcularTotalesVenta();

        const costoPedido = 3 * costoUnitMiel + 2 * 3000 + 2000 + 500;
        ok(Number($("totalVenta").value) === 105000, "Ventas: total del pedido = $105.000");
        ok(cerca($("costoTotalVenta").value, costoPedido), "Ventas: costo total incluye UNA caja y UNA bolsa por pedido");

        registrarVenta();

        let venta = leer("ventas")[0];
        ok(venta && venta.items.length === 2 && venta.cantidadEmpaques === 1, "Ventas: se guarda un pedido con 2 productos y 1 empaque");
        ok(buscar("insumos", "BOLSA").stock === 49 && buscar("insumos", "CAJA DE ENVIO").stock === 29, "Ventas: descuenta 1 bolsa y 1 caja (no una por unidad)");
        ok(buscar("productos", "MIEL DE PÁRAMO ANDINO").stock === 97 && buscar("productos", "VELAS DE CERA DE ABEJAS").stock === 8, "Ventas: descuenta el stock de cada producto");
        ok(saldoDeVenta(venta) === 75000, "Cuentas por cobrar: queda saldo de $75.000 tras abonar $30.000");


        /* ======================================================
           7. CUENTAS POR COBRAR
        ====================================================== */

        ok($("tablaCuentasCobrar").rows.length === 1, "Cuentas por cobrar: aparece la venta pendiente");

        escribir("abonoVenta" + venta.id, "80.000");
        registrarPagoVenta(venta.id);
        ok(saldoDeVenta(leer("ventas")[0]) === 75000 && ultimoAviso().includes("mayor que el saldo"), "Cuentas por cobrar: no deja pagar más que el saldo");

        escribir("abonoVenta" + venta.id, "75.000");
        registrarPagoVenta(venta.id);
        venta = leer("ventas")[0];
        ok(saldoDeVenta(venta) === 0 && venta.estadoPago === "PAGADO", "Cuentas por cobrar: con el pago final queda PAGADO");


        /* ======================================================
           8. ANULAR VENTA
        ====================================================== */

        escribir("productoVenta", "MIEL DE PÁRAMO ANDINO");
        escribir("cantidadVenta", 1);
        escribir("precioVenta", 25000);
        escribir("terceroVenta", "CLIENTE FINAL");
        escribir("empaqueVenta", "BOLSA");
        escribir("estadoPagoVenta", "PAGADO");
        registrarVenta();

        const ventaAnular = leer("ventas")[1];
        ok(buscar("productos", "MIEL DE PÁRAMO ANDINO").stock === 96 && buscar("insumos", "BOLSA").stock === 48, "Ventas: venta simple de un producto sigue funcionando");

        respuestaPrompt = null;
        anularVenta(ventaAnular.id);
        ok(!leer("ventas")[1].anulada, "Anular: si se cancela el motivo, no se anula nada");

        respuestaPrompt = "ERROR DE DIGITACIÓN";
        anularVenta(ventaAnular.id);
        ok(leer("ventas")[1].anulada === true, "Anular venta: queda marcada como ANULADA (no se borra)");
        ok(buscar("productos", "MIEL DE PÁRAMO ANDINO").stock === 97 && buscar("insumos", "BOLSA").stock === 49, "Anular venta: devuelve el producto y la bolsa al inventario");
        ok($("totalVentasRegistradas").textContent === formatoMoneda(105000), "Anular venta: ya no suma en el total de ventas");
        ok($("totalVentasInicio").textContent === formatoMoneda(105000), "Anular venta: tampoco suma en la tarjeta de Ventas de Inicio");


        /* ======================================================
           9. ANULAR PRODUCCIÓN
        ====================================================== */

        producir("MIEL DE PÁRAMO ANDINO", 5);
        const produccionAnular = leer("producciones")[2];
        ok(cerca(leer("canecas").find(c => c.id === "C002").pesoDisponible, 21.715, 0.000001), "Producción: C002 queda en 21,715 kg");

        anularProduccion(produccionAnular.id);
        ok(leer("producciones")[2].anulada === true, "Anular producción: queda marcada como ANULADA");
        ok(cerca(leer("canecas").find(c => c.id === "C002").pesoDisponible, 23.3, 0.000001), "Anular producción: la miel vuelve a la misma caneca (C002 = 23,3 kg)");
        ok(buscar("productos", "MIEL DE PÁRAMO ANDINO").stock === 97 && buscar("insumos", "TARRO").stock === 100, "Anular producción: devuelve tarros y descuenta lo producido");

        anularProduccion(leer("producciones")[1].id);   // VELAS: 10 producidas, ya se vendieron 2
        ok(!leer("producciones")[1].anulada && ultimoAviso().includes("ya salieron"), "Anular producción: bloquea si ya se vendieron unidades");


        /* ======================================================
           10. ANULAR COMPRAS
        ====================================================== */

        compraInsumo("BOLSA", 20, 520);
        const compraBolsa = leer("compras").slice(-1)[0];
        ok(buscar("insumos", "BOLSA").stock === 69, "Compras: la compra de 20 bolsas suma al stock");

        anularCompra(compraBolsa.id);
        ok(buscar("insumos", "BOLSA").stock === 49 && cerca(buscar("insumos", "BOLSA").costoPromedio, 500, 0.0001), "Anular compra: devuelve stock y costo promedio de BOLSA");

        compraCaneca("", 10, 3);
        const compraC004 = leer("compras").slice(-1)[0];
        anularCompra(compraC004.id);
        const c004 = leer("canecas").find(c => c.id === "C004");
        ok(c004.anulada === true && c004.activo === false && c004.pesoDisponible === 0, "Anular compra de caneca sin uso: la caneca queda anulada y sin existencias");

        anularCompra(leer("compras").find(c => c.canecaId === "C001").id);
        ok(!leer("compras").find(c => c.canecaId === "C001").anulada && ultimoAviso().includes("movimientos"), "Anular compra: bloquea si la caneca ya se usó");


        /* ======================================================
           11. AJUSTES DE INVENTARIO
        ====================================================== */

        const ajuste = (tipoItem, id, tipoAjuste, cantidad, observacion) => {
            escribir("fechaAjuste", hoy);
            escribir("tipoItemAjuste", tipoItem);
            escribir("itemAjuste", id);
            escribir("tipoAjuste", tipoAjuste);
            escribir("cantidadAjuste", cantidad);
            escribir("observacionAjuste", observacion);
            registrarAjuste();
        };

        ajuste("INSUMO", buscar("insumos", "TARRO").id, "ROTURA", 2, "Tarros rotos");
        ok(buscar("insumos", "TARRO").stock === 98, "Ajustes: rotura de 2 tarros descuenta el stock (100 → 98)");

        ajuste("INSUMO", buscar("insumos", "ETIQUETA").id, "CONTEO", 90, "Conteo de fin de mes");
        ok(buscar("insumos", "ETIQUETA").stock === 90, "Ajustes: el conteo físico deja el stock en lo contado (100 → 90)");

        ajuste("CANECA", "C002", "MERMA", "0.5", "Merma por trasvase");
        ok(cerca(leer("canecas").find(c => c.id === "C002").pesoDisponible, 22.8, 0.000001), "Ajustes: merma de 0,5 kg en C002 (23,3 → 22,8)");

        ajuste("INSUMO", buscar("insumos", "TARRO").id, "MUESTRA", 500, "");
        ok(buscar("insumos", "TARRO").stock === 98 && ultimoAviso().includes("más de lo que hay"), "Ajustes: no deja descontar más de lo que hay");

        ok(leer("ajustes").length === 3 && $("tablaAjustes").rows.length === 3, "Ajustes: quedan 3 ajustes en el historial");


        /* ======================================================
           12. KARDEX
        ====================================================== */

        const kTarro = obtenerKardex("INSUMO", buscar("insumos", "TARRO").id);
        ok(kTarro.saldoInicial === 200 && kTarro.filas.slice(-1)[0].saldo === 98, "Kardex TARRO: saldo inicial 200 y saldo final 98 (= stock real)");
        ok(kTarro.filas.some(f => f.movimiento.startsWith("ANULACIÓN")) && kTarro.filas.some(f => f.movimiento.startsWith("AJUSTE")), "Kardex TARRO: muestra consumos, anulación y ajuste");

        const kC002 = obtenerKardex("CANECA", "C002");
        ok(cerca(kC002.filas.slice(-1)[0].saldo, 22.8, 0.000001), "Kardex C002: el saldo coincide con el peso disponible (22,8 kg)");

        const kMiel = obtenerKardex("PRODUCTO", buscar("productos", "MIEL DE PÁRAMO ANDINO").id);
        ok(kMiel.filas.slice(-1)[0].saldo === 97, "Kardex MIEL: el saldo coincide con el stock (97)");

        const kBolsa = obtenerKardex("INSUMO", buscar("insumos", "BOLSA").id);
        ok(kBolsa.filas.slice(-1)[0].saldo === 49, "Kardex BOLSA: compras, empaques y anulaciones cuadran (49)");

        escribir("tipoItemKardex", "INSUMO");
        escribir("itemKardex", String(buscar("insumos", "TARRO").id));
        ok($("tablaKardex").rows.length >= 5 && $("resumenKardex").textContent.includes("Saldo actual: 98"), "Kardex: la tabla se muestra en pantalla");


        /* ======================================================
           13. REPORTES
        ====================================================== */

        $("desdeReporte").value = hoy;
        $("hastaReporte").value = hoy;
        mostrarReportes();

        const ventaPedido = leer("ventas")[0];
        ok($("repVentas").textContent === formatoMoneda(105000), "Reportes: ventas del período = $105.000 (sin la anulada)");
        ok($("repGanancia").textContent === formatoMoneda(redondear(105000 - ventaPedido.costoTotal, 2)), "Reportes: ganancia del período correcta");
        ok($("repPerdidas").textContent === formatoMoneda(2 * 1000 + 10 * 200 + 0.5 * 2800), "Reportes: pérdidas por ajustes = $5.400");
        ok($("tablaReporteProductos").textContent.includes("EMPAQUES DE ENVÍO") && $("tablaReporteCanales").textContent.includes("DISTRIBUIDOR"), "Reportes: tablas por producto y por canal");


        /* ======================================================
           14. RENOMBRAR INSUMO
        ====================================================== */

        editarInsumo(buscar("insumos", "CERA").id);
        escribir("nombreInsumo", "CERA DE ABEJAS");
        registrarInsumo();
        ok(leer("recetas").some(r => r.componente === "CERA DE ABEJAS") && !leer("recetas").some(r => r.componente === "CERA"), "Renombrar: la receta se actualiza con el nuevo nombre");

        producir("VELAS DE CERA DE ABEJAS", 1);
        ok(buscar("productos", "VELAS DE CERA DE ABEJAS").stock === 9, "Renombrar: se puede seguir produciendo con el insumo renombrado");

        const kCera = obtenerKardex("INSUMO", buscar("insumos", "CERA DE ABEJAS").id);
        ok(kCera.filas.filter(f => f.movimiento === "CONSUMO EN PRODUCCIÓN").length === 2, "Renombrar: el kardex conserva el historial con el nombre anterior");


        /* ======================================================
           15. PROTECCIÓN AL ELIMINAR
        ====================================================== */

        respuestaConfirm = false;
        eliminarInsumo(buscar("insumos", "CAJA DE ENVIO").id);
        ok(estaActivo(buscar("insumos", "CAJA DE ENVIO")) && ultimoAviso().includes("venta"), "Eliminar: un insumo usado en ventas no se borra");
        respuestaConfirm = true;


        /* ======================================================
           16. RESPALDO
        ====================================================== */

        const respaldo = construirRespaldo();
        const antes = JSON.stringify(respaldo.datos);

        ["productos", "insumos", "ventas"].forEach(k => localStorage.removeItem(k));
        ok(leer("productos").length === 0, "Respaldo: (simulación) se borran datos");

        aplicarRespaldo(JSON.parse(JSON.stringify(respaldo)));
        ok(JSON.stringify(construirRespaldo().datos) === antes, "Respaldo: importar recupera todos los datos exactamente");

        ok(aplicarRespaldo({ cualquier: "cosa" }) === false, "Respaldo: rechaza un archivo que no es de EUCAS");


        /* ======================================================
           17. VENTAS REGISTRADAS ANTES DE ESTA VERSIÓN
        ====================================================== */

        const ventaAntigua = {
            id: 1, fecha: hoy, producto: "MIEL DE PÁRAMO ANDINO", tercero: "CLIENTE FINAL",
            cantidad: 2, precioUnitario: 20000, empaque: "BOLSA",
            costoProductoUnitario: 2000, costoEmpaqueUnitario: 500,
            totalVenta: 40000, costoUnitario: 2500, costoTotal: 5000, ganancia: 35000
        };

        ok(itemsDeVenta(ventaAntigua)[0].costoTotal === 4000 && costoEmpaqueDeVenta(ventaAntigua) === 1000 && saldoDeVenta(ventaAntigua) === 0,
            "Compatibilidad: una venta antigua se lee bien (1 producto, empaque por unidad, pagada)");

        localStorage.setItem("ventas", JSON.stringify([...leer("ventas"), ventaAntigua]));
        mostrarVentas();
        mostrarReportes();
        ok($("tablaVentas").rows.length === 3, "Compatibilidad: el historial muestra ventas antiguas y nuevas juntas");



        /* ======================================================
           18. NOVEDADES: COSTO INICIAL, FERIA, MÉTODOS DE PAGO,
               ANULACIONES, RECETAS POR BLOQUES Y FILTROS
        ====================================================== */

        // Costo por unidad del stock inicial
        escribir("nombreProducto", "MIEL DE BOSQUE ALTO");
        escribir("tipoProducto", "PRODUCTO TERMINADO");
        escribir("stockProducto", 10);
        escribir("stockMinimo", 2);
        escribir("costoProducto", "2.300");
        registrarProducto();
        ok(buscar("productos", "MIEL DE BOSQUE ALTO").costoUnitario === 2300, "Productos: el stock inicial se registra con su costo por unidad ($2.300)");

        editarProducto(buscar("productos", "MIEL DE BOSQUE ALTO").id);
        escribir("costoProducto", "2.450,50");
        registrarProducto();
        ok(buscar("productos", "MIEL DE BOSQUE ALTO").costoUnitario === 2450.5 && buscar("productos", "MIEL DE BOSQUE ALTO").stock === 10, "Productos: al editar se corrige el costo por unidad sin cambiar el stock");

        // Tercero tipo FERIA
        tercero("FERIA DE LA MIEL", "FERIA");
        cargarTercerosVenta();
        ok([...$("terceroVenta").options].some(o => o.value === "FERIA DE LA MIEL"), "Terceros: el tipo FERIA aparece como destino de venta");

        // Venta pagada con BOLD (5 %)
        escribir("fechaVenta", hoy);
        escribir("productoVenta", "MIEL DE BOSQUE ALTO");
        escribir("cantidadVenta", 4);
        escribir("precioVenta", "25.000");
        escribir("terceroVenta", "FERIA DE LA MIEL");
        escribir("empaqueVenta", "NINGUNO");
        escribir("estadoPagoVenta", "PAGADO");
        escribir("metodoPagoVenta", "BOLD");
        ok($("comisionPagoVenta").value === "5" && $("resumenVenta").textContent.includes("Comisión BOLD"), "Pagos: al elegir BOLD se propone 5 % y el resumen muestra la comisión");
        registrarVenta();

        const ventaBold = leer("ventas").slice(-1)[0];
        ok(ventaBold.pagos[0].metodo === "BOLD" && ventaBold.pagos[0].comision === 5000, "Pagos: la venta guarda el método BOLD y su comisión ($5.000 de $100.000)");
        ok(cerca(gananciaDeVenta(ventaBold), 100000 - 4 * 2450.5 - 5000) && cerca(ventaBold.ganancia, gananciaDeVenta(ventaBold)), "Pagos: la ganancia descuenta el costo y la comisión");
        ok($("metodoPagoVenta").value === "EFECTIVO" && $("comisionPagoVenta").value === "0", "Pagos: después de registrar, el formulario vuelve a EFECTIVO sin comisión");

        $("desdeReporte").value = hoy;
        $("hastaReporte").value = hoy;
        mostrarReportes();
        ok($("repComisiones").textContent === formatoMoneda(5000) && $("tablaReporteMetodos").textContent.includes("BOLD"), "Reportes: muestran las comisiones y los pagos por método");

        // Abono mal digitado: se anula el pago, no la venta
        escribir("productoVenta", "MIEL DE BOSQUE ALTO");
        escribir("cantidadVenta", 2);
        escribir("precioVenta", "25.000");
        escribir("terceroVenta", "CLIENTE FINAL");
        escribir("estadoPagoVenta", "PENDIENTE");
        escribir("abonoInicialVenta", "20.000");
        escribir("metodoPagoVenta", "TRANSFERENCIA");
        registrarVenta();

        const ventaCredito = leer("ventas").slice(-1)[0];
        ok(saldoDeVenta(ventaCredito) === 30000 && ventaCredito.pagos[0].metodo === "TRANSFERENCIA", "Pagos: el abono inicial guarda su método (NEQUI / TRANSFERENCIA)");

        anularPagoVenta(ventaCredito.id, 0);
        ok(saldoDeVenta(leer("ventas").slice(-1)[0]) === 50000 && leer("ventas").slice(-1)[0].pagos[0].anulado === true, "Pagos: anular un abono mal digitado devuelve el saldo ($50.000) sin borrarlo");

        // Anular la venta: el mensaje dice qué volvió y con cuánto queda
        anularVenta(ventaCredito.id);
        ok(ultimoAviso().includes("Volvió al inventario") && ultimoAviso().includes("MIEL DE BOSQUE ALTO") && buscar("productos", "MIEL DE BOSQUE ALTO").stock === 6, "Anular venta: el aviso detalla lo devuelto (MIEL DE BOSQUE ALTO 4 → 6)");

        // Filtros de los historiales
        escribir("filtroVentas", "ANULADAS");
        ok($("tablaVentas").rows.length === leer("ventas").filter(v => v.anulada).length && !$("tablaVentas").textContent.includes("FERIA DE LA MIEL"), "Filtros: el historial de ventas puede mostrar solo las anuladas");
        escribir("filtroVentas", "PENDIENTES");
        ok($("tablaVentas").rows.length === 1 && $("tablaVentas").textContent.includes("No hay ventas"), "Filtros: sin ventas pendientes, avisa que no hay resultados");
        escribir("filtroVentas", "TODAS");

        escribir("filtroProduccion", "ANULADOS");
        ok($("tablaProduccion").rows.length === 1 && $("tablaProduccion").textContent.includes("ANULADA"), "Filtros: el historial de producción puede mostrar solo las anuladas");
        escribir("filtroProduccion", "TODOS");

        escribir("filtroCompras", "ANULADOS");
        ok($("tablaCompras").rows.length === 2, "Filtros: el historial de compras puede mostrar solo las anuladas");
        escribir("filtroCompras", "TODOS");

        // Anular un ajuste mal registrado
        ajuste("INSUMO", buscar("insumos", "TARRO").id, "ROTURA", 3, "Eran de otro lote");
        ok(buscar("insumos", "TARRO").stock === 95, "Ajustes: rotura de 3 tarros (98 → 95)");
        anularAjuste(leer("ajustes").slice(-1)[0].id);
        ok(buscar("insumos", "TARRO").stock === 98 && leer("ajustes").slice(-1)[0].anulado === true, "Anular ajuste: la existencia vuelve (95 → 98) y el ajuste queda en el historial");
        const kTarro2 = obtenerKardex("INSUMO", buscar("insumos", "TARRO").id);
        ok(kTarro2.filas.slice(-1)[0].saldo === 98 && kTarro2.filas.some(f => f.movimiento === "ANULACIÓN DE AJUSTE"), "Kardex: muestra la anulación del ajuste y el saldo sigue cuadrando");

        // Recetas por bloques y con listas desplegables
        mostrarSeccion("recetas");
        ok($("productoReceta").tagName === "SELECT" && [...$("productoReceta").options].some(o => o.value === "MIEL DE BOSQUE ALTO"), "Recetas: el producto se elige de una lista desplegable");
        escribir("tipoComponente", "INSUMO");
        ok([...$("componenteReceta").options].some(o => o.value === "TARRO" && o.textContent.includes("stock")), "Recetas: los insumos salen en la lista con su existencia");
        ok($("listaRecetas").querySelectorAll(".tarjeta-receta").length === 2, "Recetas: cada receta se muestra en su propio bloque");

        receta("MIEL DE BOSQUE ALTO", "INSUMO", "TARRO", 1);
        receta("MIEL DE BOSQUE ALTO", "INSUMO", "TAPA", 1);
        ok($("listaRecetas").querySelectorAll(".tarjeta-receta").length === 3, "Recetas: la receta nueva aparece como un bloque más");
        eliminarRecetaCompleta("MIEL DE BOSQUE ALTO");
        ok(!leer("recetas").some(r => r.producto === "MIEL DE BOSQUE ALTO"), "Recetas: una receta sin producciones se elimina completa de una vez");

        eliminarRecetaCompleta("VELAS DE CERA DE ABEJAS");
        ok(leer("recetas").filter(r => r.producto === "VELAS DE CERA DE ABEJAS").every(r => r.activo === false), "Recetas: una receta ya usada en producción se desactiva (no se pierde el historial)");
        leer("recetas").filter(r => r.producto === "VELAS DE CERA DE ABEJAS").forEach(r => reactivarReceta(r.id));

        // Producto eliminado con historial: deja de contar
        const productosAntes = Number($("totalProductosInicio").textContent);
        eliminarProducto(buscar("productos", "MIEL DE BOSQUE ALTO").id);
        ok(!estaActivo(buscar("productos", "MIEL DE BOSQUE ALTO")) && Number($("totalProductosInicio").textContent) === productosAntes - 1, "Eliminar producto con ventas: queda inactivo y deja de contar en Inicio");
        ok(!$("tablaProductosGestion").textContent.includes("MIEL DE BOSQUE ALTO") && !$("tablaInventario").textContent.includes("MIEL DE BOSQUE ALTO"), "Filtros: el producto inactivo sale de la lista de activos y del inventario actual");
        escribir("filtroProductos", "INACTIVOS");
        ok($("tablaProductosGestion").textContent.includes("MIEL DE BOSQUE ALTO") && $("tablaProductosGestion").textContent.includes("Reactivar"), "Filtros: el producto inactivo aparece en «Inactivos» para reactivarlo");
        escribir("filtroProductos", "ACTIVOS");
        reactivarRegistro("productos", buscar("productos", "MIEL DE BOSQUE ALTO").id);

        // Inicio con todo el inventario
        mostrarInventario();
        ok($("tablaInventario").textContent.includes("TARRO") && $("tablaInventario").textContent.includes("MIEL (CANECA)"), "Inicio: el inventario actual incluye insumos y canecas");


        /* ======================================================
           19. DISEÑO
        ====================================================== */

        mostrarSeccion("ventas");
        const pestanaActiva = document.querySelector("nav button.activo");
        ok(pestanaActiva && pestanaActiva.textContent.trim() === "Ventas", "Diseño: el menú marca la sección abierta");
        ok($("tablaVentas").querySelector(".estado-ok, .estado-pendiente, .estado-inactivo") !== null, "Diseño: los estados de pago se muestran como etiquetas de color");

        const fondo = getComputedStyle(document.body).backgroundColor;
        ok(fondo === "rgb(254, 243, 218)", "Diseño: estilos.css cargado con la paleta del manual (fondo crema #FEF3DA)");

        ok($("tituloSeccion").textContent === "Ventas" && $("descripcionSeccion").textContent.length > 10, "Diseño: cada pantalla muestra su título y una explicación");

        const avisosAntes = $("avisos").children.length;
        mostrarAviso("Mensaje de prueba registrado correctamente.");
        const avisoNuevo = $("avisos").lastElementChild;
        ok($("avisos").children.length === Math.min(avisosAntes + 1, 3) && avisoNuevo.classList.contains("aviso-exito"), "Diseño: los mensajes aparecen dentro de la página");
        avisoNuevo.remove();

        escribir("productoVenta", "MIEL DE PÁRAMO ANDINO");
        escribir("cantidadVenta", 2);
        escribir("precioVenta", "25.000");
        ok($("resumenVenta").textContent.includes("Total a cobrar") && $("resumenVenta").textContent.includes(formatoMoneda(50000)), "Diseño: el resumen de la venta muestra el total en pesos ($50.000)");

        const menu = [...document.querySelectorAll("nav button")].map(b => b.textContent.trim());
        ok(menu.indexOf("Compras") < menu.indexOf("Producción") && menu.indexOf("Producción") < menu.indexOf("Ventas") && menu.includes("Recetas"), "Diseño: el menú sigue el orden de trabajo (comprar → producir → vender) y tiene Recetas");

        mostrarSeccion("ventas");
        ok($("barraSubpestanas").querySelectorAll("button").length === 3 && $("panelVentaRegistro").style.display === "block" && $("panelVentaHistorial").style.display === "none", "Diseño: Ventas se divide en pestañas (nueva venta, historial, por cobrar)");
        mostrarSubpestana("ventas", "panelVentaHistorial");
        ok($("panelVentaHistorial").style.display === "block" && $("panelVentaRegistro").style.display === "none", "Diseño: al cambiar de pestaña se ve el historial sin bajar por la página");

        mostrarSeccion("recetas");
        ok($("seccionRecetas").style.display === "block" && $("seccionProduccion").style.display === "none" && $("barraSubpestanas").hidden, "Diseño: Recetas tiene su propia opción en el menú, aparte de Producción");

    }

    catch (error) {

        resultados.push({ ok: false, descripcion: "Error inesperado: " + error.message });
        console.error(error);

    }

    finally {

        if (DEJAR_DATOS_DE_PRUEBA) {

            /* ---------- Dejar los datos de la prueba para revisarlos ---------- */

            // La venta "antigua" de la prueba de compatibilidad no movió el
            // inventario; se quita para que los datos queden coherentes.
            localStorage.setItem("ventas", JSON.stringify(leer("ventas").filter(v => v.id !== 1)));

            // El recordatorio de respaldo vuelve a como estaba
            if (datosOriginales.ultimoRespaldo === null) localStorage.removeItem("ultimoRespaldo");
            else localStorage.setItem("ultimoRespaldo", datosOriginales.ultimoRespaldo);

        }

        else {

            /* ---------- Restaurar datos reales ---------- */

            CLAVES.forEach(k => {
                if (datosOriginales[k] === null) localStorage.removeItem(k);
                else localStorage.setItem(k, datosOriginales[k]);
            });

            if (copiaDuranteLaPrueba) localStorage.removeItem("eucasDatosAntesDePrueba");

        }

        try {

            limpiarPedidoVenta();
            cancelarEdicionProducto();
            cancelarEdicionInsumo();
            cancelarEdicionCaneca();
            cancelarEdicionReceta();
            cancelarEdicionTercero();
            limpiarFormularioCompra();

            ["productoVenta", "terceroVenta", "cantidadVenta", "precioVenta",
             "cantidadProduccion", "loteProduccion", "vencimientoProduccion",
             "cantidadAjuste", "observacionAjuste", "desdeKardex", "hastaKardex"]
                .forEach(id => { if ($(id)) $(id).value = ""; });

            $("empaqueVenta").value = "NINGUNO";
            $("cantidadEmpaquesVenta").value = "1";
            $("estadoPagoVenta").value = "PAGADO";
            cambiarEstadoPagoVenta();

            refrescarTodo();
            mostrarSeccion("inicio");

        }

        catch (error) {
            console.error(error);
        }

        Object.assign(window, funcionesOriginales);

    }


    /* ---------- Mostrar resultados ---------- */

    const fallidas = resultados.filter(r => !r.ok);

    console.log("%cEUCAS - RESULTADO DE LAS PRUEBAS", "font-size: 16px; font-weight: bold;");

    resultados.forEach(r => {
        console.log((r.ok ? "✅ " : "❌ ") + r.descripcion);
    });

    console.log(
        fallidas.length === 0
            ? `%c✅ TODAS LAS PRUEBAS PASARON (${resultados.length} de ${resultados.length})`
            : `%c❌ FALLARON ${fallidas.length} DE ${resultados.length} PRUEBAS`,
        `font-size: 14px; font-weight: bold; color: ${fallidas.length === 0 ? "green" : "red"};`
    );

    if (DEJAR_DATOS_DE_PRUEBA) {

        console.log("%cLos datos de la prueba quedaron cargados para que los revise en cada pantalla.", "font-weight: bold;");

        if (copiaNueva && habiaDatos) {
            console.log("Sus datos anteriores se descargaron en: eucas-datos-antes-de-prueba-" + obtenerFechaActual() + ".json (carpeta Descargas).");
        }

        console.log("%cPara volver a sus datos cuando termine de revisar:", "font-weight: bold;");
        console.log("  - Ahora mismo, escriba aquí:  restaurarDatosAntesDePrueba()");
        console.log("  - Más tarde (después de cerrar o recargar la página): pegue en la consola el archivo restaurar-datos.js");
        console.log("Vuelva a sus datos antes de registrar información real.");

    }

    else {

        console.log(
            habiaDatos
                ? "%c\u2705 Sus datos quedaron exactamente como estaban antes de la prueba."
                : "%c\u2705 Antes de la prueba no había datos; el sistema quedó vacío como estaba.",
            "font-weight: bold; color: green;"
        );

    }

    return fallidas.length === 0
        ? `OK: ${resultados.length} pruebas`
        : `FALLAS: ${fallidas.length}`;

})();
