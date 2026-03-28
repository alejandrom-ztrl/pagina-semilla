/**
 * Módulo de Impresión Bluetooth para Detonger P1 (TSPL)
 * Implementa rotación de 90° y conversión a bitmap de 1 bit.
 */

const PRINTER_BLE = {
    serviceUuid: '0000ff00-0000-1000-8000-00805f9b34fb', // FF00
    characteristicUuid: '0000ff02-0000-1000-8000-00805f9b34fb', // FF02
    device: null,
    server: null,
    characteristic: null,

    async connect() {
        try {
            if (this.device && this.device.gatt.connected) return true;

            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [this.serviceUuid] }, { namePrefix: 'P1' }]
            });

            this.server = await this.device.gatt.connect();
            const service = await this.server.getPrimaryService(this.serviceUuid);
            this.characteristic = await service.getCharacteristic(this.characteristicUuid);

            this.device.addEventListener('gattserverdisconnected', () => {
                showToast("Impresora desconectada", "warning");
                this.device = null;
                this.characteristic = null;
            });

            showToast("Impresora conectada ✅", "success");
            return true;
        } catch (error) {
            console.error(error);
            showToast("Error de conexión Bluetooth", "danger");
            return false;
        }
    },

    async printLabel(domElementId) {
        if (!await this.connect()) return;

        const el = document.getElementById(domElementId);
        if (!el) return;

        showToast("Procesando etiqueta...", "info");

        // 1. Capturar DOM a Canvas (Forzamos fondo blanco y alta escala para nitidez)
        const canvas = await html2canvas(el, { 
            scale: 3, 
            useCORS: true,
            backgroundColor: '#ffffff' 
        });
        
        // 2. Rotar 90 grados y ajustar a 384px de ancho y 624px de largo (48x78mm reales)
        const targetWidth = 384; 
        const targetHeight = 624;

        const rotatedCanvas = document.createElement('canvas');
        rotatedCanvas.width = targetWidth;
        rotatedCanvas.height = targetHeight;
        const ctx = rotatedCanvas.getContext('2d');

        // Fondo blanco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        ctx.translate(targetWidth, 0);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(canvas, 0, 0, targetHeight, targetWidth);

        // 3. Convertir a Bitmap de 1 bit (TSPL)
        const bitmapData = this.canvasToTsplBitmap(rotatedCanvas);
        
        // 4. Generar comandos TSPL
        const widthBytes = Math.ceil(targetWidth / 8); // 384 / 8 = 48 bytes
        const xOffset = 0; 
        
        const cmds = [
            `SIZE 48 mm, 78 mm\r\n`,
            `GAP 3 mm, 0 mm\r\n`,
            `DIRECTION 0\r\n`,
            `CLS\r\n`,
            `BITMAP ${xOffset},0,${widthBytes},${targetHeight},0,`, 
        ];

        // 5. Enviar comandos
        await this.sendCommands(cmds, bitmapData);
        await this.sendCommand(`PRINT 1\r\n`);
        
        showToast("Etiqueta enviada a imprimir 🖨️", "success");
    },

    canvasToTsplBitmap(canvas) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;
        const width = canvas.width;
        const height = canvas.height;
        const widthBytes = Math.ceil(width / 8);
        
        // Inicializamos con 255 (Blanco = 1)
        const bitmap = new Uint8Array(widthBytes * height);
        bitmap.fill(0xFF);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const gray = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
                
                // Si es un color oscuro (como el texto), ponemos el bit a 0 (Negro = 0)
                if (gray < 128) {
                    const bytePos = (y * widthBytes) + Math.floor(x / 8);
                    const bitPos = 7 - (x % 8);
                    bitmap[bytePos] &= ~(1 << bitPos);
                }
            }
        }
        return bitmap;
    },

    async sendCommands(cmds, bitmapData) {
        const encoder = new TextEncoder();
        
        // Enviar comandos previos
        for (const cmd of cmds) {
            await this.sendCommand(encoder.encode(cmd));
        }

        // Aumentar Chunk Size (512 es seguro para Web BLE)
        // Usamos writeValueWithoutResponse para no esperar confirmación por cada trozo
        const chunkSize = 512;
        for (let i = 0; i < bitmapData.length; i += chunkSize) {
            const chunk = bitmapData.slice(i, i + chunkSize);
            try {
                await this.characteristic.writeValueWithoutResponse(chunk);
            } catch (e) {
                // Fallback si no soporta writeValueWithoutResponse
                await this.characteristic.writeValue(chunk);
            }
        }

        // Enviar salto de línea tras el bitmap
        await this.sendCommand(encoder.encode("\r\n"));
    },

    async sendCommand(data) {
        if (typeof data === 'string') {
            data = new TextEncoder().encode(data);
        }
        const chunkSize = 512;
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            try {
                await this.characteristic.writeValueWithoutResponse(chunk);
            } catch (e) {
                await this.characteristic.writeValue(chunk);
            }
        }
    }
};

window.printLabelBLE = () => PRINTER_BLE.printLabel('label-cosecha-box');
