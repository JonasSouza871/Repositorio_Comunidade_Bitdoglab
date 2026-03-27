/**
 * Project Detail - Página de detalhes do projeto
 * Comunidade BitDogLab
 */

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

        // Mostra seção de detalhes, esconde home
        document.getElementById('homeSection').classList.remove('active');
        document.getElementById('projectDetailSection').classList.add('active');

        // Atualiza navegação
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

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
        </div>

        <div class="detail-body">
            <!-- Info principal -->
            <h1 class="detail-title">${escapeHtml(project.title)}</h1>
            <div class="detail-author">
                <img src="${project.authorPhoto || ''}" alt="" class="detail-author-avatar" onerror="this.style.display='none'">
                <div>
                    <span class="detail-author-name">${escapeHtml(project.authorName)}</span>
                    <span class="detail-date">Publicado em ${date}</span>
                </div>
            </div>

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

            <!-- Arquivos do Projeto -->
            <div class="detail-section">
                <h2 class="detail-section-title">
                    <span class="material-icons">folder</span> Arquivos do Projeto
                </h2>
                <div class="detail-files">
                    ${renderProjectFiles(project)}
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

            <!-- Botão Flashear -->
            <div class="detail-section detail-flash">
                <button class="btn btn-flash" onclick="flashCurrentProject()">
                    <span class="material-icons">bolt</span> Flashear na Placa
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

// Flashear projeto atual na placa
async function flashCurrentProject() {
    if (!currentProject) return;

    if (!window.flashManager || !window.webSerial?.connected) {
        alert('Conecte a placa primeiro. Vá na aba Terminal e clique em Conectar.');
        return;
    }

    if (!confirm('Enviar código para a placa? Isso vai sobrescrever o código atual.')) return;

    try {
        // Prepara conteúdo: main.py como blob URL e libs como blob URLs
        const mainBlob = new Blob([currentProject.mainFile.content], { type: 'text/plain' });
        const mainURL = URL.createObjectURL(mainBlob);

        const libURLs = [];
        if (currentProject.libraries) {
            for (const lib of currentProject.libraries) {
                const blob = new Blob([lib.content], { type: 'text/plain' });
                libURLs.push(URL.createObjectURL(blob));
            }
        }

        await window.flashToDevice(mainURL, libURLs);
        alert('Código enviado com sucesso!');

        // Limpa URLs temporárias
        URL.revokeObjectURL(mainURL);
        libURLs.forEach(url => URL.revokeObjectURL(url));

    } catch (error) {
        alert(`Erro ao flashear: ${error.message}`);
    }
}

// Formata tamanho do conteúdo
function formatSize(content) {
    if (!content) return '';
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
}
