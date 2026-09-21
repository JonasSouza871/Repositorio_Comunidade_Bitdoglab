/**
 * Flash - Envio de arquivos MicroPython para BitDogLab via WebSerial
 * Usa Raw REPL mode para transferir arquivos
 */

class FlashManager {
    constructor(webSerial) {
        this.serial = webSerial;
        this.onStatusCallback = null;
    }

    static pythonStringLiteral(value) {
        return JSON.stringify(String(value));
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
        return new Promise((resolve, reject) => {
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
                this.serial.write(command)
                    .then(() => this.serial.write('\n\x04'))
                    .catch(error => {
                        cleanup();
                        reject(error);
                    });
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
        const fileLiteral = FlashManager.pythonStringLiteral(filename);

        // Converte para base64 de forma segura com Unicode
        // Usa encodeURIComponent + unescape para converter UTF-8 → binário
        const base64Content = btoa(
            encodeURIComponent(content).replace(/%([0-9A-F]{2})/g,
                (match, p1) => String.fromCharCode(parseInt(p1, 16))
            )
        );

        // Divide em chunks se for muito grande (limite do buffer serial)
        const chunkSize = 512;
        const chunks = [];
        for (let i = 0; i < base64Content.length; i += chunkSize) {
            chunks.push(base64Content.substring(i, i + chunkSize));
        }
        if (chunks.length === 0) chunks.push('');

        // Comando Python para criar arquivo a partir de base64
        let cmd = `
import ubinascii
import os

# Remove arquivo existente se houver
try:
    os.remove(${fileLiteral})
except:
    pass

# Cria novo arquivo
data = ubinascii.a2b_base64(${FlashManager.pythonStringLiteral(chunks[0])})
with open(${fileLiteral}, 'wb') as f:
    f.write(data)
`;

        // Se tiver mais chunks, adiciona append
        for (let i = 1; i < chunks.length; i++) {
            cmd += `
with open(${fileLiteral}, 'ab') as f:
    f.write(ubinascii.a2b_base64(${FlashManager.pythonStringLiteral(chunks[i])}))
`;
        }

        cmd += `\nprint('OK')`;

        await this.execRaw(cmd);
    }

    /**
     * Cria diretório se não existir
     */
    async mkdir(dirname) {
        const dirLiteral = FlashManager.pythonStringLiteral(dirname);
        const cmd = `
import os
try:
    os.mkdir(${dirLiteral})
except OSError:
    pass
`;
        await this.execRaw(cmd);
    }

    updateStatus(message) {
        if (this.onStatusCallback) {
            this.onStatusCallback(message);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Instância global (será inicializada com o WebSerial)
window.FlashManager = FlashManager;
