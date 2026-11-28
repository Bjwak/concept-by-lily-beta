
(() => {
    // ======================================
    // CONFIGURACIÓN
    // ======================================

    const WHATSAPP_NUMBER = "50587984118";

    const PUBLIC_BASE_URL =
        "https://bjwak.github.io/concept-by-lily-beta/";

    const CUSTOMER_KEY = "conceptByLilyReturningCustomer";

    const stores = {
        mujer: {
            name: "Accesorios para mujer",
            path: "../mujer/index.html"
        },
        cosmeticos: {
            name: "Cosméticos y maquillaje",
            path: "../cosmeticos/index.html"
        },
        hombre: {
            name: "Accesorios para hombre",
            path: "../hombre/index.html"
        }
    };

    // ======================================
    // IDENTIFICAR LA COLECCIÓN
    // ======================================

    const params = new URLSearchParams(window.location.search);
    const storeKey = params.get("tienda");
    const store = stores[storeKey];

    if (!store) {
        window.location.replace("../");
        return;
    }

    // ======================================
    // GENERAR LOS ENLACES
    // ======================================

    // Enlace interno: funciona en Android y navegador.
    const catalogUrl = new URL(
        store.path,
        window.location.href
    ).href;

    // Enlace público: siempre apunta a GitHub Pages.
    const publicCatalogUrl = new URL(
        store.path.replace(/^\.\.\//, ""),
        PUBLIC_BASE_URL
    ).href;

    // ======================================
    // COMPROBAR CLIENTE RECURRENTE
    // ======================================

    function isReturningCustomer() {
        try {
            return localStorage.getItem(CUSTOMER_KEY) === "true";
        } catch (error) {
            console.warn("No se pudo consultar la preferencia:", error);
            return false;
        }
    }

    function rememberReturningCustomer() {
        try {
            localStorage.setItem(CUSTOMER_KEY, "true");
        } catch (error) {
            console.warn("No se pudo guardar la preferencia:", error);
        }
    }

    // Si ya compró anteriormente, entrar directamente.
    if (isReturningCustomer()) {
        window.location.replace(catalogUrl);
        return;
    }

    // ======================================
    // MOSTRAR INFORMACIÓN DE LA COLECCIÓN
    // ======================================

    document.getElementById("store-name").textContent = store.name;

    document.getElementById("returning-button").href = catalogUrl;

    document.getElementById("current-year").textContent =
        new Date().getFullYear();

    // ======================================
    // CLIENTE DE PRIMERA COMPRA
    // ======================================

    document
        .getElementById("first-time-button")
        .addEventListener("click", () => {

            const message = [
                "¡Hola! Estoy visitando Concept by Lily y quiero conocer sus productos.",
                "",
                "Me interesa la colección: " + store.name + ".",
                "Enlace del catálogo: " + publicCatalogUrl
            ].join("\n");

            const whatsappUrl =
                "https://wa.me/" +
                WHATSAPP_NUMBER +
                "?text=" +
                encodeURIComponent(message);

            window.open(
                whatsappUrl,
                "_blank",
                "noopener,noreferrer"
            );

            document.getElementById("whatsapp-note").textContent =
                "WhatsApp se abrió en otra pestaña. Pulsa Enviar en esa conversación y luego regresa aquí para entrar al catálogo.";
        });

    // ======================================
    // CLIENTE QUE YA HA COMPRADO
    // ======================================

    document
        .getElementById("returning-button")
        .addEventListener("click", (event) => {

            event.preventDefault();

            rememberReturningCustomer();

            window.location.href = catalogUrl;
        });

})();
