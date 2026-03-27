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
        this.originalDataCallback = null;
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
        await this.serial.sendCtrlA();
        await this.sleep(300);
    }

    /**
     * Sai do Raw REPL mode (Ctrl+B)
     */
    async exitRawREPL() {
        await this.serial.sendCtrlB();
        await this.sleep(100);
    }

    /**
     * Aguarda prompt do Raw REPL
     */
    async waitForRawPrompt(timeout = 3000) {
        return new Promise((resolve, reject) => {
            let buffer = '';
            const timeoutId = setTimeout(() => {
                reject(new Error('Timeout waiting for Raw REPL prompt'));
            }, timeout);

            const checkBuffer = (data) => {
                buffer += data;
                // Raw REPL prompt é '>'
                if (buffer.includes('>')) {
                    clearTimeout(timeoutId);
                    resolve();
                }
            };

            // Override data callback temporarily
            const originalCallback = this.serial.onDataCallback;
            this.serial.onDataCallback = (data) => {
                checkBuffer(data);
                if (originalCallback) originalCallback(data);
            };

            // Restore after timeout or success
            setTimeout(() => {
                this.serial.onDataCallback = originalCallback;
            }, timeout);
        });
    }

    /**
     * Executa comando Python no Raw REPL e retorna resposta
     */
    async execRaw(command, timeout = 5000) {
        return new Promise(async (resolve, reject) => {
            let response = '';
            let timeoutId;
            let originalCallback = null;

            const cleanup = () => {
                clearTimeout(timeoutId);
                if (originalCallback !== null) {
                    this.serial.onDataCallback = originalCallback;
                }
            };

            const onData = (data) => {
                response += data;
                
                // Verifica se recebeu Ctrl+D (fim de execução)
                if (response.includes('\x04')) {
                    cleanup();
                    
                    // Processa resposta
                    const result = response
                        .replace(/OK/g, '')
                        .replace(/\x04/g, '')
                        .replace(/>/g, '')
                        .trim();
                    
                    if (result.startsWith('Traceback') || 
                        result.includes('Error:') || 
                        result.includes('Exception')) {
                        reject(new Error(result.substring(0, 200)));
                    } else {
                        resolve(result);
                    }
                }
            };

            // Guarda callback original e substitui
            originalCallback = this.serial.onDataCallback;
            this.serial.onDataCallback = onData;

            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Timeout execução Raw REPL'));
            }, timeout);

            try {
                // Envia comando no formato Raw REPL
                await this.serial.write(command);
                await this.serial.write('\x04'); // Ctrl+D = executa
            } catch (error) {
                cleanup();
                reject(error);
            }
        });
    }

    /**
     * Cria/escreve arquivo no filesystem da placa usando método robusto
     * Usa base64 para evitar problemas com caracteres especiais
     */
    async writeFile(filename, content) {
        // Converte para base64 para evitar escaping problemático
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        
        // Comando Python para criar arquivo a partir de base64
        const cmd = `
import ubinascii
import os
data = ubinascii.a2b_base64('${base64Content}')
f = open('${filename}', 'wb')
f.write(data)
f.close()
print('OK')
`;

        await this.execRaw(cmd);
    }

    /**
     * Cria diretório se não existir
     */
    async mkdir(dirname) {
        const cmd = `
import os
try:
    os.mkdir('${dirname}')
except OSError:
    pass
`;
        await this.execRaw(cmd);
    }

    /**
     * Deleta arquivo do filesystem
     */
    async deleteFile(filename) {
        const cmd = `
import os
try:
    os.remove('${filename}')
except OSError:
    pass
`;
        await this.execRaw(cmd);
    }

    /**
     * Lista arquivos no filesystem
     */
    async listFiles(path = '.') {
        const cmd = `
import os
try:
    files = os.listdir('${path}')
    for f in files:
        print(f)
except:
    pass
`;
        return await this.execRaw(cmd);
    }

    /**
     * Faz download do arquivo da URL e retorna conteúdo como texto
     */
    async downloadFile(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            throw new Error(`Download failed: ${error.message}`);
        }
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
        const originalCallback = this.serial.onDataCallback;
        
        this.updateStatus('Starting flash process...');

        try {
            const totalFiles = 1 + libraryURLs.length;
            let completedFiles = 0;

            // 1. Para qualquer execução atual
            this.updateStatus('Stopping current execution...');
            await this.serial.sendCtrlC();
            await this.sleep(200);

            // 2. Entra no Raw REPL
            this.updateStatus('Entering Raw REPL mode...');
            await this.enterRawREPL();
            await this.sleep(300);

            // 3. Download e flash do Main.py
            this.updateStatus('Downloading main.py...');
            const mainContent = await this.downloadFile(mainFileURL);
            
            this.updateStatus('Flashing main.py...');
            await this.writeFile('main.py', mainContent);
            completedFiles++;
            this.updateProgress((completedFiles / totalFiles) * 100);
            this.updateStatus('main.py ✓');

            // 4. Download e flash das bibliotecas
            if (libraryURLs.length > 0) {
                // Cria diretório lib se necessário
                await this.mkdir('lib');
                
                for (const libUrl of libraryURLs) {
                    const filename = libUrl.split('/').pop() || 'lib.py';
                    this.updateStatus(`Downloading ${filename}...`);
                    const libContent = await this.downloadFile(libUrl);
                    
                    // Salva na pasta lib/
                    const libPath = `lib/${filename}`;
                    this.updateStatus(`Flashing ${libPath}...`);
                    await this.writeFile(libPath, libContent);
                    completedFiles++;
                    this.updateProgress((completedFiles / totalFiles) * 100);
                    this.updateStatus(`${libPath} ✓`);
                }
            }

            // 5. Sai do Raw REPL
            this.updateStatus('Exiting Raw REPL...');
            await this.exitRawREPL();
            await this.sleep(100);

            // 6. Soft reset para executar main.py
            this.updateStatus('Restarting device...');
            await this.serial.sendCtrlD();

            this.updateStatus('Flash completed successfully!');
            this.updateProgress(100);
            this.isFlashing = false;
            
            // Restaura callback original
            this.serial.onDataCallback = originalCallback;
            
            return true;

        } catch (error) {
            this.isFlashing = false;
            this.updateStatus(`Error: ${error.message}`);
            
            // Tenta restaurar estado normal
            try {
                await this.exitRawREPL();
                await this.serial.sendCtrlC();
            } catch (e) {
                // Ignora erro ao recuperar
            }
            
            // Restaura callback original
            this.serial.onDataCallback = originalCallback;
            
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

        const originalCallback = this.serial.onDataCallback;
        
        try {
            await this.enterRawREPL();
            const result = await this.execRaw(code);
            await this.exitRawREPL();
            return result;
        } catch (error) {
            await this.exitRawREPL();
            throw error;
        } finally {
            this.serial.onDataCallback = originalCallback;
        }
    }

    updateProgress(percent) {
        if (this.onProgressCallback) {
            this.onProgressCallback(Math.round(percent));
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
