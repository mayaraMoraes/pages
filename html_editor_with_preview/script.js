// Variáveis globais
let editor;
let autoUpdateEnabled = true;
let updateTimeout;

// Inicialização quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    initializeEditor();
    initializeEventListeners();
    loadSampleHTML();
    setupIconFallbacks();
});

// Inicializar o editor CodeMirror
function initializeEditor() {
    const textarea = document.getElementById('htmlEditor');
    
    editor = CodeMirror.fromTextArea(textarea, {
        mode: 'xml',
        theme: 'monokai',
        lineNumbers: true,
        autoCloseTags: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        extraKeys: {
            'Ctrl-Space': 'autocomplete',
            'F11': function(cm) {
                cm.setOption('fullScreen', !cm.getOption('fullScreen'));
            },
            'Esc': function(cm) {
                if (cm.getOption('fullScreen')) cm.setOption('fullScreen', false);
            }
        }
    });

    // Auto-atualização do preview
    editor.on('change', function() {
        if (autoUpdateEnabled) {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(updatePreview, 500);
        }
    });
    
    // Listener para erros no iframe
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'iframe-error') {
            console.error('Erro no preview:', event.data.error);
            showNotification('Erro no HTML: ' + event.data.error, 'error');
        }
    });

    // Ajustar altura do editor
    editor.setSize(null, '100%');
}

// Inicializar event listeners
function initializeEventListeners() {
    // Botão executar
    document.getElementById('runBtn').addEventListener('click', updatePreview);
    
    // Botão limpar
    document.getElementById('clearBtn').addEventListener('click', clearEditor);
    
    // Botão tela completa
    document.getElementById('fullscreenBtn').addEventListener('click', openFullscreen);
    
    // Botão download
    document.getElementById('downloadBtn').addEventListener('click', downloadHTML);
    
    // Botão formatar
    document.getElementById('formatBtn').addEventListener('click', formatCode);
    
    // Botão atualizar preview
document.getElementById('refreshBtn').addEventListener('click', function() {
    forceRefreshPreview();
});
    
    // Botão debug
    document.getElementById('debugBtn').addEventListener('click', debugPreview);
    
    // Botão nova aba
    document.getElementById('openNewTabBtn').addEventListener('click', openInNewTab);
    
    // Fechar modal tela completa
    document.getElementById('closeFullscreenBtn').addEventListener('click', closeFullscreen);
    
    // Fechar modal clicando fora
    document.getElementById('fullscreenModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeFullscreen();
        }
    });
    
    // Atalhos de teclado
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter para executar
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            updatePreview();
        }
        
        // F11 para tela completa
        if (e.key === 'F11') {
            e.preventDefault();
            openFullscreen();
        }
        
        // Esc para fechar tela completa
        if (e.key === 'Escape') {
            closeFullscreen();
        }
        
        // Ctrl+S para download
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            downloadHTML();
        }
    });
}

// Carregar HTML de exemplo
function loadSampleHTML() {
    const sampleHTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Minha Página</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
        }
        h1 {
            color: #333;
            margin-bottom: 1rem;
        }
        p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 1.5rem;
        }
        .btn {
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        .btn:hover {
            background: #5a67d8;
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 Bem-vindo ao Editor HTML!</h1>
        <p>Este é um exemplo de como usar o editor. Você pode editar este código e ver as mudanças em tempo real!</p>
        <button class="btn" onclick="alert('Olá! Você clicou no botão!')">
            Clique aqui!
        </button>
        <hr style="margin: 2rem 0;">
        <p><strong>Dicas:</strong></p>
        <ul style="text-align: left; color: #666;">
            <li>Use Ctrl+Enter para executar o código</li>
            <li>Clique em "Tela Completa" para ver em tela cheia</li>
            <li>Use F11 como atalho para tela completa</li>
            <li>Ctrl+S para fazer download do HTML</li>
        </ul>
    </div>
</body>
</html>`;

    editor.setValue(sampleHTML);
    updatePreview();
}

// Atualizar preview
function updatePreview() {
    const htmlCode = editor.getValue().trim();
    const previewFrame = document.getElementById('preview');
    const previewContainer = previewFrame.parentElement;
    
    if (!htmlCode) {
        previewFrame.src = 'about:blank';
        previewContainer.classList.remove('loading');
        showNotification('Editor vazio', 'info');
        return;
    }
    
    try {
        // Mostrar loading para HTML grande
        if (htmlCode.length > 30000) {
            previewContainer.classList.add('loading');
        }
        
        // Para HTML muito grande, usar blob URL é mais confiável
        if (htmlCode.length > 50000) {
            const blob = new Blob([htmlCode], { type: 'text/html; charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            previewFrame.onload = function() {
                previewContainer.classList.remove('loading');
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                showNotification('Preview atualizado! (HTML grande)', 'success');
            };
            
            previewFrame.onerror = function() {
                previewContainer.classList.remove('loading');
                showNotification('Erro ao carregar preview', 'error');
            };
            
            previewFrame.src = url;
        } else {
            // Para HTML menor, usar srcdoc
            previewFrame.srcdoc = htmlCode;
            setTimeout(() => {
                previewContainer.classList.remove('loading');
                showNotification('Preview atualizado!', 'success');
            }, 100);
        }
        
    } catch (error) {
        previewContainer.classList.remove('loading');
        console.error('Erro ao atualizar preview:', error);
        showNotification('Erro ao atualizar preview: ' + error.message, 'error');
    }
}

// Limpar editor
function clearEditor() {
    if (confirm('Tem certeza que deseja limpar todo o código?')) {
        editor.setValue('');
        document.getElementById('preview').src = 'about:blank';
        showNotification('Editor limpo!', 'info');
    }
}

// Abrir tela completa
function openFullscreen() {
    const htmlCode = editor.getValue();
    const fullscreenFrame = document.getElementById('fullscreenPreview');
    const modal = document.getElementById('fullscreenModal');
    
    try {
        // Método mais confiável: usar srcdoc
        fullscreenFrame.srcdoc = htmlCode;
        
        // Fallback para blob URL se srcdoc não funcionar
        if (!fullscreenFrame.srcdoc) {
            const blob = new Blob([htmlCode], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            fullscreenFrame.src = url;
            
            // Limpar URL anterior
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 2000);
        }
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Erro ao abrir tela completa:', error);
        showNotification('Erro ao abrir tela completa', 'error');
    }
}

// Fechar tela completa
function closeFullscreen() {
    const modal = document.getElementById('fullscreenModal');
    modal.classList.remove('active');
    document.getElementById('fullscreenPreview').src = 'about:blank';
}

// Download do HTML
function downloadHTML() {
    const htmlCode = editor.getValue();
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minha-pagina.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    showNotification('HTML baixado com sucesso!', 'success');
}

// Formatar código
function formatCode() {
    try {
        const htmlCode = editor.getValue();
        const formatted = html_beautify(htmlCode, {
            indent_size: 2,
            indent_char: ' ',
            max_preserve_newlines: 2,
            preserve_newlines: true,
            keep_array_indentation: false,
            break_chained_methods: false,
            indent_scripts: 'normal',
            brace_style: 'collapse',
            space_before_conditional: true,
            unescape_strings: false,
            jslint_happy: false,
            end_with_newline: true,
            wrap_line_length: 0,
            indent_inner_html: true,
            comma_first: false,
            e4x: false,
            indent_empty_lines: false
        });
        
        editor.setValue(formatted);
        showNotification('Código formatado!', 'success');
    } catch (error) {
        showNotification('Erro ao formatar código!', 'error');
        console.error('Erro na formatação:', error);
    }
}

// Abrir em nova aba
function openInNewTab() {
    const htmlCode = editor.getValue();
    const newTab = window.open();
    newTab.document.write(htmlCode);
    newTab.document.close();
    showNotification('Página aberta em nova aba!', 'info');
}

// Refresh forçado do preview
function forceRefreshPreview() {
    const previewFrame = document.getElementById('preview');
    const container = previewFrame.parentElement;
    
    // Criar novo iframe com atributos corretos
    const newFrame = document.createElement('iframe');
    newFrame.id = 'preview';
    newFrame.sandbox = 'allow-scripts allow-same-origin allow-forms allow-modals allow-popups';
    newFrame.style.cssText = 'width: 100%; min-height: 100%; border: none; background: white; display: block; box-sizing: border-box;';
    
    // Remover o antigo e adicionar o novo
    container.removeChild(previewFrame);
    container.appendChild(newFrame);
    
    // Aguardar e carregar conteúdo
    setTimeout(() => {
        updatePreview();
        showNotification('Preview recarregado completamente!', 'success');
    }, 200);
}

// Debug do preview
function debugPreview() {
    const previewFrame = document.getElementById('preview');
    const htmlCode = editor.getValue();
    
    console.log('=== DEBUG PREVIEW ===');
    console.log('HTML Code length:', htmlCode.length);
    console.log('Preview frame src:', previewFrame.src);
    console.log('Preview frame srcdoc length:', previewFrame.srcdoc ? previewFrame.srcdoc.length : 'null');
    console.log('Preview frame dimensions:', {
        width: previewFrame.offsetWidth,
        height: previewFrame.offsetHeight,
        clientWidth: previewFrame.clientWidth,
        clientHeight: previewFrame.clientHeight
    });
    console.log('Preview container dimensions:', {
        width: previewFrame.parentElement.offsetWidth,
        height: previewFrame.parentElement.offsetHeight
    });
    
    // Forçar refresh
    updatePreview();
    
    showNotification('Debug info no console! Verifique F12', 'info');
}

// Configurar fallbacks para ícones
function setupIconFallbacks() {
    const iconMappings = {
        'icons/play.png': '▶️',
        'icons/trash.png': '🗑️',
        'icons/fullscreen.png': '🔍',
        'icons/download.png': '💾',
        'icons/code.png': '📝',
        'icons/format.png': '🎯',
        'icons/globe.png': '🌐',
        'icons/refresh.png': '🔄',
        'icons/debug.png': '🐛',
        'icons/external-link.png': '🔗',
        'icons/search.png': '🔍',
        'icons/logo.png': '🎨'
    };

    // Verificar cada imagem e adicionar fallback
    document.querySelectorAll('img[src^="icons/"]').forEach(img => {
        img.onerror = function() {
            const emoji = iconMappings[this.src.split('/').slice(-2).join('/')];
            if (emoji) {
                const span = document.createElement('span');
                span.textContent = emoji;
                span.className = this.className.replace('icon', 'emoji');
                this.parentNode.replaceChild(span, this);
            }
        };
        
        // Verificar se a imagem existe
        const testImg = new Image();
        testImg.onload = function() {
            // Imagem carregou com sucesso
        };
        testImg.onerror = function() {
            img.onerror();
        };
        testImg.src = img.src;
    });
}

// Sistema de notificações
function showNotification(message, type = 'info') {
    // Remover notificação anterior se existir
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Estilos da notificação
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '600',
        fontSize: '14px',
        zIndex: '9999',
        opacity: '0',
        transform: 'translateX(100%)',
        transition: 'all 0.3s ease',
        maxWidth: '300px',
        wordWrap: 'break-word'
    });
    
    // Cores baseadas no tipo
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Animação de entrada
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Função para alternar auto-atualização
function toggleAutoUpdate() {
    autoUpdateEnabled = !autoUpdateEnabled;
    showNotification(
        autoUpdateEnabled ? 'Auto-atualização ativada!' : 'Auto-atualização desativada!',
        'info'
    );
}

// Função utilitária para verificar se o código HTML é válido
function isValidHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const errors = doc.querySelectorAll('parsererror');
    return errors.length === 0;
}

// Salvar no localStorage
function saveToLocalStorage() {
    const htmlCode = editor.getValue();
    localStorage.setItem('htmlEditor_code', htmlCode);
    showNotification('Código salvo localmente!', 'success');
}

// Carregar do localStorage
function loadFromLocalStorage() {
    const savedCode = localStorage.getItem('htmlEditor_code');
    if (savedCode) {
        editor.setValue(savedCode);
        updatePreview();
        showNotification('Código carregado!', 'info');
    }
}

// Auto-salvar a cada 30 segundos
setInterval(() => {
    const htmlCode = editor.getValue();
    if (htmlCode.trim()) {
        localStorage.setItem('htmlEditor_autosave', htmlCode);
    }
}, 30000);

// Carregar auto-salvo na inicialização
window.addEventListener('load', () => {
    const autoSaved = localStorage.getItem('htmlEditor_autosave');
    if (autoSaved && !editor.getValue().trim()) {
        if (confirm('Detectamos um auto-salvamento. Deseja carregá-lo?')) {
            editor.setValue(autoSaved);
            updatePreview();
        }
    }
});

// Avisar antes de sair se houver código não salvo
window.addEventListener('beforeunload', (e) => {
    const htmlCode = editor.getValue();
    if (htmlCode.trim()) {
        e.preventDefault();
        e.returnValue = '';
    }
}); 