import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://ftzfsxcnfcqdmwhpardt.supabase.co",
  "sb_publishable_eRUu-PSs6VrdbtHMET1AvQ_pkZ_WHUv"
);

const STORE_LINKS = {
  "8c109c37-c8ed-4726-b950-24a453ba999b": "hombre",
  "937fc539-9b4f-4f8f-a0d6-676408a5359a": "mujer",
  "a6ebf309-4a7e-4a9a-9411-fa956e4d4349": "cosmeticos"
};

let activeStoreIds = null;
let homepageSettings = null;

const HOME_PALETTES = {"lily_signature":{"paper":"#fffaf5","ink":"#49343f","muted":"#846f78","accent":"#d78aa5","deep":"#6b4a5a","soft":"#f7dce7","line":"#eadde1","header":"#6b4a5a","footer":"#f7e9ed","cardStart":"#f4c8d8","cardEnd":"#d98aa7","heroStart":"#fffaf5","heroEnd":"#f9eaf0","closing":"#f7e9ed"},"rose_garden":{"paper":"#fff7f8","ink":"#512f40","muted":"#866777","accent":"#d97d9b","deep":"#8d3e60","soft":"#f8dce6","line":"#efd6df","header":"#7b3d59","footer":"#f8e7ed","cardStart":"#f1b7ca","cardEnd":"#c96d8e","heroStart":"#fff7f8","heroEnd":"#f8e0e9","closing":"#f8e7ed"},"sage_cream":{"paper":"#faf8f0","ink":"#35483d","muted":"#7a887c","accent":"#a9bda8","deep":"#526e5c","soft":"#e8eee3","line":"#dfe6d9","header":"#425b4b","footer":"#e8eee3","cardStart":"#c6d5c1","cardEnd":"#718d78","heroStart":"#faf8f0","heroEnd":"#e8eee3","closing":"#e8eee3"},"midnight_lilac":{"paper":"#f7f5f9","ink":"#302b3d","muted":"#777185","accent":"#b9a8d4","deep":"#4e4268","soft":"#e8e0f2","line":"#e0d9ea","header":"#342c45","footer":"#e8e0f2","cardStart":"#c9bce0","cardEnd":"#76658f","heroStart":"#f7f5f9","heroEnd":"#e8e0f2","closing":"#e8e0f2"},"cocoa_blush":{"paper":"#fbf5ef","ink":"#4a332d","muted":"#8c756b","accent":"#c99684","deep":"#745044","soft":"#f0dfd5","line":"#e9d9ce","header":"#65483e","footer":"#f0dfd5","cardStart":"#e4b9a8","cardEnd":"#a87560","heroStart":"#fbf5ef","heroEnd":"#f0dfd5","closing":"#f0dfd5"}};
function renderPublicBrandName(node, value, config = {}) {
  if (!node) return;
  const words = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  node.replaceChildren();
  const separated = config.brand_color_mode === 'separated';
  const colors = Array.isArray(config.brand_word_colors) ? config.brand_word_colors : [];
  const first = /^#[0-9a-f]{6}$/i.test(config.brand_color_one || '') ? config.brand_color_one : '#ffffff';
  const second = /^#[0-9a-f]{6}$/i.test(config.brand_color_two || '') ? config.brand_color_two : '#d78aa5';
  const byIndex = words.findIndex(word => word.toLowerCase() === 'by');
  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.className = 'brand-word';
    span.textContent = word;
    if (byIndex >= 0 && index >= byIndex) span.style.fontStyle = 'italic';
    if (separated) span.style.color = Number(colors[index]) === 2 ? second : first;
    node.append(span, document.createTextNode(index < words.length - 1 ? ' ' : ''));
  });
}

const HOME_DEFAULTS = {
  // La paleta original se conserva porque palette_id aún no está guardado en Producción.
  palette_id: "lily_signature",
  section_background_mode: "palette",
  section_background_hero: "#fffaf5",
  section_background_content: "#fffaf5",
  visible_store_ids: [],
  sections: {},
  texts: {},
  cards: {}
};

async function loadHomepageSettings() {
  const { data, error } = await supabase.from("homepage_settings")
    .select("settings").eq("id", 1).maybeSingle();
  if (error) {
    console.warn("No se pudo cargar la configuración de la portada:", error.message);
    homepageSettings = null;
  } else {
    homepageSettings = data?.settings || null;
  }
  applyHomepageSettings();
  document.body.classList.remove("homepage-config-loading");
}

function applyHomepageSettings() {
  const config = homepageSettings || HOME_DEFAULTS;
  const palette = HOME_PALETTES[config.palette_id] || HOME_PALETTES.lily_signature;
  document.documentElement.dataset.homePalette = config.palette_id || 'lily_signature';
  Object.entries(palette).forEach(([key,value]) => document.documentElement.style.setProperty('--home-palette-'+key,value));
  const footerContrastSafe = (color, background, fallback, minimum = 4.5) => { const luminance = value => { if (!/^#[0-9a-f]{6}$/i.test(value || '')) return 0; const channels = value.slice(1).match(/.{2}/g).map(part => parseInt(part, 16) / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)); return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]; }; const foreground = luminance(color), backdrop = luminance(background); return /^#[0-9a-f]{6}$/i.test(color || '') && (Math.max(foreground, backdrop) + 0.05) / (Math.min(foreground, backdrop) + 0.05) >= minimum ? color : fallback; };
  const footerMode = config.footer_color_mode === 'custom' ? 'custom' : 'palette';
  const validColor = value => /^#[0-9a-f]{6}$/i.test(value || '');
  const footerColors = footerMode === 'custom' ? {
    brand: footerContrastSafe(validColor(config.footer_brand_color) ? config.footer_brand_color : palette.deep, palette.footer, palette.deep),
    text: footerContrastSafe(validColor(config.footer_text_color) ? config.footer_text_color : palette.ink, palette.footer, palette.ink),
    link: footerContrastSafe(validColor(config.footer_link_color) ? config.footer_link_color : palette.deep, palette.footer, palette.deep),
    copyright: footerContrastSafe(validColor(config.footer_copyright_color) ? config.footer_copyright_color : palette.deep, palette.footer, palette.deep)
  } : { brand: palette.deep, text: palette.ink, link: palette.deep, copyright: palette.deep };
  document.documentElement.style.setProperty('--home-footer-brand-color', footerColors.brand);
  document.documentElement.style.setProperty('--home-footer-text-color', footerColors.text);
  document.documentElement.style.setProperty('--home-footer-link-color', footerColors.link);
  document.documentElement.style.setProperty('--home-footer-copyright-color', footerColors.copyright);
  const backgroundMode = ["palette","uniform","custom"].includes(config.section_background_mode) ? config.section_background_mode : "palette";
  const heroBackground = /^#[0-9a-f]{6}$/i.test(config.section_background_hero || "") ? config.section_background_hero : palette.heroStart;
  const contentBackground = /^#[0-9a-f]{6}$/i.test(config.section_background_content || "") ? config.section_background_content : palette.paper;
  document.documentElement.dataset.homeBackgroundMode = backgroundMode;
  document.documentElement.style.setProperty("--home-section-hero-bg", backgroundMode === "custom" ? heroBackground : (backgroundMode === "uniform" ? palette.paper : "linear-gradient(135deg,"+palette.heroStart+","+palette.heroEnd+")"));
  document.documentElement.style.setProperty("--home-section-content-bg", backgroundMode === "custom" ? contentBackground : palette.paper);
  const texts = config.texts || {};
  const sections = { ...HOME_DEFAULTS.sections, ...(config.sections || {}) };
  const visibleIds = new Set(Array.isArray(config.visible_store_ids) ? config.visible_store_ids : HOME_DEFAULTS.visible_store_ids);

  document.querySelectorAll("[data-home-section]").forEach(section => {
    const key = section.dataset.homeSection;
    section.hidden = sections[key] === false;
  });
  const main = document.querySelector("main");
  if (main) {
    const mainSections = [...main.querySelectorAll("[data-home-section]")].filter(section =>
      ["hero", "collections", "new_arrivals", "closing"].includes(section.dataset.homeSection)
    );
    const sectionMap = new Map(mainSections.map(section => [section.dataset.homeSection, section]));
    const order = Array.isArray(config.section_order) ? config.section_order : ["hero", "collections", "new_arrivals", "closing"];
    order.forEach(key => { if (sectionMap.has(key)) main.appendChild(sectionMap.get(key)); });
    mainSections.forEach(section => { if (!order.includes(section.dataset.homeSection)) main.appendChild(section); });
  }

  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value ?? "";
  };
  setText("#header-tagline", texts.header_tagline);
  const siteHeader = document.querySelector(".site-header");
  const brand = document.querySelector(".site-header .brand");
  const brandLogo = document.getElementById("brand-logo-image");
  const brandMark = document.querySelector(".site-header .brand-mark");
  const brandName = document.querySelector(".site-header .brand-name");
  renderPublicBrandName(brandName, config.brand_name || "Concept by Lily", config);
  if (brandName) brandName.dataset.brandColorMode = config.brand_color_mode === "separated" ? "separated" : "uniform";
  const markColor = /^#[0-9a-f]{6}$/i.test(config.brand_symbol_color || "") ? config.brand_symbol_color : palette.accent;
  if (brandMark) { brandMark.textContent = config.brand_symbol ?? "✦"; brandMark.style.color = markColor; }
  const logoPath = config.logo_image_path || "";
  const logoUrl = logoPath ? imageUrl(logoPath) : "";
  const logoPosition = ["left", "center", "right"].includes(config.logo_position) ? config.logo_position : "center";
  const logoSize = ["small", "medium", "large"].includes(config.logo_size) ? config.logo_size : "medium";
  if (siteHeader) { siteHeader.dataset.logoPosition = logoPosition; siteHeader.dataset.logoSize = logoSize; siteHeader.dataset.logoShowTagline = config.logo_show_tagline === false ? "false" : "true"; }
  if (brandLogo) {
    if (logoUrl) { brandLogo.src = logoUrl; brandLogo.hidden = false; }
    else { brandLogo.removeAttribute("src"); brandLogo.hidden = true; }
  }
  const imageOnly = Boolean(logoUrl && config.logo_mode === "image_only");
  if (brandMark) brandMark.hidden = imageOnly || !String(config.brand_symbol ?? "✦").trim();
  if (brandName) brandName.hidden = imageOnly;
  if (brand) brand.classList.toggle("has-custom-logo", Boolean(logoUrl));
  const tagline = document.getElementById("header-tagline");
  if (tagline) tagline.hidden = config.logo_show_tagline === false;
  const eyebrow = document.querySelector("#hero-eyebrow");
  if (eyebrow) {
    const decorative = eyebrow.querySelector(":scope > span");
    eyebrow.textContent = texts.hero_eyebrow || "";
    if (decorative) eyebrow.prepend(decorative);
  }
  setText("#intro-title", texts.hero_title);
  setText("#hero-description", texts.hero_description);
  const cta = document.querySelector("#hero-cta");
  if (cta) {
    const arrow = cta.querySelector("span");
    cta.textContent = (texts.hero_cta || "") + " ";
    if (arrow) cta.append(arrow);
  }
  const note = document.querySelector("#hero-note");
  if (note) {
    const line = note.querySelector(".note-line");
    note.textContent = texts.hero_note || "";
    if (line) note.prepend(line);
  }
  setText("#collections-eyebrow", texts.collections_eyebrow);
  setText("#collections-title", texts.collections_title);
  setText("#collectionsAside", texts.collections_aside);
  setText("#new-eyebrow", texts.new_eyebrow);
  setText("#new-title", texts.new_title);
  setText("#new-aside", texts.new_aside);
  setText("#closing-text", texts.closing_text);
  setText("#closing-brand", texts.closing_brand);
  setText("#footer-description", texts.footer_description);

  const heroImage = document.querySelector(".intro-visual .visual-main img");
  if (heroImage) {
    const visual = heroImage.closest(".visual-main");
    if (visual) visual.classList.remove("image-load-failed");
    heroImage.onerror = () => { heroImage.hidden = true; visual?.classList.add("image-load-failed"); };
    heroImage.onload = () => { heroImage.hidden = false; visual?.classList.remove("image-load-failed"); };
    const path = config.hero_image_path || "";
    const source = path ? imageUrl(path) : "";
    if (source) { heroImage.hidden = false; heroImage.src = source; }
    else { heroImage.removeAttribute("src"); heroImage.hidden = true; }
  }

  const cards = config.cards || {};
  document.querySelectorAll(".collection-card[data-store-id]").forEach(card => {
    const storeId = card.dataset.storeId;
    const slug = STORE_LINKS[storeId];
    const cardConfig = cards[slug] || {};
    card.hidden = !(visibleIds.has(storeId) && (activeStoreIds === null || activeStoreIds.has(storeId)));
    const title = card.querySelector(".card-title");
    const action = card.querySelector(".card-action");
    const number = card.querySelector(".card-number");
    if (title) title.textContent = cardConfig.title || "";
    if (action) {
      const arrow = action.querySelector("span");
      action.textContent = (cardConfig.action || "") + " ";
      if (arrow) action.append(arrow);
    }
    if (number) number.textContent = (number.dataset.cardNumber ? number.dataset.cardNumber + " " : "") + (cardConfig.eyebrow || "");
    let cardImage = card.querySelector(".collection-card-image");
    if (cardConfig.image_path) {
      const url = imageUrl(cardConfig.image_path);
      if (url) {
        if (!cardImage) {
          cardImage = document.createElement("img");
          cardImage.className = "collection-card-image";
          cardImage.alt = "";
          cardImage.setAttribute("aria-hidden", "true");
          cardImage.draggable = false;
          card.prepend(cardImage);
        }
        cardImage.src = url;
        const x = Math.max(0, Math.min(100, Number(cardConfig.image_position_x ?? 50)));
        const defaultY = slug === "mujer" ? 40 : slug === "cosmeticos" ? 42 : 48;
        const y = Math.max(0, Math.min(100, Number(cardConfig.image_position_y ?? defaultY)));
        const zoom = Math.max(100, Math.min(200, Number(cardConfig.image_zoom ?? 100)));
        cardImage.style.objectPosition = "50% 50%";
        const translateX = (50 - x) * (zoom / 100 - 1);
        const translateY = (50 - y) * (zoom / 100 - 1);
        cardImage.style.transform = "translate(" + translateX.toFixed(2) + "%, " + translateY.toFixed(2) + "%) scale(" + (zoom / 100) + ")";
        card.style.removeProperty("background-image");
      }
    } else {
      cardImage?.remove();
      card.style.removeProperty("background-image");
    }
  });

  const grid = document.querySelector(".collection-grid");
  if (grid) {
    const visibleCards = [...grid.querySelectorAll(".collection-card")].filter(card => !card.hidden);
    const count = visibleCards.length;
    const template = count <= 1 ? "one" : count === 2 ? "two" : "three";
    grid.dataset.template = template;
    const layoutDefaults = { one: { primary: "cosmeticos" }, two: { left: "cosmeticos", right: "mujer" }, three: { left: "cosmeticos", right_top: "mujer", right_bottom: "hombre" } };
    const layout = { ...layoutDefaults[template], ...(config.layout?.[template] || {}) };
    const slotBySlug = new Map(Object.entries(layout).map(([slot, slug]) => [slug, slot]));
    const slugById = new Map(Object.entries(STORE_LINKS).map(([id, slug]) => [id, slug]));
    const order = template === "one" ? ["primary"] : template === "two" ? ["left", "right"] : ["left", "right_top", "right_bottom"];
    visibleCards.forEach(card => { const slug = slugById.get(card.dataset.storeId); const slot = slotBySlug.get(slug) || order[0]; card.dataset.layoutPosition = slot; card.style.gridArea = slot; });
    visibleCards.sort((a,b) => order.indexOf(a.dataset.layoutPosition) - order.indexOf(b.dataset.layoutPosition)).forEach(card => grid.appendChild(card));
  }

  const backgroundPath = config.background_image_path || "";
  let layer = document.getElementById("homepageBackgroundLayer");
  if (backgroundPath) {
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "homepageBackgroundLayer";
      layer.className = "homepage-background-layer";
      layer.setAttribute("aria-hidden", "true");
      document.body.prepend(layer);
    }
    const url = imageUrl(backgroundPath);
    layer.style.backgroundImage = 'linear-gradient(rgba(255,250,252,.62),rgba(255,250,252,.62)),url("' + url.replace(/"/g, "%22") + '")';
    document.body.classList.add("homepage-has-background");
  } else {
    layer?.remove();
    document.body.classList.remove("homepage-has-background");
  }
}

async function loadStoreVisibility() {
  const { data, error } = await supabase.from("stores").select("id,is_active");
  if (error) {
    console.warn("No se pudo consultar el estado de las tiendas:", error.message);
    return null;
  }
  activeStoreIds = new Set((data || []).filter(store => store.is_active).map(store => store.id));
  applyHomepageSettings();
  const allLink = document.getElementById("allCollectionsLink");
  const preferred = ["937fc539-9b4f-4f8f-a0d6-676408a5359a","a6ebf309-4a7e-4a9a-9411-fa956e4d4349","8c109c37-c8ed-4726-b950-24a453ba999b"];
  const first = preferred.find(id => activeStoreIds.has(id));
  if (allLink) {
    allLink.hidden = !first;
    if (first) allLink.href = "acceso/index.html?tienda=" + encodeURIComponent(STORE_LINKS[first]);
  }
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

const imageUrl = path => { const value = String(path || "").trim(); const prefix = "https://ftzfsxcnfcqdmwhpardt.supabase.co/storage/v1/object/public/product-images/"; if (value.startsWith(prefix)) return value; if (!value || /^https?:/i.test(value)) return ""; return supabase.storage.from("product-images").getPublicUrl(value).data?.publicUrl || ""; };

async function loadNewArrivals() {
  const container = document.getElementById("newProducts");
  const message = document.getElementById("newProductsMessage");
  if (!container || !message) return;

  try {
    // La carga de tiendas se inicia en el bootstrap; si se demora, no bloqueamos las novedades.
    const { data: products, error } = await supabase
      .from("products")
      .select("id, store_id, category_id, name, price, currency, created_at, is_archived")
      .eq("is_active", true)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(24);

    if (error) throw error;
    const visibleHomepageIds = new Set(Array.isArray(homepageSettings?.visible_store_ids) ? homepageSettings.visible_store_ids : Object.keys(STORE_LINKS));
    const visibleProducts = (products || []).filter(product => (activeStoreIds === null || activeStoreIds.has(product.store_id)) && visibleHomepageIds.has(product.store_id));
    const productIds = visibleProducts.map(product => product.id);
    if (!productIds.length) {
      message.textContent = "Muy pronto encontrarás aquí nuestros productos disponibles.";
      return;
    }

    const [categoriesResult, imagesResult, variantsResult] = await Promise.allSettled([
      supabase.from("categories").select("id, name").eq("is_active", true),
      supabase.from("product_images").select("product_id, image_path, is_primary, sort_order, is_active").in("product_id", productIds).eq("is_active", true).order("sort_order"),
      supabase.from("product_variants").select("product_id, stock, is_active").in("product_id", productIds).eq("is_active", true)
    ]);
    const unwrap = (result, label) => {
      if (result.status === "rejected") { console.warn("No se pudieron cargar " + label + " para novedades:", result.reason); return []; }
      if (result.value.error) { console.warn("No se pudieron cargar " + label + " para novedades:", result.value.error.message); return []; }
      return result.value.data || [];
    };
    const categories = unwrap(categoriesResult, "categorías");
    const images = unwrap(imagesResult, "imágenes");
    const variants = unwrap(variantsResult, "variantes");
    const categoryMap = new Map(categories.map(category => [category.id, category.name]));
    const cards = visibleProducts.map(product => {
      const image = images.find(item => item.product_id === product.id && item.is_primary)
        || images.find(item => item.product_id === product.id);
      const available = variants.some(variant => variant.product_id === product.id && Number(variant.stock) > 0);
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

const withHomepageTimeout = (promise, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error("Tiempo de espera agotado al cargar " + label)), 10000))
]);
Promise.allSettled([
  withHomepageTimeout(loadHomepageSettings(), "la configuración de portada"),
  withHomepageTimeout(loadStoreVisibility(), "las tiendas")
]).then(() => {
  applyHomepageSettings();
  return loadNewArrivals();
}).catch(error => {
  console.error("No se pudo iniciar la portada:", error);
  loadNewArrivals();
});
