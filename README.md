# Plugin ImgBB para KiwiIRC

Este plugin permite la subida directa de imágenes a ImgBB con filtrado de usuarios registrados y caducidad automática de 5 min.

## Instalación

1.  Coloca el archivo `plugin-imgbb.js` en tu directorio de plugins de KiwiIRC (./static/plugins/).
2.  Asegúrate de que la ruta al plugin está incluida en tu `config.json`. Eso se hace dentro de "plugins" así:

```json
// ..  Resto de tu codigo de la config.json 
   "plugins": [
                    // Tus Otros plugins 
                  {
                      "name": "imgbb",
                     "url": "./static/plugins/plugin-imgbb.js"
                   }
                }
// Resto del codigo de config.json 
```
## Configuración (config.json)

**¡IMPORTANTE!** Para que el plugin funcione, debes añadir la siguiente sección a tu archivo `config.json` de KiwiIRC, justo despues de "Plugins". **Sustituye 'TU_API_KEY_REAL'** por la clave que obtuviste de ImgBB.

```json
"settings": {
    "plugins": {
        // ... (otros plugins)
    },
    "imgbb": {
        "api_key": "TU_API_KEY_REAL",
        "max_file_size_mb": 5,
        "message_format": "[Image] $url"
    }
}

Nota: Puedes ver un ejemplo en el archivo example-config.json