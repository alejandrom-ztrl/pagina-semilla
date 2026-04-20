/**
 * Módulo de Impresión USB (Serial) para Phomemo M110S
 * Protocolo ESC/POS con comandos M110 específicos via Web Serial API.
 * Mismo protocolo que BLE pero usando conexión por cable USB.
 */

const PRINTER_SERIAL = {
    port: null,
    writer: null,

    // Configuración M110S
    PRINT_WIDTH_BYTES: 48,   // 48 bytes = 384 pixels
    PRINT_WIDTH_PX: 384,

    // Comandos M110 (igual que en BLE)
    CMD: {
        SPEED: (speed) => new Uint8Array([0x1b, 0x4e, 0x0d, speed]),
        DENSITY: (density) => new Uint8Array([0x1b, 0x4e, 0x04, density]),
        MEDIA_TYPE: (type) => new Uint8Array([0x1f, 0x11, type]),
        RASTER_HEADER: (widthBytes, heightLines) => new Uint8Array([
            0x1d, 0x76, 0x30, 0x00,
            widthBytes & 0xff, (widthBytes >> 8) & 0xff,
            heightLines & 0xff, (heightLines >> 8) & 0xff,
        ]),
        FOOTER: new Uint8Array([0x1f, 0xf0, 0x05, 0x00, 0x1f, 0xf0, 0x03, 0x00]),
    },

    async connect() {
        try {
            if (this.port && this.port.writable) return true;

            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });

            this.writer = this.port.writable.getWriter();

            this.port.addEventListener('disconnect', () => {
                showToast("M110S USB desconectada", "warning");
                this.port = null;
                this.writer = null;
            });

            showToast("M110S USB conectada ✅", "success");
            return true;
        } catch (error) {
            console.error(error);
            showToast("Error al conectar por USB. Asegúrate de que el cable esté conectado.", "danger");
            return false;
        }
    },

    async printLabel(domElementId) {
        if (!("serial" in navigator)) {
            showToast("Tu navegador no soporta impresión USB (Serial). Usa Chrome o Edge.", "danger");
            return;
        }

        if (!await this.connect()) return;

        const el = document.getElementById(domElementId);
        if (!el) return;

        showToast("Procesando etiqueta USB M110S...", "info");

        try {
            // 1. Capturar DOM a Canvas
            const sourceCanvas = await html2canvas(el, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            // 2. Escalar al ancho de la M110S (384px) - ROTADO (Vertical)
            const targetWidth = this.PRINT_WIDTH_PX;
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

            // 3. Convertir a bitmap monocromo con dithering
            const bitmapData = this.canvasToMonoBitmap(printCanvas);

            // 4. Enviar por USB Serial
            await this.writer.write(this.CMD.SPEED(5));
            await this.writer.write(this.CMD.DENSITY(10));
            await this.writer.write(this.CMD.MEDIA_TYPE(10));
            await this.writer.write(this.CMD.RASTER_HEADER(this.PRINT_WIDTH_BYTES, targetHeight));
            await this.writer.write(bitmapData);
            await this.writer.write(this.CMD.FOOTER);

            showToast("Etiqueta M110S USB impresa 🖨️", "success");
        } catch (err) {
            console.error(err);
            showToast("Error durante la impresión USB: " + err.message, "danger");
            try {
                this.writer.releaseLock();
                await this.port.close();
            } catch (e) { /* ignore */ }
            this.port = null;
            this.writer = null;
        }
    },

    /**
     * Convertir canvas a bitmap monocromo (igual que en BLE para consistencia)
     */
    canvasToMonoBitmap(canvas) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;
        const width = canvas.width;
        const height = canvas.height;
        const widthBytes = Math.ceil(width / 8);

        // Floyd-Steinberg dithering
        const gray = new Float32Array(width * height);
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            gray[i] = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
        }

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

window.printLabelUSB = () => PRINTER_SERIAL.printLabel('label-cosecha-box');
