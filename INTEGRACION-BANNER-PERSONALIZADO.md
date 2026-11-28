# Integración de banners personalizados

Beta ahora lee `store_settings.settings.banner_path` para la tienda definida en `window.CATALOG_CONFIG.storeId`.

- Si `banner_path` contiene una ruta, obtiene su URL pública desde el bucket `product-images` y reemplaza la imagen del encabezado.
- Si `banner_path` está vacío o no existe, conserva el banner estático definido en cada HTML (`mujer/banner-accesorios.png`, `hombre/banner-masculino.png` o `cosmeticos/banner-cosmeticos.png`).
- No requiere cambios SQL ni modifica la lógica de productos, variantes, imágenes de producto, colores, carrito o proformas.

Para probar, publica Beta y abre cada catálogo. Admin debe tener guardada la configuración de banner para esa tienda. Si se usa "Usar banner predeterminado" en Admin, Beta volverá a mostrar el recurso estático al recargar.
