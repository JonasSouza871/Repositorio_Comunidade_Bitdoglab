/**
 * Projects - Upload e gerenciamento de projetos
 * Comunidade BitDogLab
 *
 * Arquivos .py → conteúdo salvo como texto no Firestore
 * PDF pedagógico, imagens e XML do BIPES BitDogLab → Firebase Storage
 */

// Limites de tamanho
const LIMITS = {
    MAIN_FILE_MAX_KB: 100,        // Main.py max 100KB
    LIB_FILE_MAX_KB: 100,         // Cada biblioteca max 100KB
    MAX_LIBRARIES: 5,             // Máximo 5 bibliotecas
    MAX_BNCC_CODES: 5,            // Máximo 5 habilidades BNCC
    TITLE_MAX_CHARS: 100,         // Título max 100 caracteres
    DESCRIPTION_MAX_CHARS: 2000,  // Descrição max 2000 caracteres
    MATERIALS_MAX_CHARS: 2000,    // Lista de materiais max 2000 caracteres
    COVER_IMAGE_MAX_MB: 2,        // Imagem de capa max 2MB
    LESSON_PDF_MAX_MB: 10,        // Plano de aula/estudo dirigido max 10MB
    BLOCK_XML_MAX_KB: 500,        // Workspace do BIPES BitDogLab
    MAX_PROJECTS_PER_USER: 20     // Limite prático por usuário
};

const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const SAFE_PYTHON_FILENAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,116}\.py$/;
const BIPES_PROJECT_TYPE = 'bipes-bitdoglab';

// O nome original continua no arquivo enviado, mas o nome salvo no Firestore
// precisa respeitar o limite definido nas regras de segurança (120 caracteres).
function getSafeMetadataFileName(file, fallbackName) {
    const originalName = typeof file?.name === 'string' && file.name
        ? file.name.normalize('NFC')
        : fallbackName;

    if (originalName.length <= 120) return originalName;

    const extensionIndex = originalName.lastIndexOf('.');
    const extension = extensionIndex > 0 ? originalName.slice(extensionIndex) : '';
    const maxBaseLength = Math.max(1, 120 - extension.length);
    return originalName.slice(0, maxBaseLength) + extension;
}

function isSafePythonFilename(name) {
    return typeof name === 'string'
        && name.length <= 120
        && SAFE_PYTHON_FILENAME_PATTERN.test(name);
}

function getSelectedProjectType() {
    return document.querySelector('input[name="projectType"]:checked')?.value || 'micropython';
}

function updateProjectTypeFields() {
    const isBipes = getSelectedProjectType() === BIPES_PROJECT_TYPE;
    document.getElementById('microPythonProjectFields').hidden = isBipes;
    document.getElementById('bipesProjectFields').hidden = !isBipes;
    document.getElementById('projectMaterialsFields').hidden = isBipes;
    document.getElementById('projectImageHint').textContent = isBipes
        ? '(obrigatória; JPG, PNG, WEBP ou GIF; máx. 2MB)'
        : '(apenas 1 imagem; JPG, PNG, WEBP ou GIF; máx. 2MB)';
    document.getElementById('projectLessonRequirement').textContent = isBipes ? '' : '*';
    document.getElementById('projectLessonHint').textContent = isBipes
        ? '(opcional; PDF único; máx. 10MB)'
        : '(PDF único; máx. 10MB)';
}

// Estado das tags BNCC por modal
const bnccTagState = {
    project: [],  // tags do modal de novo projeto
    edit: []      // tags do modal de edição
};

// Abre modal de novo projeto
async function openProjectModal() {
    const user = auth.currentUser;
    if (!user) {
        alert('Faça login para publicar um projeto.');
        return;
    }
    if (window.currentUserProfileComplete === false) {
        alert('Complete seu perfil antes de publicar um projeto.');
        const profileSnapshot = await db.collection('users').doc(user.uid).get();
        openProfileModal(user, {
            required: true,
            profileData: profileSnapshot.exists ? profileSnapshot.data() : null
        });
        return;
    }
    document.getElementById('projectModal').classList.add('active');
    updateProjectTypeFields();
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
    document.getElementById('projectMaterials').value = '';
    document.getElementById('projectVideo').value = '';
    document.getElementById('projectGithub').value = '';
    document.getElementById('projectMainFile').value = '';
    document.getElementById('projectLibraries').value = '';
    document.getElementById('projectLessonPdf').value = '';
    document.getElementById('projectImage').value = '';
    document.getElementById('projectBipesImage').value = '';
    document.getElementById('projectBlockXml').value = '';
    document.getElementById('projectObservations').value = '';
    document.getElementById('projectAllowRemix').checked = false;
    document.querySelector('input[name="projectType"][value="micropython"]').checked = true;
    document.querySelectorAll('input[name="projectBoardVersion"], input[name="projectBipesMode"], input[name="projectDifficulty"]').forEach(input => {
        input.checked = false;
    });
    document.getElementById('uploadProgress').style.display = 'none';
    bnccTagState.project = [];
    renderBnccTags('project');
    updateProjectTypeFields();
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

// Valida imagem de capa
function validateCoverImage(file) {
    if (!file) return;

    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
        throw new Error('A imagem de capa deve ser JPG, PNG, WEBP ou GIF.');
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > LIMITS.COVER_IMAGE_MAX_MB) {
        throw new Error(`Imagem muito grande. Máximo: ${LIMITS.COVER_IMAGE_MAX_MB}MB.`);
    }
}

function validateBipesProjectImage(file) {
    try {
        validateCoverImage(file);
    } catch (error) {
        throw new Error(error.message.replace('imagem de capa', 'imagem do projeto').replace('Imagem muito grande', 'Imagem do projeto muito grande'));
    }
}

// Valida PDF pedagógico
function validateLessonPdf(file) {
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
        throw new Error('O plano de aula deve ser um arquivo PDF.');
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > LIMITS.LESSON_PDF_MAX_MB) {
        throw new Error(`PDF muito grande. Máximo: ${LIMITS.LESSON_PDF_MAX_MB}MB.`);
    }
}

function validateBlockXml(file, content) {
    if (!file || !file.name.toLowerCase().endsWith('.xml')) {
        throw new Error('Envie o arquivo XML exportado pelo BIPES BitDogLab.');
    }
    if (file.name.length > 120) {
        throw new Error('O nome do arquivo XML deve ter no máximo 120 caracteres.');
    }
    validateFileSize(file, LIMITS.BLOCK_XML_MAX_KB);
    if (/<!DOCTYPE|<!ENTITY/i.test(content)) {
        throw new Error('O XML contém uma declaração não permitida. Exporte novamente pelo BIPES BitDogLab.');
    }

    const parsed = new DOMParser().parseFromString(content, 'application/xml');
    if (parsed.querySelector('parsererror') || parsed.documentElement.localName.toLowerCase() !== 'xml') {
        throw new Error('O arquivo não contém um projeto XML válido do BIPES BitDogLab.');
    }
}

function normalizeMaterialsInput(value) {
    return value
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
}

function validateMaterialsList(materials) {
    if (!materials) {
        throw new Error('Preencha os materiais utilizados no projeto.');
    }

    if (materials.length > LIMITS.MATERIALS_MAX_CHARS) {
        throw new Error(`Lista de materiais muito longa. Máximo: ${LIMITS.MATERIALS_MAX_CHARS} caracteres.`);
    }

    const lines = materials.split('\n');
    const invalidLine = lines.find(line => !/^\d+([,.]\d+)?\s*x\s+\S+/i.test(line));
    if (invalidLine) {
        throw new Error(`Revise a linha "${invalidLine}". Use o formato quantidade + componente, por exemplo: 2x LED vermelho.`);
    }
}

async function uploadLessonPdf(file, userId, projectId) {
    if (!file) return { lessonPdfURL: '', lessonPdfPath: '', lessonPdfMeta: null };
    if (typeof storage === 'undefined') {
        throw new Error('Firebase Storage não foi inicializado.');
    }

    validateLessonPdf(file);

    const lessonPdfPath = `project-guides/${userId}/${projectId}/lesson-plan`;
    const ref = storage.ref().child(lessonPdfPath);
    const snapshot = await ref.put(file, {
        contentType: 'application/pdf',
        customMetadata: {
            originalName: file.name
        }
    });
    const lessonPdfURL = await snapshot.ref.getDownloadURL();

    return {
        lessonPdfURL: lessonPdfURL,
        lessonPdfPath: lessonPdfPath,
        lessonPdfMeta: {
            name: getSafeMetadataFileName(file, 'lesson-plan.pdf'),
            size: file.size,
            type: 'application/pdf'
        }
    };
}

async function deleteLessonPdf(lessonPdfPath) {
    if (!lessonPdfPath || typeof storage === 'undefined') return;

    try {
        await storage.ref().child(lessonPdfPath).delete();
    } catch (error) {
        console.warn('Não foi possível remover o PDF do Storage:', error);
    }
}

async function uploadBlockXml(file, content, userId, projectId) {
    const blockFilePath = `project-blocks/${userId}/${projectId}/workspace.xml`;
    const ref = storage.ref().child(blockFilePath);
    const snapshot = await ref.put(new Blob([content], { type: 'application/xml' }), {
        contentType: 'application/xml',
        contentDisposition: 'attachment; filename="workspace.bipes.xml"',
        customMetadata: { originalName: file.name }
    });

    return {
        blockFileURL: await snapshot.ref.getDownloadURL(),
        blockFilePath: blockFilePath,
        blockFileMeta: {
            name: getSafeMetadataFileName(file, 'workspace.xml'),
            size: file.size,
            type: 'application/xml'
        }
    };
}

async function deleteBlockXml(blockFilePath) {
    if (!blockFilePath || typeof storage === 'undefined') return;
    try {
        await storage.ref().child(blockFilePath).delete();
    } catch (error) {
        console.warn('Não foi possível remover o XML do BIPES BitDogLab:', error);
    }
}

// Faz upload da imagem de capa para o Firebase Storage
async function uploadProjectCover(file, userId, projectId) {
    if (!file) return { imageURL: '', imagePath: '', imageMeta: null };
    if (typeof storage === 'undefined') {
        throw new Error('Firebase Storage não foi inicializado.');
    }

    validateCoverImage(file);

    const imagePath = `project-covers/${userId}/${projectId}/cover`;
    const ref = storage.ref().child(imagePath);
    const snapshot = await ref.put(file, {
        contentType: file.type,
        customMetadata: {
            originalName: file.name
        }
    });
    const imageURL = await snapshot.ref.getDownloadURL();

    return {
        imageURL: imageURL,
        imagePath: imagePath,
        imageMeta: {
            name: getSafeMetadataFileName(file, 'cover'),
            size: file.size,
            type: file.type
        }
    };
}

// Remove arquivo do Storage, sem interromper fluxos importantes se falhar
async function deleteProjectCover(imagePath) {
    if (!imagePath || typeof storage === 'undefined') return;

    try {
        await storage.ref().child(imagePath).delete();
    } catch (error) {
        console.warn('Não foi possível remover a capa do Storage:', error);
    }
}

async function uploadBipesProjectImage(file, userId, projectId) {
    if (!file) return { projectImageURL: '', projectImagePath: '', projectImageMeta: null };
    if (typeof storage === 'undefined') {
        throw new Error('Firebase Storage não foi inicializado.');
    }

    validateBipesProjectImage(file);

    const projectImagePath = `project-images/${userId}/${projectId}/project-image`;
    const ref = storage.ref().child(projectImagePath);
    const snapshot = await ref.put(file, {
        contentType: file.type,
        customMetadata: { originalName: file.name }
    });

    return {
        projectImageURL: await snapshot.ref.getDownloadURL(),
        projectImagePath: projectImagePath,
        projectImageMeta: {
            name: getSafeMetadataFileName(file, 'project-image'),
            size: file.size,
            type: file.type
        }
    };
}

async function deleteBipesProjectImage(projectImagePath) {
    if (!projectImagePath || typeof storage === 'undefined') return;

    try {
        await storage.ref().child(projectImagePath).delete();
    } catch (error) {
        console.warn('Não foi possível remover a imagem do projeto do Storage:', error);
    }
}

function isValidGithubLink(url) {
    return /^https:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+\/?/.test(url);
}

// Cada usuario possui no maximo 20 IDs reservados. Isso permite que as regras
// imponham o limite sem depender apenas de um contador enviado pelo navegador.
async function getAvailableProjectId(userId) {
    const snapshot = await db.collection('projects')
        .where('authorId', '==', userId)
        .limit(LIMITS.MAX_PROJECTS_PER_USER)
        .get();

    if (snapshot.size >= LIMITS.MAX_PROJECTS_PER_USER) {
        throw new Error(`Limite de ${LIMITS.MAX_PROJECTS_PER_USER} projetos por usuario atingido.`);
    }

    const usedIds = new Set(snapshot.docs.map(doc => doc.id));
    for (let slot = 0; slot < LIMITS.MAX_PROJECTS_PER_USER; slot++) {
        const projectId = `${userId}_${slot}`;
        if (!usedIds.has(projectId)) return projectId;
    }

    throw new Error(`Limite de ${LIMITS.MAX_PROJECTS_PER_USER} projetos por usuario atingido.`);
}

async function rollbackReservedProject(projectId, userId, counterUpdated) {
    if (!counterUpdated) {
        await db.collection('projects').doc(projectId).delete();
        return;
    }

    const batch = db.batch();
    batch.delete(db.collection('projects').doc(projectId));
    batch.update(db.collection('users').doc(userId), {
        projectCount: firebase.firestore.FieldValue.increment(-1),
        projectMutationId: projectId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();
}

function isValidVideoLink(url) {
    const safeUrl = sanitizeHttpsUrl(url);
    if (!safeUrl) return false;

    try {
        const parsed = new URL(safeUrl);
        return parsed.hostname === 'youtube.com'
            || parsed.hostname === 'www.youtube.com'
            || parsed.hostname === 'youtu.be'
            || parsed.hostname === 'drive.google.com';
    } catch (error) {
        return false;
    }
}

// Publica projeto
async function publishProject() {
    const user = auth.currentUser;
    if (!user) {
        alert('Faça login novamente para publicar o projeto.');
        return;
    }

    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn && publishBtn.disabled) return;

    // Coleta dados do formulário
    const title = document.getElementById('projectTitle').value.trim();
    const description = document.getElementById('projectDescription').value.trim();
    const enteredMaterials = normalizeMaterialsInput(document.getElementById('projectMaterials').value);
    const videoURL = document.getElementById('projectVideo').value.trim();
    const githubURL = document.getElementById('projectGithub').value.trim();
    const projectType = getSelectedProjectType();
    const isBipesProject = projectType === BIPES_PROJECT_TYPE;
    const materials = isBipesProject ? '' : enteredMaterials;
    const mainFileInput = document.getElementById('projectMainFile');
    const librariesInput = document.getElementById('projectLibraries');
    const blockXmlInput = document.getElementById('projectBlockXml');
    const blockXmlFile = blockXmlInput.files[0] || null;
    const bipesProjectImageInput = document.getElementById('projectBipesImage');
    const bipesProjectImageFile = bipesProjectImageInput.files[0] || null;
    const boardVersions = Array.from(document.querySelectorAll('input[name="projectBoardVersion"]:checked')).map(input => input.value);
    const bipesMode = document.querySelector('input[name="projectBipesMode"]:checked')?.value || '';
    const difficulty = document.querySelector('input[name="projectDifficulty"]:checked')?.value || '';
    const observations = document.getElementById('projectObservations').value.trim();
    const allowRemix = document.getElementById('projectAllowRemix').checked;
    const lessonPdfInput = document.getElementById('projectLessonPdf');
    const lessonPdfFile = lessonPdfInput.files[0] || null;
    const coverInput = document.getElementById('projectImage');
    const coverFile = coverInput.files[0] || null;

    // Validações obrigatórias
    if (!title) return alert('Preencha o nome do projeto.');
    if (title.length > LIMITS.TITLE_MAX_CHARS) return alert(`Título muito longo. Máximo: ${LIMITS.TITLE_MAX_CHARS} caracteres.`);
    if (!description) return alert('Preencha a descrição.');
    if (description.length > LIMITS.DESCRIPTION_MAX_CHARS) return alert(`Descrição muito longa. Máximo: ${LIMITS.DESCRIPTION_MAX_CHARS} caracteres.`);
    if (!isBipesProject) {
        try {
            validateMaterialsList(materials);
        } catch (e) {
            return alert(e.message);
        }
    }
    if (!isBipesProject && !mainFileInput.files[0]) return alert('Envie o arquivo Main.py.');
    if (!isBipesProject && !lessonPdfFile) return alert('Envie o PDF com plano de aula e estudo dirigido.');
    if (isBipesProject && !coverFile) return alert('Envie uma imagem de capa para o projeto.');
    if (isBipesProject && !bipesProjectImageFile) return alert('Envie uma imagem do projeto mostrando os blocos.');
    if (isBipesProject && !blockXmlFile) return alert('Envie o arquivo XML exportado pelo BIPES BitDogLab.');
    if (isBipesProject && boardVersions.length === 0) return alert('Marque pelo menos uma versão da BitDogLab.');
    if (isBipesProject && !bipesMode) return alert('Marque o modo utilizado no BIPES BitDogLab.');
    if (isBipesProject && !allowRemix) return alert('Confirme a autorização para compartilhar e remixar o projeto.');
    if (observations.length > 1000) return alert('As observações devem ter no máximo 1000 caracteres.');
    if (bnccTagState.project.length === 0) return alert('Adicione pelo menos um código BNCC ao projeto.');
    if (bnccTagState.project.length > LIMITS.MAX_BNCC_CODES) return alert(`Selecione no máximo ${LIMITS.MAX_BNCC_CODES} códigos BNCC por projeto.`);
    if (coverInput.files.length > 1) return alert('Envie apenas uma imagem de capa.');
    if (bipesProjectImageInput.files.length > 1) return alert('Envie apenas uma imagem do projeto.');
    if (lessonPdfInput.files.length > 1) return alert('Envie apenas um PDF pedagógico.');

    try {
        validateCoverImage(coverFile);
        if (isBipesProject) validateBipesProjectImage(bipesProjectImageFile);
    } catch (e) {
        return alert(e.message);
    }

    // Validação do vídeo
    if (videoURL && !isValidVideoLink(videoURL)) {
        return alert('O link do vídeo deve ser do YouTube ou Google Drive.');
    }

    if (githubURL && !isValidGithubLink(githubURL)) {
        return alert('O link do GitHub deve apontar para um repositório. Ex: https://github.com/usuario/repositorio');
    }

    try {
        validateLessonPdf(lessonPdfFile);
    } catch (e) {
        return alert(e.message);
    }

    const mainFile = isBipesProject ? null : mainFileInput.files[0];
    const libFiles = isBipesProject ? [] : Array.from(librariesInput.files || []);
    let blockXmlContent = '';

    if (!isBipesProject) {
        if (!isSafePythonFilename(mainFile.name)) {
            return alert('O arquivo principal deve usar apenas letras, números, _ ou - e terminar em .py');
        }
        try {
            validateFileSize(mainFile, LIMITS.MAIN_FILE_MAX_KB);
        } catch (e) {
            return alert(e.message);
        }

        if (libFiles.length > LIMITS.MAX_LIBRARIES) {
            return alert(`Máximo de ${LIMITS.MAX_LIBRARIES} bibliotecas.`);
        }
        for (const file of libFiles) {
            if (!isSafePythonFilename(file.name)) {
                return alert(`${file.name} possui um nome inválido. Use apenas letras, números, _ ou - e termine em .py`);
            }
            try {
                validateFileSize(file, LIMITS.LIB_FILE_MAX_KB);
            } catch (e) {
                return alert(e.message);
            }
        }
    } else {
        try {
            blockXmlContent = await readFileAsText(blockXmlFile);
            validateBlockXml(blockXmlFile, blockXmlContent);
        } catch (e) {
            return alert(e.message);
        }
    }

    let userData = null;
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        userData = userDoc.data();
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        return alert('Erro ao carregar seu perfil. Tente novamente.');
    }

    if (!userData) {
        return alert('Complete seu perfil antes de publicar projetos.');
    }
    if (!isProfileComplete(userData)) {
        setProfileCompletionState(false, false);
        alert('Complete seu perfil antes de publicar projetos.');
        openProfileModal(user, { required: true, profileData: userData });
        return;
    }

    if ((userData.projectCount || 0) >= LIMITS.MAX_PROJECTS_PER_USER) {
        return alert(`Limite de ${LIMITS.MAX_PROJECTS_PER_USER} projetos por usuário atingido.`);
    }

    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    publishBtn.disabled = true;
    progressBar.style.display = 'block';

    let currentStep = 'iniciar publicação';
    let coverUpload = null;
    let projectImageUpload = null;
    let lessonUpload = null;
    let blockUpload = null;
    let projectSaved = false;
    let counterUpdated = false;
    let projectId = null;

    try {
        // Lê os arquivos MicroPython quando esse for o tipo selecionado
        progressFill.style.width = '20%';
        progressText.textContent = isBipesProject ? 'Preparando XML do BIPES BitDogLab...' : 'Lendo Main.py...';
        const mainContent = isBipesProject ? '' : await readFileAsText(mainFile);

        // Lê bibliotecas
        const libraries = [];
        for (let i = 0; i < libFiles.length; i++) {
            progressFill.style.width = `${20 + (i / libFiles.length) * 40}%`;
            progressText.textContent = `Lendo ${libFiles[i].name}...`;
            const content = await readFileAsText(libFiles[i]);
            libraries.push({ name: libFiles[i].name, content: content });
        }

        // Prepara para salvar projeto
        progressFill.style.width = '70%';
        progressText.textContent = 'Salvando projeto...';

        // Reserva ID do projeto e envia capa, se houver
        projectId = await getAvailableProjectId(user.uid);
        const projectRef = db.collection('projects').doc(projectId);
        const userRef = db.collection('users').doc(user.uid);
        currentStep = 'reservar projeto no Firestore';
        await projectRef.set({
            title: title,
            description: description,
            materials: materials,
            videoURL: videoURL,
            githubURL: githubURL,
            projectType: projectType,
            imageURL: '',
            imagePath: '',
            imageMeta: null,
            projectImageURL: '',
            projectImagePath: '',
            projectImageMeta: null,
            lessonPdfURL: '',
            lessonPdfPath: '',
            lessonPdfMeta: null,
            authorId: user.uid,
            authorName: userData.name || user.displayName,
            authorPhoto: userData.photoURL || user.photoURL || '',
            mainFile: isBipesProject ? null : { name: mainFile.name, content: mainContent },
            libraries: libraries,
            blockFileURL: '',
            blockFilePath: '',
            blockFileMeta: null,
            boardVersions: isBipesProject ? boardVersions : [],
            bipesMode: isBipesProject ? bipesMode : '',
            difficulty: isBipesProject ? difficulty : '',
            observations: isBipesProject ? observations : '',
            allowRemix: isBipesProject && allowRemix,
            pdfLinks: [],
            extraLinks: [],
            bnccCodes: bnccTagState.project.slice(),
            commentCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        projectSaved = true;

        // O contador nao pode impedir a criacao do projeto. O limite real
        // continua imposto pelos 20 IDs aceitos nas regras do Firestore.
        try {
            await userRef.update({
                projectCount: userData.projectCount + 1,
                projectMutationId: projectId,
                email: firebase.firestore.FieldValue.delete(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            counterUpdated = true;
        } catch (counterError) {
            console.warn('Projeto reservado; contador sera atualizado novamente ao finalizar:', counterError);
        }

        progressFill.style.width = '80%';
        progressText.textContent = 'Enviando arquivos...';
        currentStep = 'upload da imagem de capa';
        coverUpload = await uploadProjectCover(coverFile, user.uid, projectId);
        if (isBipesProject) {
            currentStep = 'upload da imagem do projeto';
            projectImageUpload = await uploadBipesProjectImage(bipesProjectImageFile, user.uid, projectId);
            currentStep = 'upload do XML do BIPES BitDogLab';
            blockUpload = await uploadBlockXml(blockXmlFile, blockXmlContent, user.uid, projectId);
        }
        currentStep = 'upload do PDF pedagógico';
        lessonUpload = await uploadLessonPdf(lessonPdfFile, user.uid, projectId);

        currentStep = 'finalizar projeto no Firestore';
        await projectRef.update({
            imageURL: coverUpload.imageURL,
            imagePath: coverUpload.imagePath,
            projectImageURL: projectImageUpload ? projectImageUpload.projectImageURL : '',
            projectImagePath: projectImageUpload ? projectImageUpload.projectImagePath : '',
            lessonPdfURL: lessonUpload.lessonPdfURL,
            lessonPdfPath: lessonUpload.lessonPdfPath,
            blockFileURL: blockUpload ? blockUpload.blockFileURL : '',
            blockFilePath: blockUpload ? blockUpload.blockFilePath : '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        progressFill.style.width = '100%';
        progressText.textContent = 'Projeto publicado!';

        setTimeout(() => {
            closeProjectModal();
            loadProjects();
        }, 1000);

    } catch (error) {
        if (coverUpload && coverUpload.imagePath) {
            await deleteProjectCover(coverUpload.imagePath);
        }
        if (projectImageUpload && projectImageUpload.projectImagePath) {
            await deleteBipesProjectImage(projectImageUpload.projectImagePath);
        }
        if (lessonUpload && lessonUpload.lessonPdfPath) {
            await deleteLessonPdf(lessonUpload.lessonPdfPath);
        }
        if (blockUpload && blockUpload.blockFilePath) {
            await deleteBlockXml(blockUpload.blockFilePath);
        }
        if (projectSaved && projectId) {
            try {
                await rollbackReservedProject(projectId, user.uid, counterUpdated);
            } catch (rollbackError) {
                console.error('Nao foi possivel desfazer a reserva do projeto:', rollbackError);
            }
        }

        console.error('Erro ao publicar:', error);
        var message = error && error.message ? error.message : 'Erro desconhecido.';
        if (error && error.code === 'permission-denied') {
            message = 'Permissão negada pelo Firebase durante: ' + (typeof currentStep !== 'undefined' ? currentStep : 'publicação') + '.';
        } else if (error && error.code && error.code.indexOf('storage/') === 0) {
            message = 'Erro no Storage durante ' + (typeof currentStep !== 'undefined' ? currentStep : 'upload') + ': ' + message;
        }
        alert('Erro ao publicar projeto: ' + message);
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
        _bnccSelectedIndex = -1;
        const query = this.value.trim();
        showBnccSuggestions(prefix, query);
    });

    input.addEventListener('focus', function() {
        _bnccSelectedIndex = -1;
        showBnccSuggestions(prefix, this.value.trim());
    });

    input.addEventListener('keydown', function(e) {
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
        showBnccSuggestions(prefix, input.value.trim());
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
    const results = searchBnccCodes(query || '').filter(function(r) {
        return !bnccTagState[prefix].includes(r.code);
    });

    if (results.length === 0) {
        var looksLikeCode = /^[A-Za-z]{2}\d{2}CO\d{2}$/i.test(query);
        if (looksLikeCode) {
            suggestions.innerHTML = '<div class="bncc-error-msg">Código "' + escapeHtml(query.toUpperCase()) + '" não encontrado na BNCC de Computação.</div>';
        } else {
            suggestions.innerHTML = '<div class="bncc-error-msg">Nenhum resultado para "' + escapeHtml(query) + '".</div>';
        }
        suggestions.classList.add('active');
        return;
    }

    var html = '';
    for (var i = 0; i < results.length; i++) {
        html += '<div class="bncc-suggestion-item" data-code="' + escapeHtml(results[i].code) + '">'
            + '<span class="suggestion-code">' + escapeHtml(results[i].code) + '</span>'
            + '<span class="suggestion-content">'
            + '<span class="suggestion-desc">' + escapeHtml(results[i].description) + '</span>'
            + '<span class="suggestion-level">' + escapeHtml(results[i].level) + '</span>'
            + '</span>'
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
    _bnccSelectedIndex = -1;
    input.focus();
    showBnccSuggestions(prefix, '');
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
        tag.appendChild(document.createTextNode(code + ' '));

        var remove = document.createElement('span');
        remove.className = 'material-icons tag-remove';
        remove.setAttribute('data-remove', prefix + '|' + code);
        remove.textContent = 'close';
        tag.appendChild(remove);

        container.insertBefore(tag, input);
    }
}

// ==========================================
// Event Listeners
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // Modal de Novo Projeto
    const addProjectBtn = document.getElementById('addProjectBtn');
    const projectModalClose = document.querySelector('#projectModal .modal-close');
    const publishBtn = document.getElementById('publishBtn');
    
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', openProjectModal);
    }
    
    if (projectModalClose) {
        projectModalClose.addEventListener('click', closeProjectModal);
    }
    
    if (publishBtn) {
        publishBtn.addEventListener('click', publishProject);
    }

    document.querySelectorAll('input[name="projectType"]').forEach(input => {
        input.addEventListener('change', updateProjectTypeFields);
    });
    
    // Modal de Edição de Projeto
    const editProjectModalClose = document.querySelector('#editProjectModal .modal-close');
    const saveEditBtn = document.getElementById('saveEditBtn');
    
    if (editProjectModalClose) {
        editProjectModalClose.addEventListener('click', closeEditProjectModal);
    }
    
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', saveProjectEdit);
    }
    
    // Modal de Preview de Código
    const codePreviewModalClose = document.querySelector('#codePreviewModal .modal-close');
    
    if (codePreviewModalClose) {
        codePreviewModalClose.addEventListener('click', closeCodePreview);
    }
    
    // Delegação de evento para remover tags BNCC
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('tag-remove') || (e.target.parentElement && e.target.parentElement.classList.contains('tag-remove'))) {
            var span = e.target.classList.contains('tag-remove') ? e.target : e.target.parentElement;
            var data = span.getAttribute('data-remove');
            if (data) {
                var parts = data.split('|');
                removeBnccTag(parts[0], parts[1]);
            }
        }
    });
    
    // Barra de busca
    const searchClear = document.querySelector('.search-clear');
    const searchInput = document.getElementById('searchInput');
    
    if (searchClear && searchInput) {
        searchClear.addEventListener('click', function() {
            searchInput.value = '';
            searchClear.style.display = 'none';
            if (typeof clearSearch === 'function') {
                clearSearch();
            }
        });
        
        searchInput.addEventListener('input', function() {
            if (this.value) {
                searchClear.style.display = 'flex';
            } else {
                searchClear.style.display = 'none';
            }
        });
    }
});
