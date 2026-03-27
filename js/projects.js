/**
 * Projects - Upload e gerenciamento de projetos
 * Comunidade BitDogLab
 */

// Abre modal de novo projeto
function openProjectModal() {
    const user = auth.currentUser;
    if (!user) {
        alert('Faça login para publicar um projeto.');
        return;
    }
    document.getElementById('projectModal').classList.add('active');
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
    document.getElementById('projectPdfs').value = '';
    document.getElementById('projectExtras').value = '';
    document.getElementById('uploadProgress').style.display = 'none';
}

// Upload de arquivo para Firebase Storage
async function uploadFile(file, path) {
    const ref = storage.ref().child(path);
    const snapshot = await ref.put(file);
    return await snapshot.ref.getDownloadURL();
}

// Upload de múltiplos arquivos
async function uploadMultipleFiles(files, basePath) {
    const urls = [];
    for (const file of files) {
        const url = await uploadFile(file, `${basePath}/${file.name}`);
        urls.push({ name: file.name, url: url });
    }
    return urls;
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
    const pdfsInput = document.getElementById('projectPdfs');
    const extrasInput = document.getElementById('projectExtras');

    // Validação
    if (!title) return alert('Preencha o nome do projeto.');
    if (!description) return alert('Preencha a descrição.');
    if (!videoURL) return alert('Coloque o link do vídeo.');
    if (!mainFileInput.files[0]) return alert('Envie o arquivo Main.py.');
    if (!pdfsInput.files.length) return alert('Envie pelo menos um PDF.');

    // Validação de URL do vídeo
    if (!videoURL.includes('youtube') && !videoURL.includes('youtu.be') && !videoURL.includes('drive.google')) {
        return alert('O link do vídeo deve ser do YouTube ou Google Drive.');
    }

    const publishBtn = document.getElementById('publishBtn');
    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    publishBtn.disabled = true;
    progressBar.style.display = 'block';

    try {
        const projectId = db.collection('projects').doc().id;
        const basePath = `projects/${projectId}`;
        let step = 0;
        const totalSteps = 1 + (librariesInput.files.length || 0) + pdfsInput.files.length + (extrasInput.files.length || 0);

        function updateProgress(message) {
            step++;
            const percent = Math.round((step / totalSteps) * 100);
            progressFill.style.width = percent + '%';
            progressText.textContent = message;
        }

        // Upload Main.py
        updateProgress('Enviando Main.py...');
        const mainURL = await uploadFile(mainFileInput.files[0], `${basePath}/main.py`);

        // Upload bibliotecas
        const libraries = [];
        for (const file of librariesInput.files) {
            updateProgress(`Enviando ${file.name}...`);
            const url = await uploadFile(file, `${basePath}/libs/${file.name}`);
            libraries.push({ name: file.name, url: url });
        }

        // Upload PDFs
        const pdfs = [];
        for (const file of pdfsInput.files) {
            updateProgress(`Enviando ${file.name}...`);
            const url = await uploadFile(file, `${basePath}/pdfs/${file.name}`);
            pdfs.push({ name: file.name, url: url });
        }

        // Upload extras
        const extras = [];
        for (const file of extrasInput.files) {
            updateProgress(`Enviando ${file.name}...`);
            const url = await uploadFile(file, `${basePath}/extras/${file.name}`);
            extras.push({ name: file.name, url: url });
        }

        // Busca dados do perfil do autor
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        // Salva projeto no Firestore
        progressText.textContent = 'Salvando projeto...';
        await db.collection('projects').doc(projectId).set({
            title: title,
            description: description,
            videoURL: videoURL,
            authorId: user.uid,
            authorName: userData.name || user.displayName,
            authorPhoto: userData.photoURL || user.photoURL || '',
            mainFile: mainURL,
            libraries: libraries,
            pdfs: pdfs,
            extras: extras,
            commentCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Incrementa contador de projetos do autor
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
