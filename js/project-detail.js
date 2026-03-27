/**
 * Project Detail - Página de detalhes do projeto
 * Comunidade BitDogLab
 */

// Converte link do Google Drive em thumbnail
function getDirectImageUrl(url) {
    if (!url) return '';
    
    // Google Drive - extrai file ID e converte para thumbnail
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
        // Usa o thumbnail do Google Drive (funciona melhor que uc?export=view)
        return `https://lh3.googleusercontent.com/d/${driveMatch[1]}=s800`;
    }
    
    // Dropbox - converte para link direto
    if (url.includes('dropbox.com')) {
        return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
    }
    
    // Imgur já é direto
    return url;
}

// Projeto atual carregado
let currentProject = null;
let currentProjectId = null;

// Abre página de detalhes
async function openProjectDetail(projectId) {
    try {
        const doc = await db.collection('projects').doc(projectId).get();
        if (!doc.exists) {
            alert('Projeto não encontrado.');
            return;
        }

        currentProjectId = projectId;
        currentProject = doc.data();
        renderProjectDetail(currentProject);

        // Mostra seção de detalhes, esconde todas as outras
        document.querySelectorAll('.main > section').forEach(s => s.classList.remove('active'));
        document.getElementById('projectDetailSection').classList.add('active');

        // Atualiza navegação
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        // Mostra controles serial (pra poder conectar e enviar pra placa)
        document.getElementById('serialControls').style.display = 'flex';

    } catch (error) {
        console.error('Erro ao carregar projeto:', error);
        alert('Erro ao carregar projeto.');
    }
}

// Volta pra home
function backToHome() {
    document.getElementById('projectDetailSection').classList.remove('active');
    document.getElementById('homeSection').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => {
        if (b.dataset.section === 'homeSection') b.classList.add('active');
    });
    currentProject = null;
    currentProjectId = null;
}

// Renderiza página de detalhes
function renderProjectDetail(project) {
    const container = document.getElementById('projectDetailContent');

    const videoEmbed = getVideoEmbed(project.videoURL);
    const date = project.createdAt ? project.createdAt.toDate().toLocaleDateString('pt-BR') : '';

    container.innerHTML = `
        <!-- Header do projeto -->
        <div class="detail-header">
            <button class="btn btn-back" onclick="backToHome()">
                <span class="material-icons">arrow_back</span> Voltar
            </button>
            ${isProjectOwner(project) ? `
            <div class="owner-actions">
                <button class="btn btn-edit" onclick="openEditProjectModal()">
                    <span class="material-icons">edit</span> Editar
                </button>
                <button class="btn btn-delete" onclick="deleteCurrentProject()">
                    <span class="material-icons">delete</span> Excluir
                </button>
            </div>
            ` : ''}
        </div>

        <div class="detail-body">
            <!-- Imagem de capa -->
            ${project.imageURL ? `<img src="${getDirectImageUrl(project.imageURL)}" class="detail-image" alt="${escapeHtml(project.title)}" onerror="this.style.display='none'">` : ''}
            
            <!-- Info principal -->
            <h1 class="detail-title">${escapeHtml(project.title)}</h1>
            <div class="detail-author">
                <img src="${project.authorPhoto || ''}" alt="" class="detail-author-avatar" onerror="this.style.display='none'">
                <div>
                    <span class="detail-author-name">${escapeHtml(project.authorName)}</span>
                    <span class="detail-date">Publicado em ${date}</span>
                </div>
            </div>

            <!-- Tags BNCC -->
            ${(project.bnccCodes && project.bnccCodes.length > 0) ? `
            <div class="detail-section">
                <h2 class="detail-section-title">
                    <span class="material-icons">school</span> Habilidades BNCC
                </h2>
                <div class="detail-bncc-tags">
                    ${project.bnccCodes.map(code =>
                        `<span class="bncc-tag" data-bncc="${escapeHtml(code)}">${escapeHtml(code)}</span>`
                    ).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Descrição -->
            <div class="detail-section">
                <h2 class="detail-section-title">
                    <span class="material-icons">description</span> Descrição
                </h2>
                <p class="detail-description">${escapeHtml(project.description).replace(/\n/g, '<br>')}</p>
            </div>

            <!-- Vídeo -->
            <div class="detail-section">
                <h2 class="detail-section-title">
                    <span class="material-icons">play_circle</span> Vídeo
                </h2>
                <div class="detail-video">
                    ${videoEmbed}
                </div>
            </div>

            <!-- Guias de Uso (PDFs) -->
            <div class="detail-section">
                <h2 class="detail-section-title">
                    <span class="material-icons">menu_book</span> Guias de Como Usar
                </h2>
                <div class="detail-guides">
                    ${renderPdfGuides(project.pdfLinks || [])}
                </div>
            </div>

            <!-- Links extras -->
            ${(project.extraLinks && project.extraLinks.length > 0) ? `
            <div class="detail-section">
                <h2 class="detail-section-title">
                    <span class="material-icons">link</span> Materiais Extras
                </h2>
                <div class="detail-extras">
                    ${renderExtraLinks(project.extraLinks)}
                </div>
            </div>
            ` : ''}

            <!-- Arquivos do Projeto -->
            <div class="detail-section">
                <h2 class="detail-section-title">
                    <span class="material-icons">folder</span> Arquivos do Projeto
                </h2>
                <div class="detail-files">
                    ${renderProjectFiles(project)}
                </div>
            </div>

            <!-- Enviar para a Placa -->
            <div class="detail-section detail-flash">
                <button class="btn btn-flash" onclick="flashCurrentProject()">
                    <span class="material-icons">bolt</span> Enviar para a Placa
                </button>
                <p class="flash-hint">Envia o código direto para a BitDogLab via WebSerial</p>
            </div>
        </div>
    `;
}

// Renderiza arquivos do projeto para download
function renderProjectFiles(project) {
    let html = '';

    // Main.py
    if (project.mainFile) {
        html += `
            <div class="file-item">
                <div class="file-info">
                    <span class="material-icons file-icon">code</span>
                    <div>
                        <span class="file-name">${escapeHtml(project.mainFile.name || 'main.py')}</span>
                        <span class="file-size">${formatSize(project.mainFile.content)}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-small btn-preview" onclick="previewCode('${escapeHtml(project.mainFile.name || 'main.py')}', 0)">
                        <span class="material-icons">visibility</span> Ver
                    </button>
                    <button class="btn btn-small btn-download" onclick="downloadPyFile('${escapeHtml(project.mainFile.name || 'main.py')}', 0)">
                        <span class="material-icons">download</span> Baixar
                    </button>
                </div>
            </div>
        `;
    }

    // Bibliotecas
    if (project.libraries && project.libraries.length > 0) {
        project.libraries.forEach((lib, index) => {
            html += `
                <div class="file-item">
                    <div class="file-info">
                        <span class="material-icons file-icon">library_books</span>
                        <div>
                            <span class="file-name">${escapeHtml(lib.name)}</span>
                            <span class="file-size">${formatSize(lib.content)}</span>
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="btn btn-small btn-preview" onclick="previewCode('${escapeHtml(lib.name)}', ${index + 1})">
                            <span class="material-icons">visibility</span> Ver
                        </button>
                        <button class="btn btn-small btn-download" onclick="downloadPyFile('${escapeHtml(lib.name)}', ${index + 1})">
                            <span class="material-icons">download</span> Baixar
                        </button>
                    </div>
                </div>
            `;
        });
    }

    return html || '<p class="empty-message">Nenhum arquivo disponível.</p>';
}

// Renderiza guias de PDF
function renderPdfGuides(pdfLinks) {
    if (!pdfLinks.length) return '<p class="empty-message">Nenhum guia disponível.</p>';

    let html = '';
    pdfLinks.forEach((link, index) => {
        const embedUrl = getDriveEmbedUrl(link);
        const downloadUrl = getDriveDownloadUrl(link);

        html += `
            <div class="guide-item">
                <div class="guide-header">
                    <span class="material-icons">picture_as_pdf</span>
                    <span class="guide-title">Documento ${index + 1}</span>
                    <div class="guide-actions">
                        <a href="${link}" target="_blank" class="btn btn-small btn-preview">
                            <span class="material-icons">open_in_new</span> Abrir no Drive
                        </a>
                        ${downloadUrl ? `
                        <a href="${downloadUrl}" target="_blank" class="btn btn-small btn-download">
                            <span class="material-icons">download</span> Baixar
                        </a>
                        ` : ''}
                    </div>
                </div>
                ${embedUrl ? `
                <div class="guide-preview">
                    <iframe src="${embedUrl}" class="pdf-viewer" allowfullscreen></iframe>
                </div>
                ` : ''}
            </div>
        `;
    });

    return html;
}

// Renderiza links extras
function renderExtraLinks(links) {
    let html = '';
    links.forEach((link, index) => {
        html += `
            <a href="${link}" target="_blank" class="extra-link">
                <span class="material-icons">open_in_new</span>
                Material extra ${index + 1}
            </a>
        `;
    });
    return html;
}

// Extrai embed URL do Google Drive
function getDriveEmbedUrl(url) {
    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return null;
}

// Extrai download URL do Google Drive
function getDriveDownloadUrl(url) {
    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return null;
}

// Extrai file ID do link do Google Drive
function extractDriveFileId(url) {
    // Formato: https://drive.google.com/file/d/FILE_ID/view
    let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    // Formato: https://drive.google.com/open?id=FILE_ID
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    // Formato: https://docs.google.com/document/d/FILE_ID
    match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    return null;
}

// Gera embed de vídeo
function getVideoEmbed(url) {
    // YouTube
    let videoId = null;
    if (url.includes('youtube.com/watch')) {
        const params = new URL(url).searchParams;
        videoId = params.get('v');
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }

    if (videoId) {
        return `<iframe src="https://www.youtube.com/embed/${videoId}" class="video-player" allowfullscreen></iframe>`;
    }

    // Google Drive video
    const driveId = extractDriveFileId(url);
    if (driveId) {
        return `<iframe src="https://drive.google.com/file/d/${driveId}/preview" class="video-player" allowfullscreen></iframe>`;
    }

    // Fallback: link direto
    return `<a href="${url}" target="_blank" class="btn btn-small">Abrir vídeo</a>`;
}

// Preview do código
function previewCode(filename, fileIndex) {
    if (!currentProject) return;

    let content = '';
    if (fileIndex === 0) {
        content = currentProject.mainFile.content;
    } else {
        content = currentProject.libraries[fileIndex - 1].content;
    }

    // Abre modal de preview
    const modal = document.getElementById('codePreviewModal');
    document.getElementById('codePreviewTitle').textContent = filename;
    document.getElementById('codePreviewContent').textContent = content;
    modal.classList.add('active');
}

// Fecha preview
function closeCodePreview() {
    document.getElementById('codePreviewModal').classList.remove('active');
}

// Download de arquivo .py
function downloadPyFile(filename, fileIndex) {
    if (!currentProject) return;

    let content = '';
    if (fileIndex === 0) {
        content = currentProject.mainFile.content;
    } else {
        content = currentProject.libraries[fileIndex - 1].content;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Enviar projeto atual para a placa
async function flashCurrentProject() {
    if (!currentProject) return;

    if (!window.flashManager || !window.webSerial?.connected) {
        alert('Conecte a placa primeiro. Clique em "Conectar" no topo da página.');
        return;
    }

    if (!confirm('Enviar código para a placa? Isso vai sobrescrever o código atual.')) return;

    const fm = window.flashManager;

    try {
        fm.updateStatus('Iniciando envio...');

        // Para execução atual
        await fm.serial.sendCtrlC();
        await fm.sleep(300);

        // Entra no Raw REPL
        fm.updateStatus('Entrando no Raw REPL...');
        await fm.enterRawREPL();
        await fm.sleep(500);

        // Envia Main.py
        fm.updateStatus('Enviando main.py...');
        await fm.writeFile('main.py', currentProject.mainFile.content);
        fm.updateStatus('main.py ✓');

        // Envia bibliotecas com nome correto
        if (currentProject.libraries && currentProject.libraries.length > 0) {
            await fm.mkdir('lib');
            for (const lib of currentProject.libraries) {
                const libPath = `lib/${lib.name}`;
                fm.updateStatus(`Enviando ${libPath}...`);
                await fm.writeFile(libPath, lib.content);
                fm.updateStatus(`${libPath} ✓`);
            }
        }

        // Sai do Raw REPL
        fm.updateStatus('Saindo do Raw REPL...');
        await fm.exitRawREPL();
        await fm.sleep(200);

        // Soft reset
        fm.updateStatus('Reiniciando placa...');
        await fm.serial.sendCtrlD();
        await fm.sleep(500);

        fm.updateStatus('Código enviado com sucesso!');
        alert('Código enviado com sucesso!');

    } catch (error) {
        // Tenta recuperar estado
        try {
            await fm.exitRawREPL();
            await fm.serial.sendCtrlC();
        } catch (e) {}
        alert(`Erro ao enviar: ${error.message}`);
    }
}

// Formata tamanho do conteúdo
function formatSize(content) {
    if (!content) return '';
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
}

// Verifica se o usuário logado é o dono do projeto
function isProjectOwner(project) {
    const user = auth.currentUser;
    return user && project.authorId === user.uid;
}

// Abre modal de edição preenchido com dados do projeto atual
function openEditProjectModal() {
    if (!currentProject || !isProjectOwner(currentProject)) return;

    document.getElementById('editProjectTitle').value = currentProject.title;
    document.getElementById('editProjectDescription').value = currentProject.description;
    document.getElementById('editProjectVideo').value = currentProject.videoURL;
    document.getElementById('editPdfLinks').value = (currentProject.pdfLinks || []).join('\n');
    document.getElementById('editExtraLinks').value = (currentProject.extraLinks || []).join('\n');

    // Carrega tags BNCC existentes
    bnccTagState.edit = (currentProject.bnccCodes || []).slice();
    initBnccTagInput('edit');
    renderBnccTags('edit');

    document.getElementById('editProjectModal').classList.add('active');
}

// Fecha modal de edição
function closeEditProjectModal() {
    document.getElementById('editProjectModal').classList.remove('active');
}

// Lê arquivo como texto (para edição de .py)
function readEditFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`Erro ao ler ${file.name}`));
        reader.readAsText(file);
    });
}

// Salva edição do projeto
async function saveProjectEdit() {
    if (!currentProject || !currentProjectId) return;

    const user = auth.currentUser;
    if (!user || user.uid !== currentProject.authorId) {
        alert('Você não tem permissão para editar este projeto.');
        return;
    }

    const title = document.getElementById('editProjectTitle').value.trim();
    const description = document.getElementById('editProjectDescription').value.trim();
    const videoURL = document.getElementById('editProjectVideo').value.trim();
    const pdfLinksText = document.getElementById('editPdfLinks').value.trim();
    const extraLinksText = document.getElementById('editExtraLinks').value.trim();
    const mainFileInput = document.getElementById('editMainFile');
    const librariesInput = document.getElementById('editLibraries');
    const imageURL = document.getElementById('editProjectImage').value.trim();

    // Validações
    if (!title) return alert('Preencha o nome do projeto.');
    if (title.length > 100) return alert('Título muito longo. Máximo: 100 caracteres.');
    if (!description) return alert('Preencha a descrição.');
    if (description.length > 2000) return alert('Descrição muito longa. Máximo: 2000 caracteres.');
    if (!videoURL) return alert('Coloque o link do vídeo.');
    if (!pdfLinksText) return alert('Coloque pelo menos um link de PDF.');
    if (bnccTagState.edit.length === 0) return alert('Adicione pelo menos um código BNCC ao projeto.');

    const saveBtn = document.getElementById('saveEditBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
        const updateData = {
            title: title,
            description: description,
            videoURL: videoURL,
            pdfLinks: pdfLinksText.split('\n').map(l => l.trim()).filter(l => l),
            extraLinks: extraLinksText ? extraLinksText.split('\n').map(l => l.trim()).filter(l => l) : [],
            bnccCodes: bnccTagState.edit.slice(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Se enviou novo Main.py, atualiza
        if (mainFileInput.files[0]) {
            const file = mainFileInput.files[0];
            if (!file.name.endsWith('.py')) throw new Error('O arquivo principal deve ser .py');
            if (file.size / 1024 > 100) throw new Error('Main.py muito grande. Máximo: 100KB.');
            updateData.mainFile = { name: file.name, content: await readEditFileAsText(file) };
        }

        // Se enviou novas bibliotecas, atualiza
        if (librariesInput.files.length > 0) {
            const libs = [];
            for (const file of librariesInput.files) {
                if (!file.name.endsWith('.py')) throw new Error(`${file.name} não é .py`);
                if (file.size / 1024 > 100) throw new Error(`${file.name} muito grande. Máximo: 100KB.`);
                libs.push({ name: file.name, content: await readEditFileAsText(file) });
            }
            updateData.libraries = libs;
        }

        // Se preencheu nova imagem de capa, atualiza
        if (imageURL) {
            updateData.imageURL = imageURL;
        }

        await db.collection('projects').doc(currentProjectId).update(updateData);

        closeEditProjectModal();

        // Recarrega o projeto
        await openProjectDetail(currentProjectId);

    } catch (error) {
        console.error('Erro ao salvar edição:', error);
        alert('Erro ao salvar. Tente novamente.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar Alterações';
    }
}

// Deletar projeto atual
async function deleteCurrentProject() {
    if (!currentProject || !currentProjectId) return;
    
    const user = auth.currentUser;
    if (!user || user.uid !== currentProject.authorId) {
        alert('Você não tem permissão para excluir este projeto.');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este projeto?\n\nEsta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        await db.collection('projects').doc(currentProjectId).delete();
        
        // Volta para a home
        backToHome();
        
        // Recarrega a lista de projetos
        loadProjects();
        
        alert('Projeto excluído com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir projeto:', error);
        alert('Erro ao excluir projeto. Tente novamente.');
    }
}
