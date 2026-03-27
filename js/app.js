/**
 * App - BitDogLab WebSerial
 * Terminal simples para comunicação serial
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

    // Instância do WebSerial
    const serial = new WebSerial();

    // Terminal xterm.js
    const term = new Terminal({
        cursorBlink: true,
        theme: {
            background: '#161221',
            foreground: '#89b4fa',
            cursor: '#b829dd',
            selection: 'rgba(137, 180, 250, 0.3)',
            black: '#161221',
            red: '#ff3860',
            green: '#39ff14',
            yellow: '#ffd700',
            blue: '#89b4fa',
            magenta: '#b829dd',
            cyan: '#74c7ec',
            white: '#cdd6f4',
            brightBlack: '#2d2440',
            brightRed: '#ff6b8a',
            brightGreen: '#5aff3a',
            brightYellow: '#ffe44d',
            brightBlue: '#a6c9ff',
            brightMagenta: '#d14dff',
            brightCyan: '#89dceb',
            brightWhite: '#ffffff'
        },
        fontSize: 13,
        fontFamily: 'SF Mono, Monaco, Consolas, monospace',
        scrollback: 10000,
        lineHeight: 1.3,
        letterSpacing: 0.5
    });

    term.open(document.getElementById('terminal'));
    
    // Mensagem inicial
    term.writeln('\r\nBitDogLab - Terminal Serial');
    term.writeln('----------------------------');
    term.writeln('Clique em "Conectar" para começar.\r\n');

    // Callbacks do WebSerial
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

    // Eventos do terminal
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
    
    // Inicializa FlashManager com a instância do WebSerial
    const flashManager = new FlashManager(serial);
    window.flashManager = flashManager;

    // Configura callbacks de progresso e status
    flashManager.onProgress((percent) => {
        // O Claude pode implementar uma barra de progresso na UI
        if (window.onFlashProgress) {
            window.onFlashProgress(percent);
        }
    });

    flashManager.onStatus((message) => {
        // Mostra status no terminal também
        term.writeln(`\r\n\x1b[36m[Flash] ${message}\x1b[0m`);
        
        // O Claude pode implementar notificação na UI
        if (window.onFlashStatus) {
            window.onFlashStatus(message);
        }
    });

    // Expose serial instance globally for flash.js
    window.webSerial = serial;
});
