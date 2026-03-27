/**
 * Projects - Upload e gerenciamento de projetos
 * Comunidade BitDogLab
 *
 * Arquivos .py → conteúdo salvo como texto no Firestore
 * PDFs/extras → links do Google Drive
 */

// Limites de tamanho
const LIMITS = {
    MAIN_FILE_MAX_KB: 100,        // Main.py max 100KB
    LIB_FILE_MAX_KB: 100,         // Cada biblioteca max 100KB
    MAX_LIBRARIES: 10,            // Máximo 10 bibliotecas
    TITLE_MAX_CHARS: 100,         // Título max 100 caracteres
    DESCRIPTION_MAX_CHARS: 2000,  // Descrição max 2000 caracteres
    MAX_PDF_LINKS: 5,             // Máximo 5 links de PDF
    MAX_EXTRA_LINKS: 5            // Máximo 5 links extras
};

// Estado das tags BNCC por modal
const bnccTagState = {
    project: [],  // tags do modal de novo projeto
    edit: []      // tags do modal de edição
};

// Abre modal de novo projeto
function openProjectModal() {
    const user = auth.currentUser;
    if (!user) {
        alert('Faça login para publicar um projeto.');
        return;
    }
    document.getElementById('projectModal').classList.add('active');
    initBnccTagInput('project');
}

// Fecha modal de novo projeto
function closeProjectModal() {
    document.getElementById('projectModal').classList.remove('active');
    clearProjectForm();
}

// Limpa formulário
function clearProjectForm() {
    document.getElementById('projectTitle').value = '';
    document.getElementById('projectDescription').value = '';
    document.getElementById('projectVideo').value = '';
    document.getElementById('projectMainFile').value = '';
    document.getElementById('projectLibraries').value = '';
    document.getElementById('projectPdfLinks').value = '';
    document.getElementById('projectExtraLinks').value = '';
    document.getElementById('projectImage').value = '';
    document.getElementById('uploadProgress').style.display = 'none';
    bnccTagState.project = [];
    renderBnccTags('project');
}

// Lê arquivo .py como texto
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`Erro ao ler ${file.name}`));
        reader.readAsText(file);
    });
}

// Valida tamanho do arquivo em KB
function validateFileSize(file, maxKB) {
    const sizeKB = file.size / 1024;
    if (sizeKB > maxKB) {
        throw new Error(`${file.name} tem ${Math.round(sizeKB)}KB. Máximo permitido: ${maxKB}KB.`);
    }
}

// Valida se é link do Google Drive
function isValidLink(url) {
    return url.includes('drive.google') || url.includes('youtube') || url.includes('youtu.be') || url.includes('docs.google');
}

// Parseia links (um por linha)
function parseLinks(text) {
    return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

// Publica projeto
async function publishProject() {
    const user = auth.currentUser;
    if (!user) return;

    // Coleta dados do formulário
    const title = document.getElementById('projectTitle').value.trim();
    const description = document.getElementById('projectDescription').value.trim();
    const videoURL = document.getElementById('projectVideo').value.trim();
    const mainFileInput = document.getElementById('projectMainFile');
    const librariesInput = document.getElementById('projectLibraries');
    const pdfLinksText = document.getElementById('projectPdfLinks').value.trim();
    const extraLinksText = document.getElementById('projectExtraLinks').value.trim();
    const imageURL = document.getElementById('projectImage').value.trim();

    // Validações obrigatórias
    if (!title) return alert('Preencha o nome do projeto.');
    if (title.length > LIMITS.TITLE_MAX_CHARS) return alert(`Título muito longo. Máximo: ${LIMITS.TITLE_MAX_CHARS} caracteres.`);
    if (!description) return alert('Preencha a descrição.');
    if (description.length > LIMITS.DESCRIPTION_MAX_CHARS) return alert(`Descrição muito longa. Máximo: ${LIMITS.DESCRIPTION_MAX_CHARS} caracteres.`);
    if (!videoURL) return alert('Coloque o link do vídeo.');
    if (!mainFileInput.files[0]) return alert('Envie o arquivo Main.py.');
    if (!pdfLinksText) return alert('Coloque pelo menos um link de PDF.');
    if (bnccTagState.project.length === 0) return alert('Adicione pelo menos um código BNCC ao projeto.');

    // Validação do vídeo
    if (!videoURL.includes('youtube') && !videoURL.includes('youtu.be') && !videoURL.includes('drive.google')) {
        return alert('O link do vídeo deve ser do YouTube ou Google Drive.');
    }

    // Validação do Main.py
    const mainFile = mainFileInput.files[0];
    if (!mainFile.name.endsWith('.py')) return alert('O arquivo principal deve ser .py');
    try {
        validateFileSize(mainFile, LIMITS.MAIN_FILE_MAX_KB);
    } catch (e) {
        return alert(e.message);
    }

    // Validação das bibliotecas
    const libFiles = Array.from(librariesInput.files || []);
    if (libFiles.length > LIMITS.MAX_LIBRARIES) {
        return alert(`Máximo de ${LIMITS.MAX_LIBRARIES} bibliotecas.`);
    }
    for (const file of libFiles) {
        if (!file.name.endsWith('.py')) return alert(`${file.name} não é um arquivo .py`);
        try {
            validateFileSize(file, LIMITS.LIB_FILE_MAX_KB);
        } catch (e) {
            return alert(e.message);
        }
    }

    // Validação dos links de PDF
    const pdfLinks = parseLinks(pdfLinksText);
    if (pdfLinks.length > LIMITS.MAX_PDF_LINKS) {
        return alert(`Máximo de ${LIMITS.MAX_PDF_LINKS} links de PDF.`);
    }
    for (const link of pdfLinks) {
        if (!isValidLink(link)) {
            return alert(`Link inválido: ${link}\nUse links do Google Drive.`);
        }
    }

    // Validação dos links extras
    const extraLinks = parseLinks(extraLinksText);
    if (extraLinks.length > LIMITS.MAX_EXTRA_LINKS) {
        return alert(`Máximo de ${LIMITS.MAX_EXTRA_LINKS} links extras.`);
    }

    const publishBtn = document.getElementById('publishBtn');
    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    publishBtn.disabled = true;
    progressBar.style.display = 'block';

    try {
        // Lê Main.py
        progressFill.style.width = '20%';
        progressText.textContent = 'Lendo Main.py...';
        const mainContent = await readFileAsText(mainFile);

        // Lê bibliotecas
        const libraries = [];
        for (let i = 0; i < libFiles.length; i++) {
            progressFill.style.width = `${20 + (i / libFiles.length) * 40}%`;
            progressText.textContent = `Lendo ${libFiles[i].name}...`;
            const content = await readFileAsText(libFiles[i]);
            libraries.push({ name: libFiles[i].name, content: content });
        }

        // Busca dados do perfil do autor
        progressFill.style.width = '70%';
        progressText.textContent = 'Salvando projeto...';
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        // Salva projeto no Firestore
        const projectId = db.collection('projects').doc().id;
        await db.collection('projects').doc(projectId).set({
            title: title,
            description: description,
            videoURL: videoURL,
            imageURL: imageURL,
            authorId: user.uid,
            authorName: userData.name || user.displayName,
            authorPhoto: userData.photoURL || user.photoURL || '',
            mainFile: { name: mainFile.name, content: mainContent },
            libraries: libraries,
            pdfLinks: pdfLinks,
            extraLinks: extraLinks,
            bnccCodes: bnccTagState.project.slice(),
            commentCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Incrementa contador de projetos do autor
        progressFill.style.width = '90%';
        progressText.textContent = 'Atualizando perfil...';
        await db.collection('users').doc(user.uid).update({
            projectCount: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        progressFill.style.width = '100%';
        progressText.textContent = 'Projeto publicado!';

        setTimeout(() => {
            closeProjectModal();
            loadProjects();
        }, 1000);

    } catch (error) {
        console.error('Erro ao publicar:', error);
        alert('Erro ao publicar projeto. Tente novamente.');
    } finally {
        publishBtn.disabled = false;
    }
}

// ============================================
// BNCC Tag Input Component
// ============================================

// Controle de inicialização
const _bnccInitialized = {};
let _bnccSelectedIndex = -1;
let _bnccActivePrefix = null;

/**
 * Inicializa o input de tags BNCC para um modal
 * @param {string} prefix - 'project' ou 'edit'
 */
function initBnccTagInput(prefix) {
    if (_bnccInitialized[prefix]) {
        renderBnccTags(prefix);
        return;
    }
    _bnccInitialized[prefix] = true;

    const input = document.getElementById(prefix + 'BnccInput');
    const suggestions = document.getElementById(prefix + 'BnccSuggestions');
    const container = document.getElementById(prefix + 'BnccContainer');

    input.addEventListener('input', function() {
        _bnccActivePrefix = prefix;
        _bnccSelectedIndex = -1;
        const query = this.value.trim();
        if (query.length < 2) {
            suggestions.classList.remove('active');
            suggestions.innerHTML = '';
            return;
        }
        showBnccSuggestions(prefix, query);
    });

    input.addEventListener('keydown', function(e) {
        _bnccActivePrefix = prefix;
        const items = suggestions.querySelectorAll('.bncc-suggestion-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            _bnccSelectedIndex = Math.min(_bnccSelectedIndex + 1, items.length - 1);
            updateSuggestionSelection(items, _bnccSelectedIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            _bnccSelectedIndex = Math.max(_bnccSelectedIndex - 1, 0);
            updateSuggestionSelection(items, _bnccSelectedIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (_bnccSelectedIndex >= 0 && items[_bnccSelectedIndex]) {
                addBnccTag(prefix, items[_bnccSelectedIndex].dataset.code);
            } else if (this.value.trim()) {
                tryAddBnccCode(prefix, this.value.trim());
            }
            _bnccSelectedIndex = -1;
        } else if (e.key === 'Backspace' && !this.value) {
            if (bnccTagState[prefix].length > 0) {
                bnccTagState[prefix].pop();
                renderBnccTags(prefix);
            }
        }
    });

    // Delegação de evento para cliques nas sugestões
    suggestions.addEventListener('mousedown', function(e) {
        // mousedown em vez de click para disparar antes do blur
        const item = e.target.closest('.bncc-suggestion-item');
        if (item) {
            e.preventDefault();
            addBnccTag(prefix, item.dataset.code);
        }
    });

    container.addEventListener('click', function() {
        input.focus();
    });
}

// Fecha sugestões ao clicar fora (uma vez só)
document.addEventListener('click', function(e) {
    ['project', 'edit'].forEach(function(prefix) {
        const wrapper = document.getElementById(prefix + 'BnccWrapper');
        const suggestions = document.getElementById(prefix + 'BnccSuggestions');
        if (wrapper && suggestions && !wrapper.contains(e.target)) {
            suggestions.classList.remove('active');
        }
    });
});

function showBnccSuggestions(prefix, query) {
    const suggestions = document.getElementById(prefix + 'BnccSuggestions');
    const results = searchBnccCodes(query).filter(function(r) {
        return !bnccTagState[prefix].includes(r.code);
    });

    if (results.length === 0) {
        var looksLikeCode = /^[A-Za-z]{2}\d{2}CO\d{2}$/i.test(query);
        if (looksLikeCode) {
            suggestions.innerHTML = '<div class="bncc-error-msg">Código "' + query.toUpperCase() + '" não encontrado na BNCC de Computação.</div>';
        } else {
            suggestions.innerHTML = '<div class="bncc-error-msg">Nenhum resultado para "' + query + '".</div>';
        }
        suggestions.classList.add('active');
        return;
    }

    var html = '';
    var shown = results.slice(0, 8);
    for (var i = 0; i < shown.length; i++) {
        html += '<div class="bncc-suggestion-item" data-code="' + shown[i].code + '">'
            + '<span class="suggestion-code">' + shown[i].code + '</span>'
            + '<span class="suggestion-desc">' + shown[i].description + '</span>'
            + '<span class="suggestion-level">' + shown[i].level + '</span>'
            + '</div>';
    }
    suggestions.innerHTML = html;
    suggestions.classList.add('active');
}

function updateSuggestionSelection(items, index) {
    for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('selected', i === index);
    }
    if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
    }
}

function tryAddBnccCode(prefix, value) {
    if (!value) return;
    var code = value.toUpperCase();
    if (isValidBnccCode(code)) {
        addBnccTag(prefix, code);
    } else {
        alert('Código BNCC "' + code + '" não existe.\nDigite um código válido ou busque por palavra-chave.');
    }
}

function addBnccTag(prefix, code) {
    code = code.toUpperCase();
    if (bnccTagState[prefix].includes(code)) return;
    bnccTagState[prefix].push(code);
    renderBnccTags(prefix);

    var input = document.getElementById(prefix + 'BnccInput');
    var suggestions = document.getElementById(prefix + 'BnccSuggestions');
    input.value = '';
    suggestions.classList.remove('active');
    suggestions.innerHTML = '';
    _bnccSelectedIndex = -1;
    input.focus();
}

function removeBnccTag(prefix, code) {
    bnccTagState[prefix] = bnccTagState[prefix].filter(function(c) { return c !== code; });
    renderBnccTags(prefix);
}

function renderBnccTags(prefix) {
    var container = document.getElementById(prefix + 'BnccContainer');
    var input = document.getElementById(prefix + 'BnccInput');

    // Remove tags existentes (mantém o input)
    var existing = container.querySelectorAll('.bncc-tag');
    for (var i = 0; i < existing.length; i++) {
        existing[i].remove();
    }

    // Adiciona tags antes do input
    for (var j = 0; j < bnccTagState[prefix].length; j++) {
        var code = bnccTagState[prefix][j];
        var tag = document.createElement('span');
        tag.className = 'bncc-tag';
        tag.setAttribute('data-bncc', code);
        tag.innerHTML = code + ' <span class="material-icons tag-remove" onclick="removeBnccTag(\'' + prefix + '\', \'' + code + '\')">close</span>';
        container.insertBefore(tag, input);
    }
}
