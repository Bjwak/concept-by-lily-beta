# Configuración dinámica de catálogos

Los catálogos consultan `public.store_settings` por el `store_id` definido en `window.CATALOG_CONFIG`.

Ajustes consumidos:
- `brand_name`: nombre que aparece en la proforma y pie de página.
- `whatsapp_number`: número mostrado en la proforma.
- `show_prices`: controla precios en tarjetas y detalles.
- `show_stock`: controla la disponibilidad visible en tarjetas y detalles.
- `show_out_of_stock`: cuando es falso, oculta productos sin variantes con existencias.
- `show_descriptions`: controla la descripción y los campos complementarios en la vista rápida.
- `accent_color` y `page_color`: colores principales del catálogo.
- `currency_code`: moneda de presentación y proforma.
- `instagram_url` y `facebook_url`: enlaces sociales del pie de página.

Si una tienda todavía no tiene registro en `store_settings`, el catálogo utiliza sus valores predeterminados. La tabla debe crearse con la migración de Fase 3 del administrador.
