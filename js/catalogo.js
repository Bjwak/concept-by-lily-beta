import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const supabase=createClient("https://ftzfsxcnfcqdmwhpardt.supabase.co","sb_publishable_eRUu-PSs6VrdbtHMET1AvQ_pkZ_WHUv");
const cfg=window.CATALOG_CONFIG,$=id=>document.getElementById(id);
let products=[],categories=[],activeCategory="all",cart=new Map(),selection=new Map(),quickViewProductId=null,quickViewImageIndex=0,quickViewHistoryOpen=false;

let catalogSettings={brand_name:"Concept by Lily",whatsapp_number:"+505 8798 4118",show_prices:true,show_stock:true,show_out_of_stock:true,show_descriptions:true,accent_color:"",page_color:"",currency_code:"NIO",banner_path:null,banner_enabled:false,background_path:null,background_enabled:false,background_overlay:35};
const cartStorageKey=()=> "concept-by-lily:cart:"+String(cfg.storeId||"default");
function saveCartDraft(){
 try{
  const draft=[...cart.values()].map(item=>({variant_id:item.variant_id,quantity:item.quantity}));
  if(draft.length)localStorage.setItem(cartStorageKey(),JSON.stringify({version:1,updatedAt:Date.now(),items:draft}));
  else localStorage.removeItem(cartStorageKey());
 }catch(e){console.warn("No se pudo guardar el carrito localmente:",e)}
}
function restoreCartDraft(){
 try{
  const raw=localStorage.getItem(cartStorageKey());if(!raw)return;
  const saved=JSON.parse(raw);if(saved.version!==1||!Array.isArray(saved.items))return;
  let restored=0,removed=0;
  for(const entry of saved.items){
   const product=products.find(p=>p.variants.some(v=>v.id===entry.variant_id));
   const v=product?.variants.find(v=>v.id===entry.variant_id);
   const quantity=Math.floor(Number(entry.quantity));
   if(!product||!v||!Number.isFinite(quantity)||quantity<1||Number(v.stock)<1){removed++;continue}
   const available=Math.min(quantity,Number(v.stock));
   const pInfo=pricing(product,v),key=product.id+":"+v.id;
   cart.set(key,{key,variant_id:v.id,name:product.name,price:Number(pInfo.final),originalPrice:Number(pInfo.original),discounted:pInfo.active,currency:currencyOf(product),attributes:attrs(v),quantity:available,stock:Number(v.stock)});
   restored+=available;if(available<quantity)removed++;
  }
  saveCartDraft();
  if(restored)showCartToast("Recuperamos "+restored+" unidad"+(restored===1?"":"es")+" de tu carrito.");
  if(removed)console.info("Se ajustaron artículos guardados que ya no están disponibles o superaban el inventario.");
 }catch(e){console.warn("No se pudo recuperar el carrito guardado:",e)}
}
function clearSavedCart(){
 if(!cart.size)return;
 if(!confirm("¿Vaciar todos los productos del carrito?"))return;
 cart.clear();saveCartDraft();renderCart();showCartToast("Tu carrito está vacío.");
 document.querySelectorAll(".product-added-badge,.product-added-note").forEach(el=>el.remove());
 document.querySelectorAll(".quick-view-info .product-added-confirmation").forEach(el=>el.remove());
 document.querySelectorAll("[data-modal-add]").forEach(button=>{button.textContent="Agregar al carrito";button.classList.remove("is-added")});
}
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=(n,c="NIO")=>{try{return new Intl.NumberFormat("es-NI",{style:"currency",currency:c||"NIO"}).format(Number(n||0))}catch{return `C$ ${Number(n||0).toFixed(2)}`}};
const attrs=v=>v?.attributes&&typeof v.attributes==="object"?v.attributes:{};
const url=p=>{const value=String(p||"").trim();const prefix="https://ftzfsxcnfcqdmwhpardt.supabase.co/storage/v1/object/public/product-images/";if(value.startsWith(prefix))return value;if(!value||/^https?:/i.test(value))return "";return supabase.storage.from("product-images").getPublicUrl(value).data?.publicUrl||"";};
const isColorAttribute=k=>["color","colores"].includes(norm(k));
// Unifica nombres equivalentes: Color, Colores y variantes con acentos/mayúsculas.
const canonicalAttribute=k=>{
 const key=norm(k);
 return ["color","colores","colore"].includes(key)?"color":key;
};
const sameAttributeValue=(a,b)=>norm(a)===norm(b);
function rulesMatchSelection(rules,selected){
 return Object.entries(rules||{}).every(([ruleKey,ruleValue])=>{
  const selectedEntry=Object.entries(selected||{}).find(([selectedKey])=>canonicalAttribute(selectedKey)===canonicalAttribute(ruleKey));
  return Boolean(selectedEntry)&&sameAttributeValue(selectedEntry[1],ruleValue);
 });
}
function preferredImage(images){
 return [...images].sort((a,b)=>(Number(Boolean(b.is_primary))-Number(Boolean(a.is_primary)))||((Number(a.sort_order)||0)-(Number(b.sort_order)||0)))[0]||null;
}
function keys(p){return [...new Set(p.variants.flatMap(v=>Object.keys(attrs(v)).filter(k=>!k.startsWith("_"))))].sort((a,b)=>(isColorAttribute(a)?-1:0)-(isColorAttribute(b)?-1:0)||a.localeCompare(b,"es"))}
function chosen(p){if(!selection.has(p.id)){const v=p.variants.find(x=>Number(x.stock)>0)||p.variants[0];selection.set(p.id,{...attrs(v)})}return selection.get(p.id)}
function matches(v,s,skip=null,value=null){return Object.entries(s).every(([k,x])=>k===skip||String(attrs(v)[k]??"")===String(x??""))&&(skip===null||String(attrs(v)[skip]??"")===String(value??""))}
function variant(p){const s=chosen(p),ks=keys(p);return p.variants.find(v=>ks.every(k=>String(attrs(v)[k]??"")===String(s[k]??"")))||(ks.length===0?p.variants[0]:null)}
function img(p,v){
 const selected=attrs(v)||{};
 const color=Object.entries(selected).find(([k])=>isColorAttribute(k));
 const legacyColor=color&&p.colors.find(x=>sameAttributeValue(x.name,color[1]));

 // Primero limita la búsqueda a la variante y al color seleccionados.
 // Las imágenes generales siguen disponibles como respaldo, pero no pueden
 // desplazar una imagen asignada específicamente a la variante.
 const scoped=p.images.filter(image=>{
  if(image.variant_id&&image.variant_id!==v?.id)return false;
  if(image.color_id&&image.color_id!==legacyColor?.id)return false;
  return true;
 });

 const variantScoped=v?scoped.filter(image=>image.variant_id===v.id):[];
 const candidates=variantScoped.length?variantScoped:scoped;

 // Dentro del ámbito correcto, los atributos visuales ayudan a elegir
 // la imagen, pero nunca deben mezclar imágenes de otra variante.
 const mapped=candidates.filter(image=>{
  const rules=image.attributeValues||{};
  return Object.keys(rules).length>0&&rulesMatchSelection(rules,selected);
 }).sort((a,b)=>(Number(Boolean(b.is_primary))-Number(Boolean(a.is_primary)))||
  (Object.keys(b.attributeValues||{}).length-Object.keys(a.attributeValues||{}).length)||
  ((Number(a.sort_order)||0)-(Number(b.sort_order)||0)));

 if(mapped.length)return mapped[0];

 // Si no hay coincidencia por atributos, usa la galería específica
 // de la variante; si no existe, la del color y finalmente la general.
 return preferredImage(candidates);
}
function galleryImages(p,v){
 const selected=attrs(v)||{}, color=Object.entries(selected).find(([k])=>isColorAttribute(k));
 const legacyColor=color&&p.colors.find(x=>sameAttributeValue(x.name,color[1]));
 const relevant=p.images.filter(image=>{
  const rules=image.attributeValues||{};
  if(!rulesMatchSelection(rules,selected))return false;
  if(image.variant_id&&image.variant_id!==v?.id)return false;
  if(image.color_id&&image.color_id!==legacyColor?.id)return false;
  return true;
 }).sort((a,b)=>(Number(Boolean(b.is_primary))-Number(Boolean(a.is_primary)))||((Number(a.sort_order)||0)-(Number(b.sort_order)||0)));
 const chosenImage=img(p,v);
 if(chosenImage){const index=relevant.findIndex(x=>x.id===chosenImage.id);if(index>0)relevant.unshift(...relevant.splice(index,1));else if(index<0)relevant.unshift(chosenImage);}
 const seen=new Set();return relevant.filter(x=>{const key=x.id||x.image_path;if(seen.has(key))return false;seen.add(key);return true;});
}
function basePrice(p,v){return Number(v?.price_override??p.price??0)}
function discountActive(d){if(!d?.discount_type||!(Number(d.discount_value)>0))return false;const now=Date.now(),start=d.discount_starts_at?new Date(d.discount_starts_at).getTime():-Infinity,end=d.discount_ends_at?new Date(d.discount_ends_at).getTime():Infinity;return now>=start&&now<end}
function pricing(p,v){const original=basePrice(p,v);let d=p;if(v?.discount_mode==='none')d=null;else if(v?.discount_mode==='override')d=v;const active=discountActive(d);let final=original;if(active){const raw=d.discount_type==='percent'?original*(1-Number(d.discount_value)/100):original-Number(d.discount_value);final=Math.max(0,Math.min(original,raw))}return {original,final,active:active&&final<original,percent:original>0?Math.round((original-final)/original*100):0}}
function price(p,v){return pricing(p,v).final}
function priceMarkup(p,v){const x=pricing(p,v);return x.active?`<span class="price-before">${money(x.original,currencyOf(p))}</span><strong class="price-current">${money(x.final,currencyOf(p))}</strong><span class="discount-badge">-${x.percent}%</span>`:`<strong class="price-current">${money(x.final,currencyOf(p))}</strong>`}
function currencyOf(p){return catalogSettings.currency_code||p.currency||"NIO"}
function applyCatalogSettings(){
 if(/^#[0-9a-f]{6}$/i.test(catalogSettings.accent_color||""))document.documentElement.style.setProperty("--accent",catalogSettings.accent_color);
 if(/^#[0-9a-f]{6}$/i.test(catalogSettings.page_color||""))document.documentElement.style.setProperty("--page",catalogSettings.page_color);
 const header=document.querySelector(".site-header");
 const bannerPath=typeof catalogSettings.banner_path==="string"?catalogSettings.banner_path.trim():"";
 const bannerUrl=bannerPath?url(bannerPath):"";
 const bannerEnabled=typeof catalogSettings.banner_enabled==="boolean"?catalogSettings.banner_enabled:Boolean(bannerPath);
 const backgroundPath=typeof catalogSettings.background_path==="string"?catalogSettings.background_path.trim():"";
 const backgroundUrl=backgroundPath?url(backgroundPath):"";
 const backgroundEnabled=typeof catalogSettings.background_enabled==="boolean"?catalogSettings.background_enabled:Boolean(backgroundPath);
 const overlay=Math.max(0,Math.min(0.85,Number(catalogSettings.background_overlay??35)/100));
 if(header){
  header.classList.toggle("has-banner",Boolean(bannerEnabled&&bannerUrl));
  header.style.backgroundImage=bannerEnabled&&bannerUrl?'linear-gradient(0deg,rgba(40,20,30,.04),rgba(40,20,30,.04)),url("'+bannerUrl+'")':"none";
  header.style.backgroundColor="var(--accent-soft)";
  header.setAttribute("aria-label",bannerEnabled&&bannerUrl?"Portada de colección":"Navegación del catálogo");
 }
 if(backgroundEnabled&&backgroundUrl){
  document.body.style.backgroundImage='linear-gradient(rgba(255,255,255,'+overlay+'),rgba(255,255,255,'+overlay+')),url("'+backgroundUrl+'")';
  document.body.style.backgroundAttachment="fixed";
  document.body.style.backgroundSize="cover";
  document.body.style.backgroundPosition="center";
  document.body.style.backgroundRepeat="no-repeat";
  document.body.classList.add("has-catalog-background");
 }else{
  document.body.style.backgroundImage="none";
  document.body.style.backgroundColor="var(--page)";
  document.body.style.backgroundAttachment="";
  document.body.classList.remove("has-catalog-background");
 }
 renderContactElements();
}
function safeExternalUrl(value){
 try{const parsed=new URL(String(value||"").trim());return parsed.protocol==="https:"?parsed.href:"";}catch{return "";}
}
function whatsappDigits(){return String(catalogSettings.whatsapp_number||"").replace(/\D/g,"");}
function renderContactElements(){
 const footer=document.querySelector(".site-footer");
 if(footer){
  const brand=String(catalogSettings.brand_name||"Concept by Lily").trim()||"Concept by Lily";
  const socials=[["Instagram",safeExternalUrl(catalogSettings.instagram_url),"instagram"],["Facebook",safeExternalUrl(catalogSettings.facebook_url),"facebook"]].filter(([,href])=>href);
  footer.innerHTML=`<div class="footer-inner"><a class="footer-brand" href="../">${esc(brand)}</a><div class="footer-socials" aria-label="Redes sociales">${socials.map(([label,href,kind])=>`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="Visitar ${label}"><span class="footer-social-icon ${kind}" aria-hidden="true">${kind==="instagram"?"◎":"f"}</span>${label}</a>`).join("")}</div><small>© ${new Date().getFullYear()} ${esc(brand)}. Todos los derechos reservados.</small></div>`;
 }
 const digits=whatsappDigits();
 let contact=document.getElementById("catalogWhatsappContact");
 if(digits){
  if(!contact){contact=document.createElement("a");contact.id="catalogWhatsappContact";contact.className="catalog-whatsapp-contact";contact.target="_blank";contact.rel="noopener noreferrer";contact.setAttribute("aria-label","Contactar por WhatsApp");contact.innerHTML='<span class="catalog-whatsapp-mark" aria-hidden="true">✆</span><span>WhatsApp</span>';document.body.append(contact);}
  contact.href=`https://wa.me/${digits}`;
 }else if(contact){contact.remove();}
}
function renderCategories(){ $("categoryNav").innerHTML=[`<button class="category-btn ${activeCategory==="all"?"active":""}" data-category="all">Todos</button>`,...categories.map(c=>`<button class="category-btn ${activeCategory===c.id?"active":""}" data-category="${esc(c.id)}">${esc(c.name)}</button>`)].join("");$("categoryNav").querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;renderCategories();renderProducts()})}
function options(p,k,s){const vals=[...new Set(p.variants.map(v=>attrs(v)[k]).filter(x=>x!=null).map(String))],color=isColorAttribute(k),colors=new Map(p.colors.map(c=>[norm(c.name),c]));return `<div class="variant-group"><span class="variant-label">${esc(k)}</span><div class="${color?"color-options":"value-options"}">${vals.map(val=>{const ok=p.variants.some(v=>Number(v.stock)>0&&matches(v,s,k,val)),sel=String(s[k]??"")===val,c=colors.get(norm(val));return `<button type="button" class="${color?"color-option":"value-option"} ${sel?"selected":""} ${ok?"":"sold-out"}" data-attr="${esc(k)}" data-val="${esc(val)}" ${ok?"":"disabled"} ${color?`style="--swatch:${esc(c?.hex_code||"#b9a5aa")}" title="${esc(val)}"`:""}>${color?'<span class="swatch"></span><span class="sr-only">'+esc(val)+'</span>':esc(val)}</button>`}).join("")}</div></div>`}
function catalogCover(p){
 // Portada independiente de las galerías por color y variante.
 return p.images.find(image=>image.is_catalog_cover===true)||
  p.images.find(image=>!image.variant_id&&!image.color_id&&image.is_primary)||
  p.images.find(image=>!image.variant_id&&!image.color_id)||
  [...p.images].sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0))[0]||null;
}
function card(p){const v=variant(p),stock=Number(v?.stock||0),off=!v||stock<=0,im=catalogCover(p);return `<article class="product-card ${off?"is-unavailable":""}" data-pid="${esc(p.id)}"><button type="button" class="product-card-open" data-open="${esc(p.id)}" aria-label="Ver detalles de ${esc(p.name)}"><div class="product-image-wrap">${im?`<img class="product-image" src="${esc(url(im.image_path))}" alt="${esc(p.name)}" loading="lazy">`:'<div class="image-placeholder">Imagen próximamente</div>'}</div><div class="product-content"><p class="product-category">${esc(p.category?.name||"")}</p><h2>${esc(p.name)}</h2>${catalogSettings.show_prices?`<div class="product-price">${priceMarkup(p,v)}</div>`:""}${catalogSettings.show_stock?`<div class="availability">${off?'<span class="stock-badge">AGOTADO</span>':`<span class="stock-note">${stock} disponible${stock===1?"":"s"}</span>`}</div>`:""}<span class="quick-view-hint">Ver detalles y opciones</span></div></button></article>`}
function renderQuickView(id){
 const p=products.find(x=>x.id===id);if(!p)return;quickViewProductId=id;
 const s=chosen(p),v=variant(p),stock=Number(v?.stock||0),off=!v||stock<=0,images=galleryImages(p,v),im=images[Math.min(quickViewImageIndex,images.length-1)]||images[0],details=p.details&&typeof p.details==="object"?Object.entries(p.details).filter(([k,val])=>k!=="_variant_descriptions"&&String(k).trim()&&String(val??"").trim()):[],variantDescriptions=Array.isArray(p.details?._variant_descriptions)?p.details._variant_descriptions:[],matchedDescription=variantDescriptions.find(rule=>rule&&rule.attribute&&rule.value&&String(rule.description||"").trim()&&rulesMatchSelection({[rule.attribute]:rule.value},s)),activeDescription=String(matchedDescription?.description??p.description??"").trim();
 if(!images.length)quickViewImageIndex=0;else if(quickViewImageIndex>=images.length)quickViewImageIndex=0;
 const activeImage=images[quickViewImageIndex]||images[0];
 const modal=$("quickViewModal"),body=$("quickViewBody");
 body.innerHTML=`<div class="quick-view-layout"><div class="quick-view-gallery"><div class="quick-view-media">${activeImage?`<img class="quick-view-main-image" src="${esc(url(activeImage.image_path))}" alt="${esc(p.name)}">`:'<div class="image-placeholder">Imagen próximamente</div>'}${images.length>1?`<button type="button" class="gallery-arrow gallery-prev" data-gallery-prev aria-label="Imagen anterior">‹</button><button type="button" class="gallery-arrow gallery-next" data-gallery-next aria-label="Imagen siguiente">›</button>`:""}</div>${images.length>1?`<div class="quick-view-thumbnails">${images.map((image,index)=>`<button type="button" class="quick-view-thumb ${index===quickViewImageIndex?"active":""}" data-gallery-index="${index}" aria-label="Ver imagen ${index+1}"><img src="${esc(url(image.image_path))}" alt=""></button>`).join("")}</div><p class="gallery-counter">${quickViewImageIndex+1} de ${images.length} imágenes</p>`:""}</div><div class="quick-view-info"><p class="product-category">${esc(p.category?.name||"")}</p><h2>${esc(p.name)}</h2>${catalogSettings.show_prices?`<div class="product-price">${priceMarkup(p,v)}</div>`:""}${catalogSettings.show_descriptions?`${activeDescription?`<section class="quick-view-description"><h3>Descripción</h3><p>${esc(activeDescription)}</p></section>`:""}${details.map(([k,val])=>`<section class="quick-view-detail"><h3>${esc(k)}</h3><p>${esc(val)}</p></section>`).join("")}`:""}<div class="quick-view-variants">${keys(p).map(k=>options(p,k,s)).join("")}</div>${catalogSettings.show_stock?`<div class="availability">${off?'<span class="stock-badge">AGOTADO</span>':`<span class="stock-note">${stock} disponible${stock===1?"":"s"}</span>`}</div>`:""}<button class="add-button" data-modal-add="${esc(p.id)}" ${off?"disabled":""}>${off?"No disponible":"Agregar al carrito"}</button></div></div>`;
 if(!quickViewHistoryOpen){history.pushState({...history.state,conceptQuickView:true},"",location.href);quickViewHistoryOpen=true;}modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");
 body.querySelectorAll("[data-attr]").forEach(b=>b.onclick=()=>{chosen(p)[b.dataset.attr]=b.dataset.val;quickViewImageIndex=0;renderQuickView(id)});
 body.querySelectorAll("[data-gallery-index]").forEach(b=>b.onclick=()=>{quickViewImageIndex=Number(b.dataset.galleryIndex);renderQuickView(id)});
 body.querySelector("[data-gallery-prev]")?.addEventListener("click",()=>{quickViewImageIndex=(quickViewImageIndex-1+images.length)%images.length;renderQuickView(id)});
 body.querySelector("[data-gallery-next]")?.addEventListener("click",()=>{quickViewImageIndex=(quickViewImageIndex+1)%images.length;renderQuickView(id)});
 body.querySelector("[data-modal-add]")?.addEventListener("click",e=>add(id,e.currentTarget));
}
function closeQuickView(fromPopState=false){const modal=$("quickViewModal");if(!modal.classList.contains("open"))return;modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open");quickViewProductId=null;if(quickViewHistoryOpen){quickViewHistoryOpen=false;if(!fromPopState)history.back();}}
function renderProducts(){
 const q=norm($("productSearch").value);
 const list=products.filter(p=>(catalogSettings.show_out_of_stock||p.variants.some(v=>Number(v.stock)>0))&&(activeCategory==="all"||p.category_id===activeCategory)&&norm([p.name,p.description,p.category?.name].join(" ")).includes(q));
 $("productCount").textContent=`${list.length} ${list.length===1?"producto":"productos"}`;
 if(!list.length){
  $("productsContainer").innerHTML=`<div class="empty-state"><h2>${products.length?"No encontramos productos":"Estamos preparando esta colección"}</h2><p>${products.length?"Prueba con otra búsqueda o categoría.":"Pronto encontrarás aquí los productos disponibles."}</p></div>`;
  return;
 }
 const categoryOrder=new Map(categories.map((category,index)=>[category.id,index]));
 const grouped=new Map();
 list.forEach(product=>{
  const key=product.category_id||"uncategorized";
  if(!grouped.has(key))grouped.set(key,{name:product.category?.name||"Otros productos",products:[]});
  grouped.get(key).products.push(product);
 });
 const groups=[...grouped.entries()].sort((a,b)=>(categoryOrder.get(a[0])??9999)-(categoryOrder.get(b[0])??9999)||a[1].name.localeCompare(b[1].name,"es"));
 $("productsContainer").innerHTML=groups.map(([id,group])=>`<section class="category-group" data-category-group="${esc(id)}"><header class="category-heading"><div class="category-heading-copy"><span class="category-eyebrow">Explora la colección</span><h2>${esc(group.name)}</h2></div><span class="category-heading-count">${group.products.length} ${group.products.length===1?"producto":"productos"}</span></header><div class="category-products">${group.products.map(card).join("")}</div></section>`).join("");
 $("productsContainer").querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>renderQuickView(b.dataset.open));
}
const addCooldown=new Map();
function ensureCartFeedback(){
 if(!$("floatingCart")){
  const button=document.createElement("button");button.id="floatingCart";button.className="floating-cart";button.type="button";button.setAttribute("aria-label","Ver carrito");
  button.innerHTML='<span class="floating-cart-icon" aria-hidden="true">🛒</span><span class="floating-cart-label">Carrito</span><span class="floating-cart-count" id="floatingCartCount">0</span>';
  button.addEventListener("click",()=>{if(quickViewProductId)closeQuickView();const goToCart=()=>{$("cartTitle")?.scrollIntoView({behavior:"smooth",block:"center"});$("cart")?.focus?.({preventScroll:true})};requestAnimationFrame(()=>requestAnimationFrame(goToCart))});
  document.body.appendChild(button);
 }
 if(!$("cartToast")){const toast=document.createElement("div");toast.id="cartToast";toast.className="cart-toast";toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");document.body.appendChild(toast)}
}
let cartToastTimer=null;
function showCartToast(message){
 ensureCartFeedback();const toast=$("cartToast");toast.innerHTML='<span class="cart-toast-check">✓</span><span>'+esc(message)+'</span>';toast.classList.add("visible");clearTimeout(cartToastTimer);cartToastTimer=setTimeout(()=>toast.classList.remove("visible"),2100);
}
function showProductCardAdded(productId,variantQuantity){
 const productQuantity=[...cart.values()].filter(item=>item.key.startsWith(productId+":")).reduce((sum,item)=>sum+item.quantity,0);
 const card=[...document.querySelectorAll(".product-card")].find(el=>el.dataset.pid===productId);
 if(card){
  const image=card.querySelector(".product-image-wrap");
  if(image){let badge=image.querySelector(".product-added-badge");if(!badge){badge=document.createElement("span");badge.className="product-added-badge";image.appendChild(badge)}badge.textContent="✓ En tu carrito · "+productQuantity;}
  let note=card.querySelector(".product-added-note");if(!note){note=document.createElement("span");note.className="product-added-note";card.querySelector(".product-content")?.appendChild(note)}
  if(note)note.textContent="En tu carrito · "+productQuantity+" unidad"+(productQuantity===1?"":"es");
 }
 const modalButton=document.querySelector("[data-modal-add='"+CSS.escape(productId)+"']");
 if(modalButton){modalButton.textContent="Agregado ✓ · "+variantQuantity;modalButton.classList.add("is-added");}
 const info=document.querySelector(".quick-view-info");
 if(info){
  let status=info.querySelector(".product-added-confirmation");
  if(!status){status=document.createElement("p");status.className="product-added-confirmation";status.setAttribute("role","status");info.querySelector("[data-modal-add]")?.insertAdjacentElement("afterend",status)}
  if(status)status.textContent="✓ Tienes "+variantQuantity+" unidad"+(variantQuantity===1?"":"es")+" de esta variante en tu carrito.";
 }
}
function add(id,sourceButton){
 const p=products.find(x=>x.id===id),v=variant(p);if(!p||!v||Number(v.stock)<=0)return false;
 const key=p.id+":"+v.id,now=Date.now(),until=addCooldown.get(key)||0;
 if(now<until){showCartToast("Espera un instante para agregar otra unidad.");return false}
 const item=cart.get(key),qty=(item?.quantity||0)+1;
 if(qty>Number(v.stock)){showCartToast("No hay más unidades disponibles.");return false}
 addCooldown.set(key,now+750);
 const pricingInfo=pricing(p,v);
 cart.set(key,{key,variant_id:v.id,name:p.name,price:Number(pricingInfo.final),originalPrice:Number(pricingInfo.original),discounted:pricingInfo.active,currency:currencyOf(p),attributes:attrs(v),quantity:qty,stock:Number(v.stock)});
 renderCart();showProductCardAdded(p.id,qty);showCartToast("¡"+p.name+" agregado al carrito!");
 if(sourceButton){
  sourceButton.disabled=true;
  sourceButton.textContent="Agregado ✓ · "+qty;
  sourceButton.classList.add("is-added");
  setTimeout(()=>{
   if(!sourceButton.isConnected)return;
   sourceButton.disabled=false;
   sourceButton.classList.remove("is-added");
   sourceButton.textContent="Agregar otra unidad · "+qty;
  },750);
 }
 return true;
}
function renderCart(){saveCartDraft();const items=[...cart.values()];ensureCartFeedback();const quantity=items.reduce((sum,item)=>sum+item.quantity,0);$("floatingCartCount").textContent=quantity;$("floatingCartCount").hidden=quantity===0;$("floatingCart").classList.toggle("has-items",quantity>0);if(!$("clearCartBtn")){const clear=document.createElement("button");clear.id="clearCartBtn";clear.type="button";clear.className="clear-cart-button";clear.textContent="Vaciar carrito";clear.onclick=clearSavedCart;$("total").insertAdjacentElement("afterend",clear)}$("clearCartBtn").hidden=!items.length;if(!items.length){$("cartItems").innerHTML='<p class="empty-cart">Tu carrito está vacío.</p>';$("total").textContent=`Total: ${money(0)}`;return}let total=0;$("cartItems").innerHTML=items.map(i=>{const sub=i.price*i.quantity;total+=sub;const a=Object.entries(i.attributes).map(([k,v])=>`${esc(k)}: ${esc(v)}`).join(" · ");return `<div class="cart-item"><div><strong>${esc(i.name)}</strong>${a?`<small>${a}</small>`:""}<small>${i.quantity} × ${i.discounted?`<s>${money(i.originalPrice,i.currency)}</s> `:""}${money(i.price,i.currency)} = ${money(sub,i.currency)}</small></div><button class="remove-button" data-remove="${esc(i.key)}">−</button></div>`}).join("");$("total").textContent=`Total: ${money(total)}`;$("cartItems").querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{const i=cart.get(b.dataset.remove);if(i.quantity>1)i.quantity--;else cart.delete(b.dataset.remove);renderCart();showCartToast("Carrito actualizado.")})}
function invoice(){
 const items=[...cart.values()];if(!items.length){alert("Agrega productos al carrito primero.");return}
 activeOrderRequestId=activeOrderRequestId||crypto.randomUUID();registeredOrder=null;$("shareInvoice").hidden=true;$("shareInvoice").disabled=true;
 $("invoiceArea").innerHTML='<div class="checkout-card"><h2>'+esc(catalogSettings.brand_name||"Concept by Lily")+'</h2><p>Completa tus datos para registrar el pedido.</p><form id="checkoutForm" class="checkout-form"><label>Nombre completo<input name="customer_name" required minlength="2" maxlength="120"></label><label>Teléfono<input name="customer_phone" required minlength="8" maxlength="30"></label><label>Modalidad<select name="delivery_method"><option value="to_agree">Por coordinar</option><option value="pickup">Retiro</option><option value="delivery">Envío a domicilio</option></select></label><label>Dirección<textarea name="delivery_address" rows="2" maxlength="500"></textarea></label><label>Notas<textarea name="customer_notes" rows="2" maxlength="500"></textarea></label><label>Método de pago<select name="payment_method" required><option value="transfer">Transferencia</option><option value="cash">Efectivo</option></select></label><div class="checkout-summary"><strong>Resumen</strong><span>'+items.length+' línea(s) · '+money(items.reduce((s,i)=>s+i.price*i.quantity,0))+'</span></div><button type="submit" class="checkout-submit" id="submitOrder">Registrar pedido</button><p id="checkoutMessage" role="status"></p></form></div>';
 $("invoiceModal").classList.add("open");$("checkoutForm").addEventListener("submit",registerOrder);
}
let activeOrderRequestId=null,registeredOrder=null;
async function registerOrder(e){
 e.preventDefault();const form=e.currentTarget,button=$("submitOrder"),message=$("checkoutMessage"),data=new FormData(form);button.disabled=true;button.textContent="Registrando…";
 try{
 const items=[...cart.values()],customer={name:String(data.get("customer_name")).trim(),phone:String(data.get("customer_phone")).trim(),method:String(data.get("delivery_method")),payment:String(data.get("payment_method")||"cash"),address:String(data.get("delivery_address")||"").trim()};
 const {data:result,error}=await supabase.rpc("create_public_order_with_payment",{p_store_id:cfg.storeId,p_client_request_id:activeOrderRequestId,p_customer_name:customer.name,p_customer_phone:customer.phone,p_delivery_method:customer.method,p_delivery_address:customer.address||null,p_customer_notes:String(data.get("customer_notes")||"").trim()||null,p_items:items.map(i=>({variant_id:i.variant_id,quantity:i.quantity})),p_payment_method:String(data.get("payment_method")||"cash")});if(error)throw error;
 const savedItems=Array.isArray(result.items)?result.items.map(i=>({name:i.product_name,price:Number(i.unit_price),originalPrice:Number(i.original_unit_price),discounted:Number(i.original_unit_price)>Number(i.unit_price),currency:i.currency,attributes:i.attributes||{},quantity:Number(i.quantity)})):items;const total=Number(result.total??savedItems.reduce((s,i)=>s+i.price*i.quantity,0));
 $("invoiceArea").innerHTML='<div class="invoice invoice-saved"><p class="invoice-kicker">PEDIDO REGISTRADO</p><h2>'+esc(catalogSettings.brand_name||"Concept by Lily")+'</h2><div class="invoice-order-number">Pedido #'+esc(result.order_number)+'</div><p>Estado: Pendiente de confirmación</p><p>Cliente: '+esc(customer.name)+'</p><p>Teléfono: '+esc(customer.phone)+'</p><p>Pago: '+esc(customer.payment==="transfer"?"Transferencia":"Efectivo")+'</p><p>Entrega: '+esc(({pickup:"Retiro",delivery:"Envío a domicilio",to_agree:"Por coordinar"})[customer.method])+'</p>'+(customer.address?'<p>Dirección: '+esc(customer.address)+'</p>':'')+'<hr>'+savedItems.map(i=>'<div class="invoice-line"><strong>'+esc(i.name)+'</strong><small>'+Object.entries(i.attributes||{}).map(([k,v])=>esc(k)+": "+esc(v)).join(" · ")+'</small><span>'+i.quantity+' × '+money(i.price,i.currency)+' = '+money(i.price*i.quantity,i.currency)+'</span></div>').join("")+'<hr><h2 class="invoice-total">Total: '+money(total,items[0]?.currency||"NIO")+'</h2><p>Conserva este número para consultar el estado de tu pedido.</p></div>';
 registeredOrder={id:result.order_id,number:result.order_number};$("shareInvoice").hidden=false;$("shareInvoice").disabled=false;cart.clear();renderCart();activeOrderRequestId=null;
 }catch(err){console.error(err);message.textContent=err.message||"No fue posible registrar el pedido.";button.disabled=false;button.textContent="Reintentar registro"}
}
function normalizeTrackingPhone(value){
 let digits=String(value||"").replace(/\D/g,"");
 if(digits.startsWith("00"))digits=digits.slice(2);
 if(digits.length===8)digits="505"+digits;
 return digits.length>=10&&digits.length<=15?"+"+digits:"";
}
let currentTrackedOrders=[];
function formatOrderDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?"":date.toLocaleString("es-NI");}
function trackingMode(){
 return document.querySelector('[data-track-mode].active')?.dataset.trackMode||"phone";
}
function setTrackingMode(mode){
 document.querySelectorAll("[data-track-mode]").forEach(button=>button.classList.toggle("active",button.dataset.trackMode===mode));
 const phoneField=$("trackOrderPhoneField"),numberField=$("trackOrderNumberField");
 if(phoneField)phoneField.hidden=mode!=="phone";
 if(numberField)numberField.hidden=mode!=="number";
 $("trackOrderPhone").required=mode==="phone";
 $("trackOrderNumber").required=mode==="number";
 $("trackOrderResult").textContent="";
}
function renderCustomerOrders(rows){
 currentTrackedOrders=rows||[];
 const box=$("trackOrderResult");
 if(!currentTrackedOrders.length){box.textContent="No encontramos pedidos asociados a este número telefónico.";return}
 box.innerHTML='<div class="customer-orders-list">'+currentTrackedOrders.map(order=>{
  const status=orderStatusLabels[order.status]||order.status;
  return '<article class="customer-order-status"><div class="customer-order-status-head"><strong>Pedido #'+esc(order.order_number)+'</strong><span class="order-status '+esc(order.status)+'">'+esc(status)+'</span></div><p>'+esc(order.store_name||"Concept by Lily")+'</p><time>'+esc(formatOrderDate(order.created_at))+'</time><button type="button" class="customer-order-details" data-order-number="'+esc(order.order_number)+'">Ver detalle del pedido</button></article>';
 }).join("")+'</div><button type="button" class="customer-order-whatsapp" id="trackAnotherPhone">Consultar otro número</button>';
 box.querySelectorAll("[data-order-number]").forEach(button=>button.addEventListener("click",()=>showOrderDetails(button.dataset.orderNumber,true)));
 $("trackAnotherPhone")?.addEventListener("click",()=>{
  $("trackOrderPhone").value="";$("trackOrderResult").textContent="";$("trackOrderPhone").focus();
 });
}
function renderOrderDetails(order){
 const box=$("trackOrderResult"),status=orderStatusLabels[order.status]||order.status;
 const paymentLabels={pending:"Pendiente",pending_payment:"Pendiente",paid:"Pagado",partially_paid:"Pago parcial",refunded:"Reembolsado",failed:"No procesado",cancelled:"Cancelado"};
 const deliveryLabels={pickup:"Retiro en tienda",delivery:"Envío a domicilio",to_agree:"Entrega por coordinar"};
 const items=Array.isArray(order.items)?order.items:[];
 const history=Array.isArray(order.status_history)?order.status_history:[];
 const itemMarkup=items.map(item=>{
  const attributes=item.attributes&&typeof item.attributes==="object"?Object.entries(item.attributes).filter(([key])=>!String(key).startsWith("_")).map(([key,value])=>esc(key)+": "+esc(value)).join(" · "):"";
  return '<article class="customer-order-item"><div><strong>'+esc(item.product_name||"Producto")+'</strong>'+(attributes?'<small>'+attributes+'</small>':'')+'<small>'+Number(item.quantity||0)+' × '+money(item.unit_price,item.currency||order.currency)+'</small></div><strong>'+money(item.line_total,item.currency||order.currency)+'</strong></article>';
 }).join("");
 const timeline=history.map(entry=>'<li><div><span>'+esc(orderStatusLabels[entry.status]||entry.status||"Actualización")+'</span></div><time>'+esc(formatOrderDate(entry.created_at))+'</time></li>').join("");
 box.innerHTML='<button type="button" class="customer-order-whatsapp" id="backToCustomerOrders">← Volver a pedidos</button><article class="customer-order-status customer-order-detail"><div class="customer-order-status-head"><strong>Pedido #'+esc(order.order_number)+'</strong><span class="order-status '+esc(order.status)+'">'+esc(status)+'</span></div><p>'+esc(order.store_name||"Concept by Lily")+'</p><time>'+esc(formatOrderDate(order.created_at))+'</time><div class="customer-order-meta"><p><span>Entrega</span><strong>'+esc(deliveryLabels[order.delivery_method]||"Por coordinar")+'</strong></p><p><span>Pago</span><strong>'+esc(paymentLabels[order.payment_status]||"Estado pendiente de actualización")+'</strong></p></div><h3>Resumen de tu compra</h3><div class="customer-order-items">'+(itemMarkup||"<p>No hay artículos disponibles para mostrar.</p>")+'</div><div class="customer-order-totals"><p><span>Subtotal</span><strong>'+money(order.subtotal,order.currency)+'</strong></p>'+(Number(order.discount_total)>0?'<p><span>Descuento</span><strong>−'+money(order.discount_total,order.currency)+'</strong></p>':'')+'<p class="customer-order-grand-total"><span>Total</span><strong>'+money(order.total,order.currency)+'</strong></p></div></article>'+(timeline?'<section class="customer-order-history"><h3>Seguimiento</h3><ol class="customer-order-timeline">'+timeline+'</ol></section>':'');
 $("backToCustomerOrders")?.addEventListener("click",()=>renderCustomerOrders(currentTrackedOrders));
}
async function showOrderDetails(orderNumber,fromPhone=false){
 const box=$("trackOrderResult");
 const number=String(orderNumber||"").replace(/\D/g,"");
 if(!number||number.length>18){box.textContent="Ingresa un número de pedido válido.";return}
 box.textContent="Cargando detalle del pedido…";
 try{
  const {data,error}=await supabase.rpc("get_public_order_details_by_number",{p_order_number:number});
  if(error)throw error;
  const order=Array.isArray(data)?data[0]:data;
  if(!order){box.textContent="No encontramos un pedido con ese número.";return}
  renderOrderDetails(order);
 }catch(err){
  console.error("No se pudo consultar el detalle del pedido:",err);
  box.textContent=err?.message||"No fue posible consultar el pedido. Inténtalo nuevamente.";
 }
}
async function trackOrder(){
 const box=$("trackOrderResult"),button=$("trackOrderSubmit"),mode=trackingMode();
 button.disabled=true;button.textContent="Consultando…";
 try{
  if(mode==="number"){
   const number=String($("trackOrderNumber").value||"").replace(/\D/g,"");
   if(!number||number.length>18){box.textContent="Ingresa un número de pedido válido.";return}
   await showOrderDetails(number,false);
   return;
  }
  const phone=normalizeTrackingPhone($("trackOrderPhone").value);
  if(!phone){box.textContent="Ingresa un número válido. Para Nicaragua, puedes escribir los 8 dígitos locales.";return}
  box.textContent="Buscando pedidos asociados al teléfono…";
  const {data,error}=await supabase.rpc("get_customer_order_statuses_by_phone",{p_phone:phone});
  if(error)throw error;
  renderCustomerOrders(data||[]);
 }catch(err){
  console.error("No se pudieron consultar los pedidos:",err);
  box.textContent=err?.message||"No fue posible consultar los pedidos. Inténtalo nuevamente.";
 }finally{
  button.disabled=false;button.textContent="Consultar";
 }
}
const orderStatusLabels={pending_confirmation:"Pendiente de confirmación",confirmed:"Confirmado",preparing:"En preparación",ready_for_delivery:"Listo para entregar",in_transit:"En camino",delivered:"Entregado",cancelled_by_customer:"Cancelado por ti",cancelled_by_store:"Cancelado por la tienda",rejected:"Rechazado"};
async function share(){try{if(!registeredOrder?.id||!$("invoiceArea").querySelector(".invoice-saved"))throw new Error("Primero registra el pedido para poder compartir su comprobante.");if(!window.html2canvas)throw Error("No se cargó html2canvas");const canvas=await html2canvas($("invoiceArea"),{backgroundColor:"#fff",scale:2}),blob=await new Promise(r=>canvas.toBlob(r,"image/png"));if(!blob)throw Error("No se generó la imagen");const file=new File([blob],"Pedido-Concept-by-Lily.png",{type:"image/png"});if(navigator.share&&navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:"Pedido Concept by Lily",text:"Hola, me gustaría realizar este pedido."});else{const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=file.name;a.click();URL.revokeObjectURL(u);alert("La proforma se descargó. Puedes adjuntarla en WhatsApp.")}}catch(e){if(!String(e.message).toLowerCase().includes("cancel")){console.error(e);alert("No fue posible compartir la proforma.")}}}
async function load(){
 $("catalogMessage").textContent="Cargando catálogo…";
 try{
  const settingsResult=await supabase.from("store_settings").select("settings").eq("store_id",cfg.storeId).maybeSingle();
  if(!settingsResult.error&&settingsResult.data?.settings)catalogSettings={...catalogSettings,...settingsResult.data.settings};
  else if(settingsResult.error)console.warn("Se utilizarán los ajustes predeterminados del catálogo:",settingsResult.error.message);
  applyCatalogSettings();
  const [pr,cr]=await Promise.all([
   supabase.from("products").select("id,store_id,category_id,name,description,details,price,currency,is_active,is_archived,discount_type,discount_value,discount_starts_at,discount_ends_at").eq("store_id",cfg.storeId).eq("is_active",true).eq("is_archived",false).order("name"),
   supabase.from("categories").select("id,name,slug").eq("store_id",cfg.storeId).eq("is_active",true).order("name")
  ]);
  for(const r of [pr,cr])if(r.error)throw r.error;
  categories=cr.data;
  const ids=pr.data.map(p=>p.id);
  let vr={data:[]},cor={data:[]},ir={data:[]},visual={data:[]},imageRules={data:[]};
  if(ids.length){
   [vr,cor,ir,visual]=await Promise.all([
    supabase.from("product_variants").select("id,product_id,sku,attributes,stock,price_override,discount_mode,discount_type,discount_value,discount_starts_at,discount_ends_at,is_active").in("product_id",ids).eq("is_active",true),
    supabase.from("product_colors").select("id,product_id,name,hex_code,sort_order,is_active").in("product_id",ids).eq("is_active",true).order("sort_order"),
    supabase.from("product_images").select("id,product_id,variant_id,color_id,image_path,sort_order,is_primary,is_catalog_cover,is_active").in("product_id",ids).eq("is_active",true).order("sort_order"),
    supabase.from("product_visual_attributes").select("product_id,attribute_name,is_visual").in("product_id",ids).eq("is_visual",true)
   ]);
   for(const r of [vr,cor,ir,visual])if(r.error)throw r.error;
   const imageIds=ir.data.map(i=>i.id);
   if(imageIds.length){
    imageRules=await supabase.from("product_image_attribute_values")
      .select("image_id,attribute_name,attribute_value").in("image_id",imageIds);
    if(imageRules.error)throw imageRules.error;
   }
  }
  const cm=new Map(categories.map(c=>[c.id,c]));
  const visualByProduct=new Map();
  (visual.data||[]).forEach(row=>{
   if(!visualByProduct.has(row.product_id))visualByProduct.set(row.product_id,new Set());
   visualByProduct.get(row.product_id).add(row.attribute_name);
  });
  const rulesByImage=new Map();
  (imageRules.data||[]).forEach(row=>{
   if(!rulesByImage.has(row.image_id))rulesByImage.set(row.image_id,{});
   rulesByImage.get(row.image_id)[row.attribute_name]=row.attribute_value;
  });
  products=pr.data.map(p=>({
   ...p,category:cm.get(p.category_id),
   variants:vr.data.filter(v=>v.product_id===p.id),
   colors:cor.data.filter(c=>c.product_id===p.id),
   visualAttributes:[...(visualByProduct.get(p.id)||[])],
   images:ir.data.filter(i=>i.product_id===p.id).map(i=>({...i,attributeValues:rulesByImage.get(i.id)||{}}))
  })).filter(p=>p.variants.length);
  restoreCartDraft();renderCategories();renderProducts();renderCart();$("catalogMessage").textContent="";
 }catch(e){
  console.error("Catalog load error",e);
  $("catalogMessage").textContent="No fue posible cargar el catálogo. Revisa conexión, permisos de lectura y la migración de atributos visuales en Supabase.";
  $("productsContainer").innerHTML='<div class="empty-state"><h2>No se pudo cargar la colección</h2><p>Verifica la conexión y la configuración de Supabase.</p></div>';
 }
}
$("quickViewClose").onclick=closeQuickView;$("quickViewModal").addEventListener("click",e=>{if(e.target.id==="quickViewModal")closeQuickView()});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeQuickView()});window.addEventListener("popstate",()=>{if(quickViewHistoryOpen)closeQuickView(true)});
// Sparkle Trail: mouse en escritorio y eventos táctiles nativos en móviles.
const sparkleLastPoint=new WeakMap();
const activeSparkleTouches=new Map();
function spawnSparkle(host,x,y,count=1){
 if(!host||!host.querySelector("img"))return;
 host.classList.add("sparkle-host");
 const existing=host.querySelectorAll(".sparkle-particle");
 const available=Math.max(0,22-existing.length);
 for(let i=0;i<Math.min(count,available);i++){
  const angle=count>1?(Math.PI*2*i/count)+(Math.random()*.35):Math.random()*Math.PI*2;
  const radius=count>1?(5+Math.random()*17):0;
  const p=document.createElement("span");
  p.className="sparkle-particle";
  p.textContent=Math.random()>.38?"✦":"✧";
  p.style.left=(x+Math.cos(angle)*radius)+"px";
  p.style.top=(y+Math.sin(angle)*radius)+"px";
  p.style.setProperty("--sparkle-size",(count>1?8+Math.random()*13:7+Math.random()*12)+"px");
  p.style.setProperty("--sparkle-drift",(Math.random()*30-15)+"px");
  p.style.setProperty("--sparkle-rise",(18+Math.random()*22)+"px");
  p.style.setProperty("--sparkle-rotation",(Math.random()*100-50)+"deg");
  host.appendChild(p);
  p.addEventListener("animationend",()=>p.remove(),{once:true});
 }
}
function sparkleHostFrom(target){
 return target instanceof Element?target.closest(".product-image-wrap,.quick-view-media"):null;
}
function sparklePoint(host,clientX,clientY){
 const rect=host.getBoundingClientRect();
 return {host,x:clientX-rect.left,y:clientY-rect.top,clientX,clientY};
}
// Escritorio: el rastro sigue el cursor.
document.addEventListener("pointermove",e=>{
 if(e.pointerType!=="mouse")return;
 const host=sparkleHostFrom(e.target);if(!host)return;
 const point=sparklePoint(host,e.clientX,e.clientY),prev=sparkleLastPoint.get(host);
 if(prev&&Math.hypot(point.x-prev.x,point.y-prev.y)<8)return;
 sparkleLastPoint.set(host,point);
 spawnSparkle(host,point.x,point.y);
},{passive:true});
// Móvil: touch events permiten continuar leyendo el dedo aunque el navegador
// también esté desplazando la página (pointercancel suele cortar ese gesto).
document.addEventListener("touchstart",e=>{
 for(const touch of e.changedTouches){
  const host=sparkleHostFrom(e.target);if(!host)continue;
  const point=sparklePoint(host,touch.clientX,touch.clientY);
  activeSparkleTouches.set(touch.identifier,point);
  spawnSparkle(host,point.x,point.y,7);
 }
},{passive:true});
document.addEventListener("touchmove",e=>{
 for(const touch of e.changedTouches){
  const prev=activeSparkleTouches.get(touch.identifier);if(!prev)continue;
  const rect=prev.host.getBoundingClientRect();
  const x=touch.clientX-rect.left,y=touch.clientY-rect.top;
  // Mantener la estela dentro de la imagen y evitar partículas demasiado juntas.
  if(touch.clientX<rect.left||touch.clientX>rect.right||touch.clientY<rect.top||touch.clientY>rect.bottom)continue;
  if(Math.hypot(x-prev.x,y-prev.y)<7)continue;
  spawnSparkle(prev.host,x,y,Math.random()>.55?2:1);
  activeSparkleTouches.set(touch.identifier,{host:prev.host,x,y,clientX:touch.clientX,clientY:touch.clientY});
 }
},{passive:true});
const stopSparkleTouch=e=>{for(const touch of e.changedTouches)activeSparkleTouches.delete(touch.identifier)};
document.addEventListener("touchend",stopSparkleTouch,{passive:true});
document.addEventListener("touchcancel",stopSparkleTouch,{passive:true});
$("whatsappBtn").onclick=invoice;$("trackOrderForm")?.addEventListener("submit",e=>{e.preventDefault();trackOrder()});document.querySelectorAll("[data-track-mode]").forEach(button=>button.addEventListener("click",()=>setTrackingMode(button.dataset.trackMode)));$("closeInvoice").onclick=()=>$("invoiceModal").classList.remove("open");$("shareInvoice").onclick=share;$("invoiceModal").onclick=e=>{if(e.target.id==="invoiceModal")$("invoiceModal").classList.remove("open")};$("productSearch").oninput=renderProducts;$("currentYear").textContent=new Date().getFullYear();load();
