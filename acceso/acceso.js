import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://lljlmyshxijzuzyzafxa.supabase.co",
  "sb_publishable_Tn9HC6_IA7wrlEmiFS7Beg_KHQd0alK"
);
const WHATSAPP_NUMBER = "50587984118";
const PUBLIC_BASE_URL = "https://bjwak.github.io/concept-by-lily-beta/";
const CUSTOMER_KEY = "conceptByLilyReturningCustomer";
const params = new URLSearchParams(window.location.search);
const storeSlug = String(params.get("tienda") || "").trim();
let store = null;
let catalogUrl = "";
let publicCatalogUrl = "";

function isReturningCustomer() {
  try { return localStorage.getItem(CUSTOMER_KEY) === "true"; }
  catch (error) { console.warn("No se pudo consultar la preferencia:", error); return false; }
}
function rememberReturningCustomer() {
  try { localStorage.setItem(CUSTOMER_KEY, "true"); }
  catch (error) { console.warn("No se pudo guardar la preferencia:", error); }
}
async function initialize() {
  if (!storeSlug) { window.location.replace("../"); return; }
  const { data, error } = await supabase.from("stores")
    .select("id,name,slug,is_active,is_open")
    .eq("slug",storeSlug).eq("is_active",true).maybeSingle();
  if (error || !data) {
    console.error("No se pudo resolver la tienda:",error);
    window.location.replace("../");
    return;
  }
  store = data;
  const target = "../tienda/index.html?tienda="+encodeURIComponent(store.slug);
  catalogUrl = new URL(target,window.location.href).href;
  publicCatalogUrl = new URL("tienda/index.html?tienda="+encodeURIComponent(store.slug),PUBLIC_BASE_URL).href;
  document.getElementById("store-name").textContent = store.name;
  document.getElementById("returning-button").href = catalogUrl;
  document.getElementById("current-year").textContent = new Date().getFullYear();
  if (store.is_open === false) {
    document.getElementById("access-description").textContent = "Puedes explorar esta colección, pero por el momento no estamos aceptando pedidos.";
    document.getElementById("returning-button").textContent = "Ver catálogo (pedidos cerrados)";
  }
  if (isReturningCustomer()) {
    window.location.replace(catalogUrl);
    return;
  }
  document.getElementById("first-time-button").addEventListener("click",()=>{
    const message = [
      "¡Hola! Estoy visitando Concept by Lily y quiero conocer sus productos.",
      "",
      "Me interesa la colección: "+store.name+".",
      "Enlace del catálogo: "+publicCatalogUrl
    ].join("\n");
    window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
    document.getElementById("whatsapp-note").textContent = "WhatsApp se abrió en otra pestaña. Pulsa Enviar en esa conversación y luego regresa aquí para entrar al catálogo.";
  });
  document.getElementById("returning-button").addEventListener("click",event=>{
    event.preventDefault();
    rememberReturningCustomer();
    window.location.href = catalogUrl;
  });
}
initialize();
