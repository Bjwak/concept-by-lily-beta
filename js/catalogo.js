import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const supabase=createClient("https://ftzfsxcnfcqdmwhpardt.supabase.co","sb_publishable_eRUu-PSs6VrdbtHMET1AvQ_pkZ_WHUv");
const cfg=window.CATALOG_CONFIG,$=id=>document.getElementById(id);
let products=[],categories=[],activeCategory="all",cart=new Map(),selection=new Map();
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=(n,c="NIO")=>{try{return new Intl.NumberFormat("es-NI",{style:"currency",currency:c||"NIO"}).format(Number(n||0))}catch{return `C$ ${Number(n||0).toFixed(2)}`}};
const attrs=v=>v?.attributes&&typeof v.attributes==="object"?v.attributes:{};
const url=p=>/^https?:/i.test(p||"")?p:supabase.storage.from("product-images").getPublicUrl(p||"").data?.publicUrl||"";
function keys(p){return [...new Set(p.variants.flatMap(v=>Object.keys(attrs(v)).filter(k=>!k.startsWith("_"))))].sort((a,b)=>(norm(a)==="color"?-1:0)-(norm(b)==="color"?-1:0)||a.localeCompare(b,"es"))}
function chosen(p){if(!selection.has(p.id)){const v=p.variants.find(x=>Number(x.stock)>0)||p.variants[0];selection.set(p.id,{...attrs(v)})}return selection.get(p.id)}
function matches(v,s,skip=null,value=null){return Object.entries(s).every(([k,x])=>k===skip||String(attrs(v)[k]??"")===String(x??""))&&(skip===null||String(attrs(v)[skip]??"")===String(value??""))}
function variant(p){const s=chosen(p),ks=keys(p);return p.variants.find(v=>ks.every(k=>String(attrs(v)[k]??"")===String(s[k]??"")))||(ks.length===0?p.variants[0]:null)}
function img(p,v){
 const selected=attrs(v)||{};
 const mapped=p.images.map(image=>{
   const rules=image.attributeValues||{};
   const entries=Object.entries(rules);
   const matchesAll=entries.every(([key,value])=>String(selected[key]??"")===String(value));
   return {image,score:entries.length,matches:matchesAll};
 }).filter(x=>x.matches&&x.score>0).sort((a,b)=>b.score-a.score);
 if(mapped.length)return mapped[0].image;
 const color=Object.entries(selected).find(([k])=>norm(k)==="color");
 const legacyColor=color&&p.colors.find(x=>norm(x.name)===norm(color[1]));
 return (v&&p.images.find(x=>x.variant_id===v.id))||
   (legacyColor&&p.images.find(x=>x.color_id===legacyColor.id))||
   p.images.find(x=>x.is_primary)||p.images[0];
}
function price(p,v){return v?.price_override??p.price}
function renderCategories(){ $("categoryNav").innerHTML=[`<button class="category-btn ${activeCategory==="all"?"active":""}" data-category="all">Todos</button>`,...categories.map(c=>`<button class="category-btn ${activeCategory===c.id?"active":""}" data-category="${esc(c.id)}">${esc(c.name)}</button>`)].join("");$("categoryNav").querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;renderCategories();renderProducts()})}
function options(p,k,s){const vals=[...new Set(p.variants.map(v=>attrs(v)[k]).filter(x=>x!=null).map(String))],color=norm(k)==="color",colors=new Map(p.colors.map(c=>[norm(c.name),c]));return `<div class="variant-group"><span class="variant-label">${esc(k)}</span><div class="${color?"color-options":"value-options"}">${vals.map(val=>{const ok=p.variants.some(v=>Number(v.stock)>0&&matches(v,s,k,val)),sel=String(s[k]??"")===val,c=colors.get(norm(val));return `<button type="button" class="${color?"color-option":"value-option"} ${sel?"selected":""} ${ok?"":"sold-out"}" data-attr="${esc(k)}" data-val="${esc(val)}" ${ok?"":"disabled"} ${color?`style="--swatch:${esc(c?.hex_code||"#b9a5aa")}" title="${esc(val)}"`:""}>${color?'<span class="swatch"></span><span class="sr-only">'+esc(val)+'</span>':esc(val)}</button>`}).join("")}</div></div>`}
function card(p){const s=chosen(p),v=variant(p),stock=Number(v?.stock||0),off=!v||stock<=0,im=img(p,v);return `<article class="product-card ${off?"is-unavailable":""}" data-pid="${p.id}"><div class="product-image-wrap">${im?`<img class="product-image" src="${esc(url(im.image_path))}" alt="${esc(p.name)}" loading="lazy">`:'<div class="image-placeholder">Imagen próximamente</div>'}</div><div class="product-content"><p class="product-category">${esc(p.category?.name||"")}</p><h2>${esc(p.name)}</h2>${p.description?`<p class="product-description">${esc(p.description)}</p>`:""}<div class="product-price">${money(price(p,v),p.currency)}</div>${keys(p).map(k=>options(p,k,s)).join("")}<div class="availability">${off?'<span class="stock-badge">AGOTADO</span>':`<span class="stock-note">${stock} disponible${stock===1?"":"s"}</span>`}</div><button class="add-button" data-add="${p.id}" ${off?"disabled":""}>${off?"No disponible":"Agregar al carrito"}</button></div></article>`}
function renderProducts(){const q=norm($("productSearch").value),list=products.filter(p=>(activeCategory==="all"||p.category_id===activeCategory)&&norm([p.name,p.description,p.category?.name].join(" ")).includes(q));$("productCount").textContent=`${list.length} ${list.length===1?"producto":"productos"}`;$("productsContainer").innerHTML=list.length?list.map(card).join(""):`<div class="empty-state"><h2>${products.length?"No encontramos productos":"Estamos preparando esta colección"}</h2><p>${products.length?"Prueba con otra búsqueda o categoría.":"Pronto encontrarás aquí los productos disponibles."}</p></div>`;$("productsContainer").querySelectorAll("[data-attr]").forEach(b=>b.onclick=()=>{const p=products.find(x=>x.id===b.closest("[data-pid]").dataset.pid);chosen(p)[b.dataset.attr]=b.dataset.val;renderProducts()});$("productsContainer").querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>add(b.dataset.add))}
function add(id){const p=products.find(x=>x.id===id),v=variant(p);if(!v||Number(v.stock)<=0)return;const key=p.id+":"+v.id,item=cart.get(key),qty=(item?.quantity||0)+1;if(qty>Number(v.stock)){alert("No hay más unidades disponibles de esta combinación.");return}cart.set(key,{key,name:p.name,price:Number(price(p,v)),currency:p.currency||"NIO",attributes:attrs(v),quantity:qty,stock:Number(v.stock)});renderCart()}
function renderCart(){const items=[...cart.values()];if(!items.length){$("cartItems").innerHTML='<p class="empty-cart">Tu carrito está vacío.</p>';$("total").textContent=`Total: ${money(0)}`;return}let total=0;$("cartItems").innerHTML=items.map(i=>{const sub=i.price*i.quantity;total+=sub;const a=Object.entries(i.attributes).map(([k,v])=>`${esc(k)}: ${esc(v)}`).join(" · ");return `<div class="cart-item"><div><strong>${esc(i.name)}</strong>${a?`<small>${a}</small>`:""}<small>${i.quantity} × ${money(i.price,i.currency)} = ${money(sub,i.currency)}</small></div><button class="remove-button" data-remove="${esc(i.key)}">−</button></div>`}).join("");$("total").textContent=`Total: ${money(total)}`;$("cartItems").querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{const i=cart.get(b.dataset.remove);if(i.quantity>1)i.quantity--;else cart.delete(b.dataset.remove);renderCart()})}
function invoice(){const items=[...cart.values()];if(!items.length){alert("Agrega productos al carrito primero.");return}const total=items.reduce((s,i)=>s+i.price*i.quantity,0);$("invoiceArea").innerHTML=`<div class="invoice"><h2>Concept by Lily</h2><p>WhatsApp: +505 8798 4118</p><p>Proforma de pedido</p><hr>${items.map(i=>`<p><strong>${esc(i.name)}</strong><br>${Object.entries(i.attributes).map(([k,v])=>`${esc(k)}: ${esc(v)}`).join("<br>")}<br>Cantidad: ${i.quantity}<br>Subtotal: ${money(i.price*i.quantity,i.currency)}</p>`).join("")}<hr><h2>Total: ${money(total)}</h2><p>Gracias por elegir Concept by Lily.</p></div>`;$("invoiceModal").classList.add("open")}
async function share(){try{if(!window.html2canvas)throw Error("No se cargó html2canvas");const canvas=await html2canvas($("invoiceArea"),{backgroundColor:"#fff",scale:2}),blob=await new Promise(r=>canvas.toBlob(r,"image/png"));if(!blob)throw Error("No se generó la imagen");const file=new File([blob],"Pedido-Concept-by-Lily.png",{type:"image/png"});if(navigator.share&&navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:"Pedido Concept by Lily",text:"Hola, me gustaría realizar este pedido."});else{const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=file.name;a.click();URL.revokeObjectURL(u);alert("La proforma se descargó. Puedes adjuntarla en WhatsApp.")}}catch(e){if(!String(e.message).toLowerCase().includes("cancel")){console.error(e);alert("No fue posible compartir la proforma.")}}}
async function load(){
 $("catalogMessage").textContent="Cargando catálogo…";
 try{
  const [pr,cr]=await Promise.all([
   supabase.from("products").select("id,store_id,category_id,name,description,price,currency,is_active").eq("store_id",cfg.storeId).eq("is_active",true).order("name"),
   supabase.from("categories").select("id,name,slug").eq("store_id",cfg.storeId).eq("is_active",true).order("name")
  ]);
  for(const r of [pr,cr])if(r.error)throw r.error;
  categories=cr.data;
  const ids=pr.data.map(p=>p.id);
  let vr={data:[]},cor={data:[]},ir={data:[]},visual={data:[]},imageRules={data:[]};
  if(ids.length){
   [vr,cor,ir,visual]=await Promise.all([
    supabase.from("product_variants").select("id,product_id,sku,attributes,stock,price_override,is_active").in("product_id",ids).eq("is_active",true),
    supabase.from("product_colors").select("id,product_id,name,hex_code,sort_order,is_active").in("product_id",ids).eq("is_active",true).order("sort_order"),
    supabase.from("product_images").select("id,product_id,variant_id,color_id,image_path,sort_order,is_primary,is_active").in("product_id",ids).eq("is_active",true).order("sort_order"),
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
  renderCategories();renderProducts();renderCart();$("catalogMessage").textContent="";
 }catch(e){
  console.error("Catalog load error",e);
  $("catalogMessage").textContent="No fue posible cargar el catálogo. Revisa conexión, permisos de lectura y la migración de atributos visuales en Supabase.";
  $("productsContainer").innerHTML='<div class="empty-state"><h2>No se pudo cargar la colección</h2><p>Verifica la conexión y la configuración de Supabase.</p></div>';
 }
}
$("whatsappBtn").onclick=invoice;$("closeInvoice").onclick=()=>$("invoiceModal").classList.remove("open");$("shareInvoice").onclick=share;$("invoiceModal").onclick=e=>{if(e.target.id==="invoiceModal")$("invoiceModal").classList.remove("open")};$("productSearch").oninput=renderProducts;$("currentYear").textContent=new Date().getFullYear();load();
