(() => {
  const WHATSAPP_NUMBER = "50587984118";
  const stores = {
    mujer: {
      name: "Accesorios para mujer",
      path: "../mujer/"
    },
    cosmeticos: {
      name: "Cosméticos y maquillaje",
      path: "../cosmeticos/"
    },
    hombre: {
      name: "Accesorios para hombre",
      path: "../hombre/"
    }
  };

  const params = new URLSearchParams(window.location.search);
  const storeKey = params.get("tienda");
  const store = stores[storeKey];

  if (!store) {
    window.location.replace("../");
    return;
  }

  const catalogUrl = new URL(store.path, window.location.href).href;
  document.getElementById("store-name").textContent = store.name;
  document.getElementById("returning-button").href = catalogUrl;
  document.getElementById("current-year").textContent = new Date().getFullYear();

  document.getElementById("first-time-button").addEventListener("click", () => {
    const message = [
      "¡Hola! Estoy visitando Concept by Lily y quiero conocer sus productos.",
      "",
      "Me interesa la colección: " + store.name + ".",
      "Enlace del catálogo: " + catalogUrl
    ].join("\\n");

    const whatsappUrl = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    document.getElementById("whatsapp-note").textContent =
      "WhatsApp se abrió en otra pestaña. Pulsa Enviar en esa conversación y luego regresa aquí para entrar al catálogo.";
  });
})();
