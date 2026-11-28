# Concept by Lily: catálogos conectados a Supabase

## Qué cambió
- Los catálogos de Mujer, Cosméticos y Hombre usan un único motor compartido: `js/catalogo.js`.
- Los productos y categorías se leen desde Supabase. No hay que mantener arreglos de productos en HTML.
- Los filtros de categoría se generan desde `categories`.
- Las variantes se leen desde `product_variants`; sus atributos se presentan como botones.
- El atributo `Color` se presenta como muestras circulares usando `product_colors.hex_code`.
- La imagen se selecciona según variante, color o imagen principal, usando `product_images`.
- La disponibilidad se calcula con el stock de la variante seleccionada.
- El carrito prepara una proforma y conserva el flujo de compartir/descargar.

## Tiendas configuradas
- Mujer: `937fc539-9b4f-4f8f-a0d6-676408a5359a`
- Cosméticos: `a6ebf309-4a7e-4a9a-9411-fa956e4d4349`
- Hombre: `8c109c37-c8ed-4726-b950-24a453ba999b`

## Requisitos de Supabase
- Se usa la clave pública `sb_publishable_...` del proyecto ya configurado en el administrador. Nunca colocar `service_role` en el navegador.
- Las políticas RLS deben permitir SELECT público únicamente de tiendas/categorías/productos/variantes/colores/imágenes activos.
- El bucket `product-images` debe seguir siendo público para que `getPublicUrl()` pueda mostrar imágenes.
- Los productos inactivos no se muestran. Las variantes inactivas no se ofrecen. Los productos activos sin stock se muestran como agotados.
- Para que una variante aparezca, debe existir como registro activo en `product_variants`. El inventario mostrado es el stock guardado en esa variante.

## Probar localmente
Desde la carpeta raíz del proyecto, ejecuta en PowerShell:
```powershell
npx.cmd --yes http-server -p 5500
```
Abre `http://localhost:5500`. También puedes probar directamente:
- `http://localhost:5500/mujer/`
- `http://localhost:5500/cosmeticos/`
- `http://localhost:5500/hombre/`

No abras los HTML con `file://`: los módulos JavaScript necesitan un servidor local.

## Estado inicial tras la limpieza
La base de datos quedó sin productos de prueba. Por eso los tres catálogos deben mostrar el mensaje de colección en preparación hasta que registres productos reales desde el administrador y los marques activos. Esta es la conducta esperada, no un error.

## Límites actuales
- El carrito genera una proforma local; no crea órdenes en la base de datos ni descuenta inventario.
- Los cambios en el administrador aparecen al volver a cargar el catálogo. No se ha añadido sincronización en tiempo real.
- No se modificó el proyecto del administrador ni el esquema de Supabase.
