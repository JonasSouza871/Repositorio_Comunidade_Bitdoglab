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
     * Executa comando Python no Raw REPL e retorna resposta
     * Protocolo Raw REPL: 
     * 1. Envia código
     * 2. Envia \n (newline)
     * 3. Envia Ctrl+D (0x04) para executar
     * 4. Aguarda resposta terminando com Ctrl+D
     */
    async execRaw(command, timeout = 10000) {
        return new Promise(async (resolve, reject) => {
            let response = '';
            let timeoutId = null;
            let originalCallback = null;
            let isResolved = false;

            const cleanup = () => {
                if (isResolved) return;
                isResolved = true;
                
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                
                // Restaura callback original
                if (originalCallback !== null && this.serial) {
                    this.serial.onDataCallback = originalCallback;
                }
            };

            const onData = (data) => {
                response += data;
                
                // Verifica se recebeu Ctrl+D (fim de execução)
                // O Raw REPL retorna: output + Ctrl+D + error_output + Ctrl+D + '>'
                const ctrlDIndex = response.indexOf('\x04');
                if (ctrlDIndex !== -1) {
                    // Aguarda o segundo Ctrl+D (fim do error output) ou '>'
                    const secondPart = response.slice(ctrlDIndex + 1);
                    if (secondPart.includes('\x04') || secondPart.includes('>')) {
                        cleanup();
                        
                        // Processa resposta: tudo antes do primeiro Ctrl+D é o output
                        let result = response.substring(0, ctrlDIndex);
                        
                        // Remove 'OK' inicial se presente
                        result = result.replace(/^OK\n?/, '');
                        
                        // Verifica se há erro (entre os dois Ctrl+D)
                        const errorMatch = response.match(/\x04([\s\S]*?)\x04/);
                        if (errorMatch && errorMatch[1] && 
                            (errorMatch[1].includes('Traceback') || 
                             errorMatch[1].includes('Error') ||
                             errorMatch[1].includes('Exception'))) {
                            reject(new Error(errorMatch[1].substring(0, 200)));
                            return;
                        }
                        
                        // Verifica se o resultado contém erro
                        if (result.includes('Traceback') || 
                            result.includes('SyntaxError') ||
                            result.includes('NameError') ||
                            result.includes('TypeError') ||
                            result.includes('ImportError')) {
                            reject(new Error(result.substring(0, 200)));
                        } else {
                            resolve(result.trim());
                        }
                    }
                }
            };

            // Guarda callback original
            originalCallback = this.serial.onDataCallback;
            this.serial.onDataCallback = onData;

            // Timeout
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Timeout execução Raw REPL'));
            }, timeout);

            try {
                // Envia comando
                await this.serial.write(command);
                // Envia newline + Ctrl+D para executar (protocolo Raw REPL)
                await this.serial.write('\n\x04');
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
        // Converte para base64 de forma segura com Unicode
        // Usa encodeURIComponent + unescape para converter UTF-8 → binário
        const base64Content = btoa(
            encodeURIComponent(content).replace(/%([0-9A-F]{2})/g, 
                (match, p1) => String.fromCharCode('0x' + p1)
            )
        );
        
        // Divide em chunks se for muito grande (limite do buffer serial)
        const chunkSize = 512;
        const chunks = [];
        for (let i = 0; i < base64Content.length; i += chunkSize) {
            chunks.push(base64Content.substring(i, i + chunkSize));
        }
        
        // Comando Python para criar arquivo a partir de base64
        let cmd = `
import ubinascii
import os

# Remove arquivo existente se houver
try:
    os.remove('${filename}')
except:
    pass

# Cria novo arquivo
data = ubinascii.a2b_base64('${chunks[0]}')
with open('${filename}', 'wb') as f:
    f.write(data)
`;

        // Se tiver mais chunks, adiciona append
        for (let i = 1; i < chunks.length; i++) {
            cmd += `
with open('${filename}', 'ab') as f:
    f.write(ubinascii.a2b_base64('${chunks[i]}'))
`;
        }

        cmd += `\nprint('OK')`;

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
        this.originalDataCallback = this.serial.onDataCallback;
        
        this.updateStatus('Starting flash process...');

        try {
            const totalFiles = 1 + libraryURLs.length;
            let completedFiles = 0;

            // 1. Para qualquer execução atual
            this.updateStatus('Stopping current execution...');
            await this.serial.sendCtrlC();
            await this.sleep(300);

            // 2. Entra no Raw REPL
            this.updateStatus('Entering Raw REPL mode...');
            await this.enterRawREPL();
            await this.sleep(500);

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
            await this.sleep(200);

            // 6. Soft reset para executar main.py
            this.updateStatus('Restarting device...');
            await this.serial.sendCtrlD();
            await this.sleep(500);

            this.updateStatus('Flash completed successfully!');
            this.updateProgress(100);
            this.isFlashing = false;
            
            // Restaura callback original
            this.serial.onDataCallback = this.originalDataCallback;
            this.originalDataCallback = null;
            
            return true;

        } catch (error) {
            this.isFlashing = false;
            this.updateStatus(`Error: ${error.message}`);
            
            // Tenta restaurar estado normal
            try {
                await this.exitRawREPL();
                await this.sleep(100);
                await this.serial.sendCtrlC();
            } catch (e) {
                // Ignora erro ao recuperar
            }
            
            // Restaura callback original
            if (this.originalDataCallback !== null) {
                this.serial.onDataCallback = this.originalDataCallback;
                this.originalDataCallback = null;
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

        const savedCallback = this.serial.onDataCallback;
        
        try {
            await this.enterRawREPL();
            const result = await this.execRaw(code);
            await this.exitRawREPL();
            return result;
        } catch (error) {
            await this.exitRawREPL();
            throw error;
        } finally {
            this.serial.onDataCallback = savedCallback;
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
