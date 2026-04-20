/**
 * Módulo de Impresión Bluetooth para Phomemo M110S
 * Protocolo ESC/POS con comandos M110 específicos.
 * Basado en el protocolo reverse-engineered del proyecto phomymo/phomemo-tools.
 *
 * BLE Service:        0xFF00
 * Write Characteristic: 0xFF02
 * Notify Characteristic: 0xFF03
 * Ancho de impresión: 48 bytes (384 pixels) @ 203 DPI
 */

const PRINTER_BLE = {
    // UUIDs del servicio BLE Phomemo
    serviceUuid: 0xff00,
    writeCharUuid: 0xff02,
    notifyCharUuid: 0xff03,

    // Estado de conexión
    device: null,
    server: null,
    writeChar: null,
    notifyChar: null,
    useWriteWithResponse: false,

    // Configuración de la M110S
    PRINT_WIDTH_BYTES: 48,   // 48 bytes = 384 pixels
    PRINT_WIDTH_PX: 384,
    CHUNK_SIZE: 128,
    CHUNK_DELAY: 20,

    // Comandos M110 (ESC/POS + phomemo-tools)
    CMD: {
        // ESC N 0x0D <speed> - Velocidad de impresión (default 5)
        SPEED: (speed) => new Uint8Array([0x1b, 0x4e, 0x0d, speed]),
        // ESC N 0x04 <density> - Densidad de impresión (1-15, default 10)
        DENSITY: (density) => new Uint8Array([0x1b, 0x4e, 0x04, density]),
        // 1F 11 <type> - Tipo de medio (10 = etiquetas con gap)
        MEDIA_TYPE: (type) => new Uint8Array([0x1f, 0x11, type]),
        // GS v 0 - Cabecera de imagen raster
        RASTER_HEADER: (widthBytes, heightLines) => new Uint8Array([
            0x1d, 0x76, 0x30, 0x00,
            widthBytes & 0xff, (widthBytes >> 8) & 0xff,
            heightLines & 0xff, (heightLines >> 8) & 0xff,
        ]),
        // Footer para finalizar la impresión
        FOOTER: new Uint8Array([0x1f, 0xf0, 0x05, 0x00, 0x1f, 0xf0, 0x03, 0x00]),
    },

    /**
     * Conectar a la impresora M110S via Bluetooth
     */
    async connect() {
        try {
            // Si ya está conectada, reutilizar
            if (this.device && this.device.gatt.connected && this.writeChar) {
                return true;
            }

            // Intentar reconectar si ya hay un dispositivo
            if (this.device && !this.device.gatt.connected) {
                try {
                    this.server = await this.device.gatt.connect();
                    await this._getCharacteristics();
                    showToast("Reconectada a M110S ✅", "success");
                    return true;
                } catch (e) {
                    console.log('Reconexión fallida, solicitando nuevo dispositivo...');
                    this.device = null;
                }
            }

            // Solicitar dispositivo nuevo
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'M110' },
                    { namePrefix: 'M120' },
                    { namePrefix: 'Q' },        // M110S a veces se anuncia como Q199E...
                    { namePrefix: 'Phomemo' },
                ],
                optionalServices: [
                    this.serviceUuid,
                    0xffe0,
                    '0000ff00-0000-1000-8000-00805f9b34fb',
                ]
            });

            console.log('Dispositivo seleccionado:', this.device.name);

            // Conectar GATT
            this.server = await this.device.gatt.connect();
            await this._getCharacteristics();

            // Listener de desconexión
            this.device.addEventListener('gattserverdisconnected', () => {
                showToast("M110S desconectada", "warning");
                this.writeChar = null;
                this.notifyChar = null;
            });

            showToast(`M110S conectada (${this.device.name}) ✅`, "success");
            return true;
        } catch (error) {
            console.error('Error de conexión BLE:', error);
            showToast("Error al conectar con la M110S. Asegúrate de que esté encendida.", "danger");
            return false;
        }
    },

    /**
     * Obtener characteristics del servicio BLE
     */
    async _getCharacteristics() {
        // Intentar diferentes UUIDs de servicio
        const servicesToTry = [
            this.serviceUuid,
            0xffe0,
            '0000ff00-0000-1000-8000-00805f9b34fb',
        ];

        let service = null;
        for (const uuid of servicesToTry) {
            try {
                service = await this.server.getPrimaryService(uuid);
                console.log('Servicio encontrado:', uuid);
                break;
            } catch (e) {
                console.log('Servicio no encontrado:', uuid);
            }
        }

        if (!service) {
            throw new Error('No se encontró un servicio BLE compatible');
        }

        // Obtener characteristic de escritura
        this.writeChar = await service.getCharacteristic(this.writeCharUuid);

        // Detectar método de escritura
        const props = this.writeChar.properties;
        this.useWriteWithResponse = !props.writeWithoutResponse && props.write;
        console.log('Método de escritura:', this.useWriteWithResponse ? 'writeValue' : 'writeValueWithoutResponse');

        // Intentar obtener characteristic de notificaciones (opcional)
        try {
            this.notifyChar = await service.getCharacteristic(this.notifyCharUuid);
            await this.notifyChar.startNotifications();
            this.notifyChar.addEventListener('characteristicvaluechanged', (event) => {
                const data = new Uint8Array(event.target.value.buffer);
                console.log('[M110S <<<]', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
            });
        } catch (e) {
            console.warn('Notificaciones no disponibles:', e.message);
        }
    },

    /**
     * Enviar datos por BLE en chunks
     */
    async send(data) {
        if (!this.writeChar) throw new Error('No conectada');

        const buffer = (data instanceof Uint8Array) ? new Uint8Array(data).buffer : new Uint8Array(data).buffer;

        if (this.useWriteWithResponse) {
            await this.writeChar.writeValue(buffer);
        } else {
            try {
                await this.writeChar.writeValueWithoutResponse(buffer);
            } catch (e) {
                console.warn('Fallback a writeValue:', e.message);
                this.useWriteWithResponse = true;
                await this.writeChar.writeValue(buffer);
            }
        }
    },

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Imprimir una etiqueta desde un elemento DOM
     * @param {string} domElementId - ID del elemento HTML a imprimir
     * @param {number} copies - Número de copias a imprimir
     */
    async printLabel(domElementId, copies = 1) {
        if (!await this.connect()) return;

        const el = document.getElementById(domElementId);
        if (!el) {
            showToast("Elemento de etiqueta no encontrado", "danger");
            return;
        }

        showToast(`Procesando ${copies > 1 ? copies + ' etiquetas' : 'etiqueta'} M110S...`, "info");

        try {
            // 1. Capturar DOM a Canvas con alta resolución (UNA SOLA VEZ)
            const sourceCanvas = await html2canvas(el, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            // 2. Escalar al ancho de la M110S (384px) - ROTADO (Vertical)
            const targetWidth = this.PRINT_WIDTH_PX; // 384
            const scale = targetWidth / sourceCanvas.height; 
            const targetHeight = Math.round(sourceCanvas.width * scale);

            const printCanvas = document.createElement('canvas');
            printCanvas.width = targetWidth;
            printCanvas.height = targetHeight;
            const ctx = printCanvas.getContext('2d');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            // 3. Rotar y Dibujar
            ctx.translate(targetWidth, 0);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(sourceCanvas, 0, 0, targetHeight, targetWidth);

            // 4. Convertir a bitmap de 1 bit (monocromo)
            const bitmapData = this.canvasToMonoBitmap(printCanvas);

            // 5. Enviar a la impresora en bucle según número de copias
            for (let i = 0; i < copies; i++) {
                if (copies > 1) {
                    console.log(`Imprimiendo copia ${i + 1} de ${copies}...`);
                }
                await this._printM110(bitmapData, this.PRINT_WIDTH_BYTES, targetHeight);
                
                // Pequeño delay entre etiquetas para que la impresora respire
                if (i < copies - 1) {
                    await this.delay(800);
                }
            }

            showToast(`${copies > 1 ? copies + ' etiquetas impresas' : 'Etiqueta impresa'} 🖨️`, "success");
        } catch (err) {
            console.error('Error al imprimir:', err);
            showToast("Error durante la impresión: " + err.message, "danger");
        }
    },

    /**
     * Protocolo de impresión M110 (ESC/POS + phomemo-tools)
     */
    async _printM110(bitmapData, widthBytes, heightLines) {
        // console.log(`Imprimiendo: ${widthBytes}x${heightLines} (${bitmapData.length} bytes)`);

        // Paso 1: Configurar velocidad (5 = normal)
        await this.send(this.CMD.SPEED(5));
        await this.delay(30);

        // Paso 2: Configurar densidad (10 = buena para etiquetas)
        await this.send(this.CMD.DENSITY(10));
        await this.delay(30);

        // Paso 3: Tipo de medio (10 = etiquetas con gap)
        await this.send(this.CMD.MEDIA_TYPE(10));
        await this.delay(30);

        // Paso 4: Cabecera raster (GS v 0)
        await this.send(this.CMD.RASTER_HEADER(widthBytes, heightLines));

        // Paso 5: Enviar datos bitmap en chunks de 128 bytes
        for (let i = 0; i < bitmapData.length; i += this.CHUNK_SIZE) {
            const chunk = bitmapData.slice(i, Math.min(i + this.CHUNK_SIZE, bitmapData.length));
            await this.send(chunk);
            await this.delay(this.CHUNK_DELAY);
        }

        // Paso 6: Footer de finalización
        await this.delay(300);
        await this.send(this.CMD.FOOTER);
        await this.delay(200);
    },

    /**
     * Convertir canvas a bitmap monocromo (1 bit por pixel)
     * Negro = 1, Blanco = 0 (convención ESC/POS estándar para Phomemo)
     */
    canvasToMonoBitmap(canvas) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;
        const width = canvas.width;
        const height = canvas.height;
        const widthBytes = Math.ceil(width / 8);

        // Aplicar dithering Floyd-Steinberg para mejor calidad en térmica
        const gray = new Float32Array(width * height);
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            gray[i] = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
        }

        // Floyd-Steinberg dithering
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                const oldVal = gray[i];
                const newVal = oldVal < 128 ? 0 : 255;
                gray[i] = newVal;
                const error = oldVal - newVal;

                if (x + 1 < width)                    gray[i + 1]         += error * 7 / 16;
                if (y + 1 < height && x - 1 >= 0)     gray[i + width - 1] += error * 3 / 16;
                if (y + 1 < height)                    gray[i + width]     += error * 5 / 16;
                if (y + 1 < height && x + 1 < width)  gray[i + width + 1] += error * 1 / 16;
            }
        }

        // Convertir a bitmap empaquetado (1 bit por pixel)
        const bitmap = new Uint8Array(widthBytes * height);
        bitmap.fill(0x00); 

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                if (gray[i] < 128) {
                    const bytePos = y * widthBytes + Math.floor(x / 8);
                    const bitPos = 7 - (x % 8);
                    bitmap[bytePos] |= (1 << bitPos);
                }
            }
        }

        return bitmap;
    }
};

window.printLabelBLE = () => {
    const copies = parseInt(document.getElementById('cosecha-copias').value) || 1;
    PRINTER_BLE.printLabel('label-cosecha-box', copies);
};
