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

        // 1. Capturar DOM a Canvas (Forzamos fondo blanco para evitar problemas de transparencia o modo oscuro)
        const canvas = await html2canvas(el, { 
            scale: 2, 
            useCORS: true,
            backgroundColor: '#ffffff' 
        });
        
        // 2. Rotar 90 grados y ajustar a 384px de ancho (48mm a 203dpi)
        const targetWidth = 384; 
        const aspectRatio = canvas.height / canvas.width;
        const targetHeight = Math.round(targetWidth * (canvas.width / canvas.height));

        const rotatedCanvas = document.createElement('canvas');
        rotatedCanvas.width = targetWidth;
        rotatedCanvas.height = targetHeight;
        const ctx = rotatedCanvas.getContext('2d');

        // Fondo blanco también en el canvas de rotación
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        ctx.translate(targetWidth, 0);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(canvas, 0, 0, targetHeight, targetWidth);

        // 3. Convertir a Bitmap de 1 bit (TSPL)
        const bitmapData = this.canvasToTsplBitmap(rotatedCanvas);
        
        // 4. Generar comandos TSPL
        const widthBytes = Math.ceil(targetWidth / 8);
        const cmds = [
            `SIZE 50 mm, 80 mm\r\n`,
            `GAP 3 mm, 0 mm\r\n`,
            `DIRECTION 0\r\n`,
            `CLS\r\n`,
            `BITMAP 0,0,${widthBytes},${targetHeight},1,`, // Modo 1 (OR) a veces ayuda, pero probamos con 0 si falla
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
        const bitmap = new Uint8Array(widthBytes * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                // Luminosidad: 0.299R + 0.587G + 0.114B
                const gray = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
                
                // Umbral (Threshold)
                if (gray < 128) {
                    // Píxel Negro (En TSPL 0 suele ser negro dependiendo del modo BITMAP, 
                    // pero para BITMAP x,y,w,h,m suele ser: bit 1 = negro, bit 0 = blanco si mode=0)
                    // Invertimos porque TSPL BITMAP 1 = negro
                    const bytePos = (y * widthBytes) + Math.floor(x / 8);
                    const bitPos = 7 - (x % 8);
                    bitmap[bytePos] |= (1 << bitPos);
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

        // Enviar datos del bitmap en chunks de 20 bytes (estándar BLE MTU seguro)
        const chunkSize = 20;
        for (let i = 0; i < bitmapData.length; i += chunkSize) {
            const chunk = bitmapData.slice(i, i + chunkSize);
            await this.characteristic.writeValue(chunk);
        }

        // Enviar salto de línea tras el bitmap
        await this.sendCommand(encoder.encode("\r\n"));
    },

    async sendCommand(data) {
        if (typeof data === 'string') {
            data = new TextEncoder().encode(data);
        }
        // Fragmentar si es necesario
        const chunkSize = 20;
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            await this.characteristic.writeValue(chunk);
        }
    }
};

window.printLabelBLE = () => PRINTER_BLE.printLabel('label-cosecha-box');
