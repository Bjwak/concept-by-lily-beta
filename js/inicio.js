import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://lljlmyshxijzuzyzafxa.supabase.co",
  "sb_publishable_Tn9HC6_IA7wrlEmiFS7Beg_KHQd0alK"
);

const STORE_LINKS = {
  "8c109c37-c8ed-4726-b950-24a453ba999b": "hombre",
  "937fc539-9b4f-4f8f-a0d6-676408a5359a": "mujer",
  "a6ebf309-4a7e-4a9a-9411-fa956e4d4349": "cosmeticos"
};

let activeStoreIds = null;

async function loadStoreVisibility() {
  const { data, error } = await supabase.from("stores").select("id,is_active");
  if (error) { console.warn("No se pudo consultar el estado de las tiendas:", error.message); return null; }
  activeStoreIds = new Set((data || []).filter(store => store.is_active).map(store => store.id));
  const cards=[...document.querySelectorAll(".collection-card[data-store-id]")];
  cards.forEach(card => { card.hidden = !activeStoreIds.has(card.dataset.storeId); });
  const count=cards.filter(card=>activeStoreIds.has(card.dataset.storeId)).length;
  const aside=document.getElementById("collectionsAside");
  if(aside)aside.innerHTML=count===3?"Tres espacios, muchas formas<br>de expresar quién eres.":count===1?"Una colección activa para<br>expresar quién eres.":count+" colecciones activas para<br>expresar quién eres.";
  const allLink=document.getElementById("allCollectionsLink");
  const preferred=["937fc539-9b4f-4f8f-a0d6-676408a5359a","a6ebf309-4a7e-4a9a-9411-fa956e4d4349","8c109c37-c8ed-4726-b950-24a453ba999b"];
  const first=preferred.find(id=>activeStoreIds.has(id));
  if(allLink){allLink.hidden=!first;if(first)allLink.href="acceso/index.html?tienda="+encodeURIComponent(STORE_LINKS[first]);}
  return activeStoreIds;
}

const money = (amount, currency = "NIO") => {
  try {
    return new Intl.NumberFormat("es-NI", { style: "currency", currency }).format(Number(amount || 0));
  } catch {
    return `C$ ${Number(amount || 0).toFixed(2)}`;
  }
};

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

const imageUrl = path => /^https?:/i.test(path || "")
  ? path
  : supabase.storage.from("product-images").getPublicUrl(path || "").data?.publicUrl || "";

async function loadNewArrivals() {
  const container = document.getElementById("newProducts");
  const message = document.getElementById("newProductsMessage");
  if (!container || !message) return;

  try {
    if (activeStoreIds === null) await loadStoreVisibility();
    const { data: products, error } = await supabase
      .from("products")
      .select("id, store_id, category_id, name, price, currency, created_at, is_archived")
      .eq("is_active", true)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(24);

    if (error) throw error;
    const visibleProducts = (products || []).filter(product => activeStoreIds === null || activeStoreIds.has(product.store_id));
    const productIds = visibleProducts.map(product => product.id);
    if (!productIds.length) {
      message.textContent = "Muy pronto encontrarás aquí nuestros productos disponibles.";
      return;
    }

    const [categoriesResult, imagesResult, variantsResult] = await Promise.all([
      supabase.from("categories").select("id, name").eq("is_active", true),
      supabase.from("product_images").select("product_id, image_path, is_primary, sort_order, is_active").in("product_id", productIds).eq("is_active", true).order("sort_order"),
      supabase.from("product_variants").select("product_id, stock, is_active").in("product_id", productIds).eq("is_active", true)
    ]);

    for (const result of [categoriesResult, imagesResult, variantsResult]) {
      if (result.error) throw result.error;
    }

    const categoryMap = new Map((categoriesResult.data || []).map(category => [category.id, category.name]));
    const cards = visibleProducts.map(product => {
      const image = (imagesResult.data || []).find(item => item.product_id === product.id && item.is_primary)
        || (imagesResult.data || []).find(item => item.product_id === product.id);
      const available = (variantsResult.data || []).some(variant => variant.product_id === product.id && Number(variant.stock) > 0);
      const storeSlug = STORE_LINKS[product.store_id];
      if (!storeSlug) return "";
      const href = `acceso/index.html?tienda=${encodeURIComponent(storeSlug)}`;
      const picture = image?.image_path
        ? `<img src="${escapeHtml(imageUrl(image.image_path))}" alt="${escapeHtml(product.name)}" loading="lazy">`
        : `<div class="new-product-placeholder">Concept by Lily</div>`;

      return `<article class="new-product-card">
        <a class="new-product-link" href="${href}">
          <div class="new-product-image">${picture}<span class="new-product-tag">${available ? "NUEVO" : "AGOTADO"}</span></div>
          <div class="new-product-info">
            <p class="new-product-category">${escapeHtml(categoryMap.get(product.category_id) || "Colección")}</p>
            <h3 class="new-product-name">${escapeHtml(product.name)}</h3>
            <p class="new-product-price">${money(product.price, product.currency)}</p>
          </div>
        </a>
      </article>`;
    }).filter(Boolean);

    if (!cards.length) {
      message.textContent = "Muy pronto encontrarás aquí nuestros productos disponibles.";
      return;
    }

    container.innerHTML = cards.slice(0, 4).join("");
    message.textContent = "Una selección de las últimas incorporaciones a nuestras colecciones.";
  } catch (error) {
    console.error("No se pudieron cargar las novedades:", error);
    message.textContent = "Estamos preparando nuevas sorpresas para ti.";
  }
}

loadStoreVisibility().finally(loadNewArrivals);
