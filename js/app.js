/**
 * App - BitDogLab WebSerial
 */
document.addEventListener('DOMContentLoaded', () => {
    // Elementos da UI
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resetBtn = document.getElementById('resetBtn');
    const stopBtn = document.getElementById('stopBtn');
    const sendBtn = document.getElementById('sendBtn');
    const ctrlCBtn = document.getElementById('ctrlCBtn');
    const ctrlDBtn = document.getElementById('ctrlDBtn');
    const commandInput = document.getElementById('commandInput');
    const baudRateSelect = document.getElementById('baudRate');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    // WebSerial
    const serial = new WebSerial();

    // xterm.js
    const term = new Terminal({
        cursorBlink: true,
        theme: {
            background: '#1a1a2e',
            foreground: '#EAEAEA',
            cursor: '#E91E8C',
            selection: 'rgba(233, 30, 140, 0.3)',
            black: '#1a1a2e',
            red: '#E91E8C',
            green: '#00C9A7',
            yellow: '#FFE66D',
            blue: '#4A90E2',
            magenta: '#E91E8C',
            cyan: '#4ECDC4',
            white: '#F8F9FA',
            brightBlack: '#495057',
            brightRed: '#F04CA3',
            brightGreen: '#00D9B5',
            brightYellow: '#FFF099',
            brightBlue: '#6BA5E7',
            brightMagenta: '#F04CA3',
            brightCyan: '#6EDDD5',
            brightWhite: '#FFFFFF'
        },
        fontSize: 14,
        fontFamily: "'Courier New', 'Consolas', 'Liberation Mono', monospace",
        scrollback: 10000,
        lineHeight: 1.2,
        letterSpacing: 0
    });

    term.open(document.getElementById('terminal'));
    
    // Mensagem inicial
    term.writeln('\r\nBitDogLab - Terminal Serial');
    term.writeln('----------------------------');
    term.writeln('Clique em "Conectar" para começar.\r\n');

    // Callbacks
    serial.onData((data) => {
        term.write(data);
    });

    serial.onConnect(() => {
        updateUIState(true);
        term.writeln('\r\n\x1b[32m[Conectado]\x1b[0m');
    });

    serial.onDisconnect(() => {
        updateUIState(false);
        term.writeln('\r\n\x1b[31m[Desconectado]\x1b[0m');
    });

    // Atualiza estado da UI
    function updateUIState(connected) {
        connectBtn.disabled = connected;
        disconnectBtn.disabled = !connected;
        resetBtn.disabled = !connected;
        stopBtn.disabled = !connected;
        sendBtn.disabled = !connected;
        ctrlCBtn.disabled = !connected;
        ctrlDBtn.disabled = !connected;
        commandInput.disabled = !connected;
        baudRateSelect.disabled = connected;

        if (connected) {
            statusDot.classList.remove('disconnected');
            statusDot.classList.add('connected');
            statusText.textContent = 'Conectado';
        } else {
            statusDot.classList.remove('connected');
            statusDot.classList.add('disconnected');
            statusText.textContent = 'Desconectado';
        }
    }

    // Eventos
    connectBtn.addEventListener('click', async () => {
        if (!WebSerial.isSupported()) {
            term.writeln('\r\n\x1b[31mErro: Web Serial API não é suportada neste navegador. Use Chrome, Edge ou Opera.\x1b[0m');
            return;
        }
        try {
            await serial.connect(parseInt(baudRateSelect.value));
        } catch (error) {
            if (error.name !== 'NotFoundError') {
                term.writeln(`\r\nErro: ${error.message}`);
            }
        }
    });

    disconnectBtn.addEventListener('click', () => serial.disconnect());

    resetBtn.addEventListener('click', async () => {
        if (!serial.connected) return;
        await serial.sendCtrlD();
        term.writeln('\x1b[33m[Reset - Ctrl+D]\x1b[0m');
    });

    stopBtn.addEventListener('click', async () => {
        if (!serial.connected) return;
        await serial.sendCtrlC();
        term.writeln('\x1b[33m[Parar - Ctrl+C]\x1b[0m');
    });

    clearBtn.addEventListener('click', () => term.clear());
    sendBtn.addEventListener('click', sendCommand);
    commandInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendCommand());

    async function sendCommand() {
        const command = commandInput.value.trim();
        if (!command) return;
        try {
            await serial.sendCommand(command);
            commandInput.value = '';
        } catch (error) {
            term.writeln(`\r\nErro: ${error.message}`);
        }
    }

    ctrlCBtn.addEventListener('click', async () => {
        await serial.sendCtrlC();
        term.writeln('^C');
    });

    ctrlDBtn.addEventListener('click', async () => {
        await serial.sendCtrlD();
        term.writeln('^D');
    });

    // Verificação inicial
    if (!WebSerial.isSupported()) {
        connectBtn.disabled = true;
        term.writeln('\r\n\x1b[31mAviso: Seu navegador não suporta Web Serial API.\x1b[0m');
        term.writeln('\x1b[33mUse Chrome, Edge ou Opera para conectar sua placa.\x1b[0m');
    }

    // ==========================================
    // Flash Manager - Integração para envio de código
    // ==========================================
    
    // FlashManager
    const flashManager = new FlashManager(serial);
    window.flashManager = flashManager;

    // Configura callbacks de progresso e status
    flashManager.onProgress((percent) => {
        if (window.onFlashProgress) {
            window.onFlashProgress(percent);
        }
    });

    flashManager.onStatus((message) => {
        // Status no terminal
        term.writeln(`\r\n\x1b[36m[Flash] ${message}\x1b[0m`);
        
        if (window.onFlashStatus) {
            window.onFlashStatus(message);
        }
    });

    // Global para flash.js
    window.webSerial = serial;

    // ==========================================
    // Suporte à Navegação por Abas
    // ==========================================
    
    window.refreshTerminal = function() {
        setTimeout(() => {
            term.fitAddon?.fit();
            term.refresh(0, term.rows - 1);
        }, 100);
    };

    window.isDeviceConnected = function() {
        return serial.connected;
    };

    window.getTerminal = function() {
        return term;
    };

    window.writeToTerminal = function(message, color = null) {
        if (color) {
            term.writeln(`\r\n\x1b[${color}m${message}\x1b[0m`);
        } else {
            term.writeln(`\r\n${message}`);
        }
    };

    // ==========================================
    // Aba terminal visível
    // ==========================================
    window.addEventListener('terminal-visible', () => {
        window.refreshTerminal();
    });
});
