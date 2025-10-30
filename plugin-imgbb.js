/*****************************************************************
 * PLUGIN KIWIIRC IMGBB
 *
 * Este plugin permite a los usuarios subir imágenes directamente a
 * ImgBB desde KiwiIRC con políticas de caducidad y moderación.
 *
 * @version 1.0.0
 * @author rek
 * @github https://github.com/r3ks3c
 * @copyright 2025 rek
 * @license MIT
 *
 *****************************************************************/
kiwi.plugin('imgbb', function (kiwi) {

    // --- DEBUG 1 ---
    console.log('✅ [ImgBB] Plugin cargado. Iniciando configuración.');

    // --- CONFIGURACIÓN ---
    let config = kiwi.state.settings.imgbb;
    if (typeof config === 'function') {
        config = config();
    }
    if (!config || !config.api_key) {
        config = kiwi.state.getSetting('imgbb');
    }

    // DEBUG: Confirma la lectura
    //console.log('🔍 [ImgBB] Configuración leída:', config);

    // Asignación segura de constantes.
    const API_KEY = config.api_key || 'AQUI_API_KEY';
    const MAX_SIZE_MB = config.max_file_size_mb || 5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    const MESSAGE_FORMAT = config.message_format || '[Image] $url';
    const UPLOAD_URL = 'https://api.imgbb.com/1/upload';

    function addMessage(buffer, message, type) {
        kiwi.state.addMessage(buffer, {
            nick: 'ImgBB',
            message: message,
            type: type || 'notice'
        });
    }

    // --- 1. Definición del Componente Vue para el Botón ---
    const ImgbbUploadComponent = new kiwi.Vue({
        template: `
            <a class="kiwi-upload-imgbb-button" title="Subir Imagen a ImgBB - Advertencia: Contenido XXX/Ilegal está prohibido y sujeto a baneo." @mousedown="openFileDialog">
                <i class="fa fa-image" aria-hidden="true" :class="[uploading ? 'fa-spin' : '']"></i>
                <input type="file" ref="fileInput" @change="fileSelected" style="display: none;" accept="image/*">
            </a>
        `,
        data: {
            uploading: false,
        },
        methods: {
            openFileDialog() {
                if (this.uploading) return;
                // Detener la propagación del evento para evitar cualquier doble disparo
                event.preventDefault();

                // --- PASO 1: VERIFICACIÓN DE REGISTRO (FILTRO) ---
                const buffer = kiwi.state.getActiveBuffer();
                // Obtenemos la red de la forma más compatible
                const network = buffer ? buffer.getNetwork() || kiwi.state.networks[0] : null;

                // Criterio: La red debe existir, tener un nickname, y ese nick NO puede ser un prefijo de invitado.
                if (!network || !network.nick || network.nick.startsWith('Guest') || network.nick.startsWith('ircuser')) {

                    window.alert('⛔ ACCESO DENEGADO: La subida de imágenes solo está disponible para usuarios registrados y conectados. Por favor, identifícate en el IRC para usar esta función. Registrate en https://universochat.com/registro.php');

                    console.log('⛔ [ImgBB] Subida bloqueada: Nickname no válido.');
                    return; // Bloquea el resto del código
                }
                // ----------------------------------------------------------
                // --- PASO 2: SÓLO SI PASÓ EL FILTRO, SE MUESTRA LA ADVERTENCIA DE POLÍTICA ---
                const confirmation = window.confirm(
                    '⚠️ Advertencia de Contenido Prohibido ⚠️\n\n' +
                    'Al presionar "Aceptar", usted confirma que su imagen NO contiene material ilegal, pornografía infantil, o contenido violentamente explícito.\n\n' +
                    'El contenido prohibido será reportado y resultará en la SUSPENSIÓN PERMANENTE de su cuenta IRC.'
                );

                if (!confirmation) {
                    console.log('➡️ [ImgBB] Usuario canceló la subida por advertencia.');
                    return;
                }
                // ----------------------------------------
                // --- PASO 3: ABRIR DIÁLOGO DE ARCHIVO ---
                this.$refs.fileInput.click();
                console.log('➡️ [ImgBB] Clic en el botón. Abriendo diálogo de archivo.');
            },
            fileSelected(event) {
                const file = event.target.files[0];
                event.target.value = null;

                if (!file) return;
                console.log(`⬆️ [ImgBB] Archivo seleccionado: ${file.name}. Iniciando subida.`);
                uploadFile(file, this);
            }
        }
    });

    // --- 2. Función de Subida ---
    function uploadFile(file, component) {
        const buffer = kiwi.state.getActiveBuffer();

        // Verifica la API Key antes de subir
        if (API_KEY === 'AQUI_API_KEY' || !API_KEY || typeof API_KEY !== 'string') {
            addMessage(buffer, `❌ La API Key de ImgBB no ha sido configurada correctamente en config.json.`, 'error');
            component.uploading = false;
            return;
        }

        if (file.size > MAX_SIZE_BYTES) {
            addMessage(buffer, `❌ El archivo es demasiado grande. Máximo permitido: ${MAX_SIZE_MB}MB.`, 'error');
            return;
        }

        // --- LÍNEA DE ADVERTENCIA CLAVE AQUÍ ---
        addMessage(buffer, '⚠️ ADVERTENCIA: Contenido ilegal o pornográfico (XXX) está PROHIBIDO pr los términos de ImgBB y será sancionado con baneo permanente en este servidor.', 'notice');
        // ----------------------------------------
        component.uploading = true;
        addMessage(buffer, `⏳ Subiendo imagen a ImgBB...`);

        const formData = new FormData();
        formData.append('key', API_KEY);
        formData.append('image', file);
        // --- ¡AÑADE ESTA LÍNEA CLAVE! ---
        formData.append('expiration', 300); // 86400 segundos = 1 día, 300 s = 5min
        // ----------------------------------

        fetch(UPLOAD_URL, {
            method: 'POST',
            body: formData,
        })
            .then(response => response.json())
            .then(data => {
                component.uploading = false;

                if (data.success) {
                    const url = data.data.url;
                    const message = MESSAGE_FORMAT.replace('$url', url);

                    // --- SOLUCIÓN FINAL: buffer.say() ---
                    try {
                        buffer.say(message);
                        addMessage(buffer, `✅ Imagen subida con éxito y enlace enviado.`, 'notice');
                    } catch (e) {
                        addMessage(buffer, `❌ Fallo final de envío. El enlace es: ${message}`, 'error');
                        console.error('❌ [ImgBB] Fallo final en buffer.say:', e);
                    }
                    // ------------------------------------

                } else {
                    const errorMessage = data.error?.message || 'Error desconocido al subir a ImgBB.';
                    addMessage(buffer, `❌ Error de ImgBB: ${errorMessage}`, 'error');
                    console.error('❌ [ImgBB] Error de API:', data);
                }
            }).catch(error => {
                component.uploading = false;
                console.error('❌ [ImgBB] Fallo de red/API:', error);
                addMessage(buffer, `❌ Fallo de red/API: No se pudo conectar a ImgBB.`, 'error');
            });
    }

    // --- 3. MONTAJE CLAVE ---
    try {
        // Usamos .$mount().$el y 'input' que fue la única combinación que funcionó para montar el botón
        kiwi.addUi('input', ImgbbUploadComponent.$mount().$el);
        console.log('✅ [ImgBB] Componente montado en la barra de "input".');

    } catch (e) {
        console.error('❌ [ImgBB] Error fatal al montar el componente Vue:', e);
    }
});