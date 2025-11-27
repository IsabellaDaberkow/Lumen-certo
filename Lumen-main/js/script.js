// Mapeamento simplificado Braille Grau 1 (sem o sinal de capitalização ou numérico)
const brailleMap = {
    'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑', 'f': '⠋', 'g': '⠛', 'h': '⠓', 'i': '⠊', 'j': '⠚',
    'k': '⠅', 'l': '⠇', 'm': '⠍', 'n': '⠝', 'o': '⠕', 'p': '⠏', 'q': '⠟', 'r': '⠗', 's': '⠎', 't': '⠞',
    'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭', 'y': '⠽', 'z': '⠵',
    
    // Números (usando os 10 primeiros caracteres do alfabeto - precisa do sinal numérico '⠼' na frente para ser correto)
    '1': '⠁', '2': '⠃', '3': '⠉', '4': '⠙', '5': '⠑', '6': '⠋', '7': '⠛', '8': '⠓', '9': '⠊', '0': '⠚',
    
    // Pontuação e Espaço
    ' ': '⠀', // Padrão Braille vazio
    '.': '⠲', ',': '⠂', '?': '⠦', '!': '⠖',
    
    // Caracteres acentuados em português (mapeando para a letra base)
    'á': '⠁', 'à': '⠁', 'ã': '⠁', 'â': '⠁',
    'é': '⠑', 'è': '⠑', 'ê': '⠑',
    'í': '⠊', 'ì': '⠊', 'î': '⠊',
    'ó': '⠕', 'ò': '⠕', 'õ': '⠕', 'ô': '⠕',
    'ú': '⠥', 'ù': '⠥', 'û': '⠥',
    'ç': '⠉', 
};

const numSign = '⠼'; // Sinal Numérico Braille

// Variável global para a conexão WebSocket
let ws = null;

/**
 * Converte uma string de texto para Braille Grau 1.
 * @param {string} text O texto de entrada.
 * @returns {string} O texto traduzido em Braille.
 */
function translateToBraille(text) {
    const lowerText = text.toLowerCase();
    let brailleText = '';
    let isNumberMode = false;

    for (let i = 0; i < lowerText.length; i++) {
        const char = lowerText[i];
        const brailleChar = brailleMap[char];
        const isDigit = char >= '0' && char <= '9';
        
        if (isDigit && !isNumberMode) {
            // Se encontrar um dígito e não estiver no modo numérico, adiciona o sinal numérico
            brailleText += numSign;
            isNumberMode = true;
        } else if (!isDigit && isNumberMode && brailleChar !== '⠀') {
            // Se encontrar uma letra/símbolo e estiver no modo numérico, sai do modo numérico
            // (Para o braille de fato, o sinal numérico só afeta os caracteres seguintes até um espaço)
            isNumberMode = false;
        }
        
        if (brailleChar) {
            brailleText += brailleChar;
        } else {
            // Para caracteres não mapeados (mantém o espaço em branco Braille)
            brailleText += '⠀';
        }
    }

    return brailleText;
}

/**
 * Atualiza o campo de saída em tempo real com a tradução e o estado dos botões.
 */
function updateOutput() {
    const inputTextarea = document.getElementById('user-input');
    const outputElement = document.getElementById('output-text');
    const copyButton = document.getElementById('copy-button');
    const sendButton = document.getElementById('send-button');
    
    if (!inputTextarea || !outputElement || !copyButton || !sendButton) return;
    
    const inputText = inputTextarea.value;
    const brailleResult = translateToBraille(inputText);
    
    outputElement.textContent = brailleResult || 'Aguardando entrada...';

    // Ativa/Desativa os botões de envio/cópia
    if (inputText.trim().length > 0) {
        copyButton.removeAttribute('disabled');
        sendButton.removeAttribute('disabled');
    } else {
        copyButton.setAttribute('disabled', 'true');
        sendButton.setAttribute('disabled', 'true');
    }
}

/**
 * Função para copiar o texto Braille para a área de transferência.
 */
function copyBrailleText() {
    const outputElement = document.getElementById('output-text');
    const textToCopy = outputElement.textContent;

    const tempInput = document.createElement('textarea');
    tempInput.value = textToCopy;
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
        document.execCommand('copy'); 
        
        const button = document.getElementById('copy-button');
        const originalText = button.textContent;
        button.textContent = 'Copiado!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 1500);
    } catch (err) {
        console.error('Falha ao copiar:', err);
    } finally {
        document.body.removeChild(tempInput);
    }
}

/**
 * Tenta conectar ao WebSocket do ESP32 e envia a mensagem Braille.
 * Se já estiver conectado, apenas envia.
 */
function connectAndSendBraille() {
    const ipInput = document.getElementById('esp32-ip');
    const statusElement = document.getElementById('connection-status');
    const inputTextarea = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    if (!ipInput || !statusElement || !inputTextarea || !sendButton) return;
    
    const brailleMessage = translateToBraille(inputTextarea.value);

    // 1. Se já estiver aberto, apenas envia a mensagem
    if (ws && ws.readyState === WebSocket.OPEN) {
        sendMessage(brailleMessage);
        return;
    }

    // 2. Tenta conectar
    const ipAddress = ipInput.value.trim();
    const serverUrl = `ws://${ipAddress}:81/ws`; // Porta 81 é a padrão definida no código ESP32

    statusElement.textContent = 'Conectando...';
    statusElement.className = 'font-medium text-center p-2 rounded-lg bg-yellow-100 text-yellow-700';
    sendButton.textContent = 'Conectando...';
    sendButton.setAttribute('disabled', 'true');

    try {
        ws = new WebSocket(serverUrl);

        ws.onopen = () => {
            statusElement.textContent = 'Conectado! ✅';
            statusElement.className = 'font-medium text-center p-2 rounded-lg bg-green-100 text-green-700';
            sendButton.textContent = 'Enviar Braille';
            sendButton.removeAttribute('disabled');
            sendMessage(brailleMessage);
        };

        ws.onmessage = (event) => {
            console.log('Mensagem do ESP32:', event.data);
            // Exibir feedback do ESP32 na tela, se necessário
        };

        ws.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
            statusElement.textContent = 'Erro na Conexão ❌';
            statusElement.className = 'font-medium text-center p-2 rounded-lg bg-red-100 text-red-700';
            sendButton.textContent = 'Conectar e Enviar Braille';
            sendButton.removeAttribute('disabled');
        };

        ws.onclose = () => {
            statusElement.textContent = 'Desconectado';
            statusElement.className = 'font-medium text-center p-2 rounded-lg bg-red-100 text-red-700';
            sendButton.textContent = 'Conectar e Enviar Braille';
            sendButton.removeAttribute('disabled');
        };

    } catch (error) {
        console.error('Erro ao tentar criar WebSocket:', error);
        statusElement.textContent = 'URL Inválida ⛔';
        statusElement.className = 'font-medium text-center p-2 rounded-lg bg-red-100 text-red-700';
        sendButton.textContent = 'Conectar e Enviar Braille';
        sendButton.removeAttribute('disabled');
    }
}

/**
 * Envia a mensagem Braille se a conexão estiver aberta.
 */
function sendMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(message); 
        console.log('Dados Braille enviados para ESP32:', message);
    } else {
        // Tenta conectar se não estiver aberto
        connectAndSendBraille(); 
    }
}


// Configuração dos Listeners de Evento
document.addEventListener('DOMContentLoaded', () => {
    const inputTextarea = document.getElementById('user-input');
    const copyButton = document.getElementById('copy-button');
    const sendButton = document.getElementById('send-button');

    // 1. Liga o evento 'input' do textarea à função de atualização
    if(inputTextarea) inputTextarea.addEventListener('input', updateOutput);
    
    // 2. Liga o botão de cópia à função
    if(copyButton) copyButton.addEventListener('click', copyBrailleText);

    // 3. Liga o botão de envio à função WebSocket
    if(sendButton) sendButton.addEventListener('click', connectAndSendBraille);

    // Chamada inicial para garantir que o estado inicial esteja correto
    updateOutput(); 

    // Inicializa ícones Lucide (se estiver na página com ícones)
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});