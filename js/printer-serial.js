/**
 * Módulo de Impresión USB (Serial) para Detonger P1 (TSPL)
 * Usa Web Serial API para una impresión instantánea.
 */

const PRINTER_SERIAL = {
    port: null,
    writer: null,

    async connect() {
        try {
            if (this.port && this.port.writable) return true;

            // Solicitar puerto si no existe
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 }); // Baudrate estándar para impresoras térmicas
            
            this.writer = this.port.writable.getWriter();

            this.port.addEventListener('disconnect', () => {
                showToast("Impresora USB desconectada", "warning");
                this.port = null;
                this.writer = null;
            });

            showToast("Impresora USB conectada ✅", "success");
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

        showToast("Procesando etiqueta USB...", "info");

        // Capturar y rotar (igual que en BLE)
        const canvas = await html2canvas(el, { 
            scale: 3, 
            useCORS: true,
            backgroundColor: '#ffffff' 
        });
        
        const targetWidth = 400; 
        const targetHeight = 640;
        const processedCanvas = document.createElement('canvas');
        processedCanvas.width = targetWidth;
        processedCanvas.height = targetHeight;
        const ctx = processedCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

        // Convertir a Bitmap TSPL
        const bitmapData = this.canvasToTsplBitmap(processedCanvas);
        
        const widthBytes = Math.ceil(targetWidth / 8);
        const xOffset = 0;
        
        // Comandos TSPL (50x80mm)
        const encoder = new TextEncoder();
        const header = encoder.encode(`SIZE 50 mm, 80 mm\r\nGAP 3 mm, 0 mm\r\nREFERENCE 0,0\r\nOFFSET 0\r\nDIRECTION 0\r\nCLS\r\nBITMAP ${xOffset},0,${widthBytes},${targetHeight},0,`);
        const footer = encoder.encode(`PRINT 1\r\n`);

        // Enviar todo por el puerto serie (mucho más rápido que BLE)
        try {
            await this.writer.write(header);
            await this.writer.write(bitmapData);
            await this.writer.write(footer);
            
            showToast("Etiqueta USB impresa 🖨️", "success");
        } catch (err) {
            console.error(err);
            showToast("Error durante la impresión USB", "danger");
            // Limpiar puerto en caso de error fatal
            this.writer.releaseLock();
            await this.port.close();
            this.port = null;
        }
    },

    canvasToTsplBitmap(canvas) {
        // Reutilizamos la misma lógica que en BLE para consistencia
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;
        const width = canvas.width;
        const height = canvas.height;
        const widthBytes = Math.ceil(width / 8);
        const bitmap = new Uint8Array(widthBytes * height);
        bitmap.fill(0xFF);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const gray = (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
                if (gray < 128) {
                    const bytePos = (y * widthBytes) + Math.floor(x / 8);
                    const bitPos = 7 - (x % 8);
                    bitmap[bytePos] &= ~(1 << bitPos);
                }
            }
        }
        return bitmap;
    }
};

window.printLabelUSB = () => PRINTER_SERIAL.printLabel('label-cosecha-box');
