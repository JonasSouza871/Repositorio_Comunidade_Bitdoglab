/**
 * Flash - Envio de arquivos MicroPython para BitDogLab via WebSerial
 * Usa Raw REPL mode para transferir arquivos
 */

class FlashManager {
    constructor(webSerial) {
        this.serial = webSerial;
        this.isFlashing = false;
        this.onProgressCallback = null;
        this.onStatusCallback = null;
    }

    /**
     * Define callback para progresso (0-100)
     */
    onProgress(callback) {
        this.onProgressCallback = callback;
    }

    /**
     * Define callback para status/mensagens
     */
    onStatus(callback) {
        this.onStatusCallback = callback;
    }

    /**
     * Entra no Raw REPL mode (Ctrl+A)
     */
    async enterRawREPL() {
        await this.serial.write('\x01'); // Ctrl+A
        await this.sleep(100);
    }

    /**
     * Sai do Raw REPL mode (Ctrl+B)
     */
    async exitRawREPL() {
        await this.serial.write('\x02'); // Ctrl+B
        await this.sleep(100);
    }

    /**
     * Executa comando Python no Raw REPL e retorna resposta
     */
    async execRaw(command, timeout = 5000) {
        return new Promise(async (resolve, reject) => {
            let response = '';
            let timeoutId;

            const onData = (data) => {
                response += data;
                // Raw REPL retorna OK\n quando comando executa com sucesso
                // ou ER\n quando há erro
                if (response.includes('\x04')) {
                    clearTimeout(timeoutId);
                    this.serial.onDataCallback = null; // Remove listener temporário
                    
                    // Processa resposta: remove OK e Ctrl+D
                    const result = response
                        .replace('OK', '')
                        .replace('\x04', '')
                        .trim();
                    
                    if (result.startsWith('Traceback') || result.includes('Error:')) {
                        reject(new Error(result));
                    } else {
                        resolve(result);
                    }
                }
            };

            // Guarda callback original
            const originalCallback = this.serial.onDataCallback;
            this.serial.onDataCallback = onData;

            timeoutId = setTimeout(() => {
                this.serial.onDataCallback = originalCallback;
                reject(new Error('Timeout execução Raw REPL'));
            }, timeout);

            // Envia comando no formato Raw REPL
            await this.serial.write(command);
            await this.serial.write('\x04'); // Ctrl+D = executa
        });
    }

    /**
     * Cria/escreve arquivo no filesystem da placa
     */
    async writeFile(filename, content) {
        // Escapa caracteres especiais no conteúdo
        const escaped = content
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');

        // Comando Python para criar arquivo
        const cmd = `
f = open('${filename}', 'w')
f.write('${escaped}')
f.close()
`;

        await this.execRaw(cmd);
    }

    /**
     * Deleta arquivo do filesystem
     */
    async deleteFile(filename) {
        const cmd = `import os; os.remove('${filename}')`;
        await this.execRaw(cmd);
    }

    /**
     * Lista arquivos no filesystem
     */
    async listFiles() {
        const cmd = `
import os
files = os.listdir()
for f in files:
    print(f)
`;
        return await this.execRaw(cmd);
    }

    /**
     * Faz download do arquivo da URL e retorna conteúdo como texto
     */
    async downloadFile(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download: ${response.status}`);
        }
        return await response.text();
    }

    /**
     * Flasheia arquivos na placa
     * @param {string} mainFileURL - URL do Main.py
     * @param {string[]} libraryURLs - URLs das bibliotecas
     * @returns {Promise<boolean>} - true se sucesso
     */
    async flashToDevice(mainFileURL, libraryURLs = []) {
        if (this.isFlashing) {
            throw new Error('Flash already in progress');
        }

        if (!this.serial.connected) {
            throw new Error('Device not connected. Please connect first.');
        }

        this.isFlashing = true;
        this.updateStatus('Starting flash process...');

        try {
            const totalFiles = 1 + libraryURLs.length;
            let completedFiles = 0;

            // 1. Entra no Raw REPL
            this.updateStatus('Entering Raw REPL mode...');
            await this.enterRawREPL();

            // 2. Download e flash do Main.py
            this.updateStatus('Downloading Main.py...');
            const mainContent = await this.downloadFile(mainFileURL);
            
            this.updateStatus('Flashing Main.py...');
            await this.writeFile('main.py', mainContent);
            completedFiles++;
            this.updateProgress((completedFiles / totalFiles) * 100);
            this.updateStatus('Main.py ✓');

            // 3. Download e flash das bibliotecas
            for (const libUrl of libraryURLs) {
                const filename = libUrl.split('/').pop() || 'lib.py';
                this.updateStatus(`Downloading ${filename}...`);
                const libContent = await this.downloadFile(libUrl);
                
                this.updateStatus(`Flashing ${filename}...`);
                await this.writeFile(filename, libContent);
                completedFiles++;
                this.updateProgress((completedFiles / totalFiles) * 100);
                this.updateStatus(`${filename} ✓`);
            }

            // 4. Sai do Raw REPL
            this.updateStatus('Exiting Raw REPL...');
            await this.exitRawREPL();

            // 5. Soft reset para executar main.py
            this.updateStatus('Restarting device...');
            await this.serial.sendCtrlD();

            this.updateStatus('Flash completed successfully!');
            this.updateProgress(100);
            this.isFlashing = false;
            return true;

        } catch (error) {
            this.isFlashing = false;
            this.updateStatus(`Error: ${error.message}`);
            
            // Tenta sair do Raw REPL em caso de erro
            try {
                await this.exitRawREPL();
            } catch (e) {
                // Ignora erro ao sair
            }
            
            throw error;
        }
    }

    /**
     * Executa código Python diretamente (útil para testes)
     */
    async execPython(code) {
        if (!this.serial.connected) {
            throw new Error('Device not connected');
        }

        await this.enterRawREPL();
        try {
            const result = await this.execRaw(code);
            await this.exitRawREPL();
            return result;
        } catch (error) {
            await this.exitRawREPL();
            throw error;
        }
    }

    updateProgress(percent) {
        if (this.onProgressCallback) {
            this.onProgressCallback(percent);
        }
    }

    updateStatus(message) {
        if (this.onStatusCallback) {
            this.onStatusCallback(message);
        }
        console.log('[Flash]', message);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Instância global (será inicializada com o WebSerial)
window.FlashManager = FlashManager;

// Função global que o Claude vai chamar
window.flashToDevice = async function(mainFileURL, libraryURLs = []) {
    if (!window.flashManager) {
        throw new Error('FlashManager not initialized. Please initialize with WebSerial instance first.');
    }
    return await window.flashManager.flashToDevice(mainFileURL, libraryURLs);
};
