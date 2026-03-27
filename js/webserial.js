/**
 * WebSerial - Gerenciamento de comunicação serial via Web Serial API
 */
class WebSerial {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
        this.isConnected = false;
        this.baudRate = 115200;
        this.readLoopPromise = null;
        this.onDataCallback = null;
        this.onConnectCallback = null;
        this.onDisconnectCallback = null;
    }

    /**
     * Verifica se a Web Serial API está disponível
     */
    static isSupported() {
        return 'serial' in navigator;
    }

    /**
     * Define o callback para dados recebidos
     */
    onData(callback) {
        this.onDataCallback = callback;
    }

    /**
     * Define o callback para conexão
     */
    onConnect(callback) {
        this.onConnectCallback = callback;
    }

    /**
     * Define o callback para desconexão
     */
    onDisconnect(callback) {
        this.onDisconnectCallback = callback;
    }

    /**
     * Conecta a um dispositivo serial
     */
    async connect(baudRate = 115200) {
        if (!WebSerial.isSupported()) {
            throw new Error('Web Serial API não é suportada neste navegador. Use Chrome ou Edge.');
        }

        try {
            this.baudRate = baudRate;
            
            // Solicita porta ao usuário
            this.port = await navigator.serial.requestPort();
            
            // Abre a porta
            await this.port.open({ baudRate: this.baudRate });
            
            this.isConnected = true;
            
            // Inicia o loop de leitura
            this._startReading();
            
            if (this.onConnectCallback) {
                this.onConnectCallback();
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao conectar:', error);
            throw error;
        }
    }

    /**
     * Desconecta do dispositivo
     */
    async disconnect() {
        if (!this.isConnected || !this.port) {
            return;
        }

        try {
            this.isConnected = false;
            
            // Cancela a leitura
            if (this.reader) {
                await this.reader.cancel();
                this.reader = null;
            }
            
            // Fecha a porta
            if (this.port) {
                await this.port.close();
                this.port = null;
            }
            
            if (this.onDisconnectCallback) {
                this.onDisconnectCallback();
            }
        } catch (error) {
            console.error('Erro ao desconectar:', error);
        }
    }

    /**
     * Envia dados para o dispositivo
     */
    async write(data) {
        if (!this.isConnected || !this.port) {
            throw new Error('Não está conectado');
        }

        try {
            const writer = this.port.writable.getWriter();
            const encoded = this.encoder.encode(data);
            await writer.write(encoded);
            writer.releaseLock();
        } catch (error) {
            console.error('Erro ao enviar:', error);
            throw error;
        }
    }

    /**
     * Envia um comando com ENTER
     */
    async sendCommand(command) {
        await this.write(command + '\r\n');
    }

    /**
     * Envia Ctrl+C (interrompe execução)
     */
    async sendCtrlC() {
        await this.write('\x03');
    }

    /**
     * Envia Ctrl+D (soft reset no MicroPython)
     */
    async sendCtrlD() {
        await this.write('\x04');
    }

    /**
     * Loop de leitura de dados
     */
    async _startReading() {
        while (this.port && this.port.readable && this.isConnected) {
            try {
                this.reader = this.port.readable.getReader();
                
                while (this.isConnected) {
                    const { value, done } = await this.reader.read();
                    
                    if (done) {
                        break;
                    }
                    
                    if (value && this.onDataCallback) {
                        const text = this.decoder.decode(value, { stream: true });
                        this.onDataCallback(text);
                    }
                }
            } catch (error) {
                if (this.isConnected) {
                    console.error('Erro na leitura:', error);
                }
            } finally {
                if (this.reader) {
                    this.reader.releaseLock();
                    this.reader = null;
                }
            }
        }
    }

    /**
     * Retorna o estado da conexão
     */
    get connected() {
        return this.isConnected;
    }
}

// Exporta para uso global
window.WebSerial = WebSerial;
