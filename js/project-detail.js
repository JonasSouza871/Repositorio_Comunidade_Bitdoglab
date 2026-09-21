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
        await renderProjectDetail(currentProject);

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
async function renderProjectDetail(project) {
    const container = document.getElementById('projectDetailContent');

    const date = project.createdAt ? project.createdAt.toDate().toLocaleDateString('pt-BR') : '';
    const canManage = await canManageProject(project);
    const coverImageUrl = getDirectImageUrl(project.imageURL);
    const authorPhoto = sanitizeHttpUrl(project.authorPhoto || '');
    const githubURL = sanitizeGithubRepoUrl(project.githubURL || '');
    const videoEmbed = getVideoEmbed(project.videoURL || '');

    container.innerHTML = `
        <!-- Header do projeto -->
        <div class="detail-header">
            <button type="button" class="btn btn-back" data-project-action="back-home">
                <span class="material-icons">arrow_back</span> Voltar
            </button>
            ${canManage ? `
            <div class="owner-actions">
                <button type="button" class="btn btn-edit" data-project-action="edit-project">
                    <span class="material-icons">edit</span> Editar
                </button>
                <button type="button" class="btn btn-delete" data-project-action="delete-project">
                    <span class="material-icons">delete</span> Excluir
                </button>
            </div>
            ` : ''}
        </div>

        <div class="detail-body">
            <!-- Imagem de capa -->
            ${coverImageUrl ? `<img src="${escapeHtml(coverImageUrl)}" class="detail-image" alt="${escapeHtml(project.title)}">` : ''}
            
            <!-- Info principal -->
            <h1 class="detail-title">${escapeHtml(project.title)}</h1>
            <div class="detail-author">
                <img src="${escapeHtml(authorPhoto)}" alt="" class="detail-author-avatar">
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

            ${project.materials ? `
            <!-- Materiais utilizados -->
            <div class="detail-section">
                <h2 class="detail-section-title">
                    <span class="material-icons">inventory_2</span> Materiais Utilizados
                </h2>
                ${renderProjectMaterials(project.materials)}
            </div>
            ` : ''}

            <!-- Vídeo -->
            ${videoEmbed ? `
            <div class="detail-section">
                <h2 class="detail-section-title">
                    <span class="material-icons">play_circle</span> Vídeo
                </h2>
                <div class="detail-video">
                    ${videoEmbed}
                </div>
            </div>
            ` : ''}

            <!-- GitHub -->
            ${githubURL ? `
            <div class="detail-section">
                <h2 class="detail-section-title">
                    <span class="material-icons">code</span> Repositório
                </h2>
                <a href="${escapeHtml(githubURL)}" target="_blank" rel="noopener" class="extra-link">
                    <span class="material-icons">open_in_new</span>
                    Abrir no GitHub
                </a>
            </div>
            ` : ''}
            <!-- Plano de aula e estudo dirigido -->
            <div class="detail-section">
                <h2 class="detail-section-title">
                    <span class="material-icons">menu_book</span> Plano de Aula e Estudo Dirigido
                </h2>
                <div class="detail-guides">
                    ${renderLessonPdf(project)}
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

            <!-- Enviar para a Placa -->
            <div class="detail-section detail-flash">
                <button type="button" class="btn btn-flash" data-project-action="flash-project">
                    <span class="material-icons">bolt</span> Enviar para a Placa
                </button>
                <p class="flash-hint">Envia o código direto para a BitDogLab via WebSerial</p>
            </div>
        </div>
    `;

    renderPdfViewers(container);
}

function renderProjectMaterials(materials) {
    const lines = (materials || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (lines.length === 0) {
        return '<p class="detail-description">Nenhum material informado.</p>';
    }

    return `
        <ul class="materials-list">
            ${lines.map(line => {
                const match = line.match(/^(\d+(?:[,.]\d+)?\s*x)\s+(.+)$/i);
                if (!match) {
                    return `<li>${escapeHtml(line)}</li>`;
                }

                return `
                    <li>
                        <span class="material-quantity">${escapeHtml(match[1].replace(/\s+/g, ''))}</span>
                        <span class="material-name">${escapeHtml(match[2])}</span>
                    </li>
                `;
            }).join('')}
        </ul>
    `;
}

function handleProjectDetailAction(event) {
    const trigger = event.target.closest('[data-project-action]');
    if (!trigger) return;

    event.preventDefault();

    const action = trigger.dataset.projectAction;

    if (action === 'back-home') {
        backToHome();
    } else if (action === 'edit-project') {
        openEditProjectModal();
    } else if (action === 'delete-project') {
        deleteCurrentProject();
    } else if (action === 'flash-project') {
        flashCurrentProject();
    } else if (action === 'preview-code') {
        previewCode(trigger.dataset.fileIndex);
    } else if (action === 'download-code') {
        downloadPyFile(trigger.dataset.fileIndex);
    }
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
                    <button type="button" class="btn btn-small btn-preview" data-project-action="preview-code" data-file-index="0">
                        <span class="material-icons">visibility</span> Ver
                    </button>
                    <button type="button" class="btn btn-small btn-download" data-project-action="download-code" data-file-index="0">
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
                        <button type="button" class="btn btn-small btn-preview" data-project-action="preview-code" data-file-index="${index + 1}">
                            <span class="material-icons">visibility</span> Ver
                        </button>
                        <button type="button" class="btn btn-small btn-download" data-project-action="download-code" data-file-index="${index + 1}">
                            <span class="material-icons">download</span> Baixar
                        </button>
                    </div>
                </div>
            `;
        });
    }

    return html || '<p class="empty-message">Nenhum arquivo disponível.</p>';
}

// Renderiza PDF pedagógico
function renderLessonPdf(project) {
    const legacyLink = project.pdfLinks && project.pdfLinks[0];
    const pdfUrl = sanitizeHttpUrl(project.lessonPdfURL || legacyLink);

    if (!pdfUrl) return '<p class="empty-message">Nenhum plano de aula disponível.</p>';

    const title = project.lessonPdfMeta?.name || 'Plano de aula e estudo dirigido';
    const downloadUrl = sanitizeHttpUrl(project.lessonPdfURL ? project.lessonPdfURL : getDriveDownloadUrl(legacyLink));

    return `
        <div class="guide-item">
            <div class="guide-header">
                <span class="material-icons">picture_as_pdf</span>
                <span class="guide-title">${escapeHtml(title)}</span>
                <div class="guide-actions">
                    <a href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener" class="btn btn-small btn-preview">
                        <span class="material-icons">open_in_new</span> Abrir
                    </a>
                    ${downloadUrl ? `
                    <a href="${escapeHtml(downloadUrl)}" target="_blank" rel="noopener" class="btn btn-small btn-download">
                        <span class="material-icons">download</span> Baixar
                    </a>
                    ` : ''}
                </div>
            </div>
            <div class="guide-preview">
                <div class="pdf-renderer" data-pdf-url="${encodeURIComponent(pdfUrl)}">
                    <div class="pdf-toolbar">
                        <button type="button" class="pdf-tool-btn" data-pdf-action="prev" aria-label="Pagina anterior">
                            <span class="material-icons">chevron_left</span>
                        </button>
                        <span class="pdf-page-status">Carregando PDF...</span>
                        <button type="button" class="pdf-tool-btn" data-pdf-action="next" aria-label="Proxima pagina">
                            <span class="material-icons">chevron_right</span>
                        </button>
                        <span class="pdf-toolbar-spacer"></span>
                        <button type="button" class="pdf-tool-btn" data-pdf-action="zoom-out" aria-label="Diminuir zoom">
                            <span class="material-icons">zoom_out</span>
                        </button>
                        <button type="button" class="pdf-tool-btn" data-pdf-action="zoom-in" aria-label="Aumentar zoom">
                            <span class="material-icons">zoom_in</span>
                        </button>
                    </div>
                    <div class="pdf-canvas-wrap">
                        <canvas class="pdf-canvas"></canvas>
                    </div>
                    <p class="pdf-error" hidden>Nao foi possivel mostrar o preview. Use Abrir ou Baixar.</p>
                </div>
            </div>
        </div>
    `;
}

function renderPdfViewers(scope) {
    const viewers = scope.querySelectorAll('.pdf-renderer[data-pdf-url]');
    viewers.forEach(initPdfViewer);
}

function initPdfViewer(viewer) {
    if (!window.pdfjsLib) {
        showPdfViewerError(viewer);
        return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    const state = {
        pdf: null,
        page: 1,
        zoom: 1,
        rendering: false,
        pending: false
    };

    const url = decodeURIComponent(viewer.dataset.pdfUrl || '');
    const canvas = viewer.querySelector('.pdf-canvas');
    const wrap = viewer.querySelector('.pdf-canvas-wrap');
    const status = viewer.querySelector('.pdf-page-status');
    const buttons = viewer.querySelectorAll('[data-pdf-action]');

    function setButtons() {
        const prev = viewer.querySelector('[data-pdf-action="prev"]');
        const next = viewer.querySelector('[data-pdf-action="next"]');
        const zoomOut = viewer.querySelector('[data-pdf-action="zoom-out"]');
        const zoomIn = viewer.querySelector('[data-pdf-action="zoom-in"]');

        if (prev) prev.disabled = !state.pdf || state.page <= 1;
        if (next) next.disabled = !state.pdf || state.page >= state.pdf.numPages;
        if (zoomOut) zoomOut.disabled = state.zoom <= 0.75;
        if (zoomIn) zoomIn.disabled = state.zoom >= 1.75;
    }

    async function renderPage() {
        if (!state.pdf) return;

        if (state.rendering) {
            state.pending = true;
            return;
        }

        state.rendering = true;
        status.textContent = `Pagina ${state.page} de ${state.pdf.numPages}`;
        setButtons();

        try {
            const page = await state.pdf.getPage(state.page);
            const baseViewport = page.getViewport({ scale: 1 });
            const availableWidth = Math.max(280, wrap.clientWidth - 24);
            const fittedScale = availableWidth / baseViewport.width;
            const viewport = page.getViewport({ scale: fittedScale * state.zoom });
            const context = canvas.getContext('2d');
            const ratio = window.devicePixelRatio || 1;

            canvas.width = Math.floor(viewport.width * ratio);
            canvas.height = Math.floor(viewport.height * ratio);
            canvas.style.width = `${Math.floor(viewport.width)}px`;
            canvas.style.height = `${Math.floor(viewport.height)}px`;

            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            await page.render({ canvasContext: context, viewport }).promise;
        } catch (error) {
            console.error('Erro ao renderizar PDF:', error);
            showPdfViewerError(viewer);
        } finally {
            state.rendering = false;
            if (state.pending) {
                state.pending = false;
                renderPage();
            }
        }
    }

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.pdfAction;
            if (action === 'prev' && state.page > 1) state.page -= 1;
            if (action === 'next' && state.pdf && state.page < state.pdf.numPages) state.page += 1;
            if (action === 'zoom-out') state.zoom = Math.max(0.75, state.zoom - 0.25);
            if (action === 'zoom-in') state.zoom = Math.min(1.75, state.zoom + 0.25);
            renderPage();
        });
    });

    setButtons();

    loadPdfDocument(url, status)
        .then(pdf => {
            state.pdf = pdf;
            renderPage();
        })
        .catch(error => {
            console.error('Erro ao carregar PDF:', error);
            showPdfViewerError(viewer);
        });
}

async function loadPdfDocument(url, status) {
    if (status) status.textContent = 'Baixando PDF...';

    const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(`Falha ao baixar PDF: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    if (status) status.textContent = 'Renderizando PDF...';

    return pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
}

function showPdfViewerError(viewer) {
    const canvas = viewer.querySelector('.pdf-canvas');
    const error = viewer.querySelector('.pdf-error');
    const status = viewer.querySelector('.pdf-page-status');

    if (canvas) canvas.style.display = 'none';
    if (error) error.hidden = false;
    if (status) status.textContent = 'Preview indisponivel';

    viewer.querySelectorAll('[data-pdf-action]').forEach(button => {
        button.disabled = true;
    });
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
    const safeUrl = sanitizeHttpsUrl(url);
    if (!safeUrl) return '';

    // YouTube
    let videoId = null;
    const parsed = new URL(safeUrl);
    if (parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') {
        videoId = parsed.searchParams.get('v');
    } else if (parsed.hostname === 'youtu.be') {
        videoId = parsed.pathname.split('/').filter(Boolean)[0];
    }

    if (videoId) {
        return `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}" class="video-player" allowfullscreen></iframe>`;
    }

    // Google Drive video
    const driveId = extractDriveFileId(safeUrl);
    if (driveId) {
        return `<iframe src="https://drive.google.com/file/d/${driveId}/preview" class="video-player" allowfullscreen></iframe>`;
    }

    // Fallback: link direto
    return '';
}

function getProjectFileByIndex(fileIndex) {
    const index = Number(fileIndex);
    if (!currentProject || !Number.isInteger(index) || index < 0) return null;

    if (index === 0) {
        if (!currentProject.mainFile) return null;
        return {
            name: currentProject.mainFile.name || 'main.py',
            content: currentProject.mainFile.content || ''
        };
    }

    const lib = currentProject.libraries && currentProject.libraries[index - 1];
    if (!lib) return null;

    return {
        name: lib.name || 'biblioteca.py',
        content: lib.content || ''
    };
}

// Preview do código
function previewCode(fileIndex) {
    const file = getProjectFileByIndex(fileIndex);
    if (!file) return;

    // Abre modal de preview
    const modal = document.getElementById('codePreviewModal');
    document.getElementById('codePreviewTitle').textContent = file.name;
    document.getElementById('codePreviewContent').textContent = file.content;
    modal.classList.add('active');
}

// Fecha preview
function closeCodePreview() {
    document.getElementById('codePreviewModal').classList.remove('active');
}

// Download de arquivo .py
function downloadPyFile(fileIndex) {
    const file = getProjectFileByIndex(fileIndex);
    if (!file) return;

    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
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
                if (!isSafePythonFilename(lib.name)) {
                    throw new Error(`Nome de biblioteca inválido: ${lib.name}`);
                }
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

async function isCurrentUserAdmin() {
    const user = auth.currentUser;
    if (!user) return false;

    if (window.currentUserIsAdmin === true) return true;

    try {
        const tokenResult = await user.getIdTokenResult();
        const adminEmails = typeof ADMIN_EMAILS !== 'undefined' ? ADMIN_EMAILS : [];
        const email = (tokenResult.claims.email || user.email || '').toLowerCase();
        window.currentUserIsAdmin = tokenResult.claims.admin === true || adminEmails.includes(email);
        return window.currentUserIsAdmin;
    } catch (error) {
        console.error('Erro ao verificar admin:', error);
        return false;
    }
}

async function canManageProject(project) {
    return isProjectOwner(project) || await isCurrentUserAdmin();
}

// Abre modal de edição preenchido com dados do projeto atual
async function openEditProjectModal() {
    if (!currentProject || !(await canManageProject(currentProject))) return;

    document.getElementById('editProjectTitle').value = currentProject.title;
    document.getElementById('editProjectDescription').value = currentProject.description;
    document.getElementById('editProjectMaterials').value = currentProject.materials || '';
    document.getElementById('editProjectVideo').value = currentProject.videoURL || '';
    document.getElementById('editProjectGithub').value = currentProject.githubURL || '';
    document.getElementById('editLessonPdf').value = '';
    document.getElementById('editProjectImage').value = '';

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
    if (!user || !(await canManageProject(currentProject))) {
        alert('Você não tem permissão para editar este projeto.');
        return;
    }
    const title = document.getElementById('editProjectTitle').value.trim();
    const description = document.getElementById('editProjectDescription').value.trim();
    const materials = normalizeMaterialsInput(document.getElementById('editProjectMaterials').value);
    const videoURL = document.getElementById('editProjectVideo').value.trim();
    const githubURL = document.getElementById('editProjectGithub').value.trim();
    const lessonPdfInput = document.getElementById('editLessonPdf');
    const lessonPdfFile = lessonPdfInput.files[0] || null;
    const mainFileInput = document.getElementById('editMainFile');
    const librariesInput = document.getElementById('editLibraries');
    const coverInput = document.getElementById('editProjectImage');
    const coverFile = coverInput.files[0] || null;

    // Validações
    if (!title) return alert('Preencha o nome do projeto.');
    if (title.length > 100) return alert('Título muito longo. Máximo: 100 caracteres.');
    if (!description) return alert('Preencha a descrição.');
    if (description.length > 2000) return alert('Descrição muito longa. Máximo: 2000 caracteres.');
    try {
        validateMaterialsList(materials);
    } catch (e) {
        return alert(e.message);
    }
    if (!currentProject.lessonPdfURL && !(currentProject.pdfLinks && currentProject.pdfLinks.length) && !lessonPdfFile) {
        return alert('Envie o PDF com plano de aula e estudo dirigido.');
    }
    if (bnccTagState.edit.length === 0) return alert('Adicione pelo menos um código BNCC ao projeto.');
    if (bnccTagState.edit.length > LIMITS.MAX_BNCC_CODES) return alert(`Selecione no máximo ${LIMITS.MAX_BNCC_CODES} códigos BNCC por projeto.`);
    if (coverInput.files.length > 1) return alert('Envie apenas uma imagem de capa.');
    if (lessonPdfInput.files.length > 1) return alert('Envie apenas um PDF pedagógico.');

    if (videoURL && !isValidVideoLink(videoURL)) {
        return alert('O link do vídeo deve ser do YouTube ou Google Drive.');
    }

    if (githubURL && !isValidGithubLink(githubURL)) {
        return alert('O link do GitHub deve apontar para um repositório. Ex: https://github.com/usuario/repositorio');
    }

    try {
        validateCoverImage(coverFile);
    } catch (e) {
        return alert(e.message);
    }

    try {
        validateLessonPdf(lessonPdfFile);
    } catch (e) {
        return alert(e.message);
    }

    const saveBtn = document.getElementById('saveEditBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
        const updateData = {
            title: title,
            description: description,
            materials: materials,
            videoURL: videoURL,
            githubURL: githubURL,
            pdfLinks: currentProject.pdfLinks || [],
            extraLinks: [],
            bnccCodes: bnccTagState.edit.slice(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Se enviou novo Main.py, atualiza
        if (mainFileInput.files[0]) {
            const file = mainFileInput.files[0];
            if (!isSafePythonFilename(file.name)) {
                throw new Error('O arquivo principal deve usar apenas letras, números, _ ou - e terminar em .py');
            }
            if (file.size / 1024 > 100) throw new Error('Main.py muito grande. Máximo: 100KB.');
            updateData.mainFile = { name: file.name, content: await readEditFileAsText(file) };
        }

        // Se enviou novas bibliotecas, atualiza
        if (librariesInput.files.length > 0) {
            if (librariesInput.files.length > LIMITS.MAX_LIBRARIES) {
                throw new Error(`Máximo de ${LIMITS.MAX_LIBRARIES} bibliotecas.`);
            }
            const libs = [];
            for (const file of librariesInput.files) {
                if (!isSafePythonFilename(file.name)) {
                    throw new Error(`${file.name} possui um nome inválido. Use apenas letras, números, _ ou - e termine em .py`);
                }
                if (file.size / 1024 > 100) throw new Error(`${file.name} muito grande. Máximo: 100KB.`);
                libs.push({ name: file.name, content: await readEditFileAsText(file) });
            }
            updateData.libraries = libs;
        }

        // Se enviou nova imagem de capa, atualiza
        if (coverFile) {
            const coverUpload = await uploadProjectCover(coverFile, currentProject.authorId, currentProjectId);
            updateData.imageURL = coverUpload.imageURL;
            updateData.imagePath = coverUpload.imagePath;
            updateData.imageMeta = coverUpload.imageMeta;

            if (currentProject.imagePath && currentProject.imagePath !== coverUpload.imagePath) {
                await deleteProjectCover(currentProject.imagePath);
            }
        }

        if (lessonPdfFile) {
            const lessonUpload = await uploadLessonPdf(lessonPdfFile, currentProject.authorId, currentProjectId);
            updateData.lessonPdfURL = lessonUpload.lessonPdfURL;
            updateData.lessonPdfPath = lessonUpload.lessonPdfPath;
            updateData.lessonPdfMeta = lessonUpload.lessonPdfMeta;
            updateData.pdfLinks = [];

            if (currentProject.lessonPdfPath && currentProject.lessonPdfPath !== lessonUpload.lessonPdfPath) {
                await deleteLessonPdf(currentProject.lessonPdfPath);
            }
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
    if (!user || !(await canManageProject(currentProject))) {
        alert('Você não tem permissão para excluir este projeto.');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este projeto?\n\nEsta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        await deleteProjectCover(currentProject.imagePath);
        await deleteLessonPdf(currentProject.lessonPdfPath);

        const projectRef = db.collection('projects').doc(currentProjectId);
        const authorRef = db.collection('users').doc(currentProject.authorId);
        const authorSnapshot = await authorRef.get();
        const deletingAsOwner = user.uid === currentProject.authorId;

        if (deletingAsOwner && !authorSnapshot.exists) {
            throw new Error('Perfil do autor nao encontrado.');
        }

        const deleteBatch = db.batch();
        deleteBatch.delete(projectRef);
        if (authorSnapshot.exists && (authorSnapshot.data().projectCount || 0) > 0) {
            deleteBatch.update(authorRef, {
                projectCount: firebase.firestore.FieldValue.increment(-1),
                projectMutationId: currentProjectId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        await deleteBatch.commit();

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

document.addEventListener('DOMContentLoaded', function() {
    const detailContainer = document.getElementById('projectDetailContent');
    if (detailContainer) {
        detailContainer.addEventListener('click', handleProjectDetailAction);
    }
});
