/**
 * Home - Carrega e renderiza grid de projetos
 * Comunidade BitDogLab
 */

// Carrega todos os projetos do Firestore
async function loadProjects() {
    const grid = document.getElementById('projectsGrid');

    try {
        const snapshot = await db.collection('projects')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            grid.innerHTML = '<p class="empty-message">Nenhum projeto ainda. Seja o primeiro a publicar!</p>';
            return;
        }

        grid.innerHTML = '';

        snapshot.forEach(doc => {
            const project = doc.data();
            const card = createProjectCard(doc.id, project);
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Erro ao carregar projetos:', error);
        grid.innerHTML = '<p class="empty-message">Erro ao carregar projetos.</p>';
    }
}

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

// Cria card de projeto
function createProjectCard(id, project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.onclick = () => openProjectDetail(id);

    const date = project.createdAt ? project.createdAt.toDate().toLocaleDateString('pt-BR') : '';
    const directImageUrl = getDirectImageUrl(project.imageURL);
    
    // Sempre mostra o placeholder por baixo, imagem por cima
    const imageHtml = directImageUrl 
        ? `<div class="project-image-wrapper"><img src="${directImageUrl}" class="project-image" alt="${escapeHtml(project.title)}" onerror="this.style.display='none'"><div class="project-image-placeholder" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:-1"><span class="material-icons">image</span></div></div>`
        : `<div class="project-image-placeholder"><span class="material-icons">image</span></div>`;

    card.innerHTML = `
        ${imageHtml}
        <h3 class="project-card-title">${escapeHtml(project.title)}</h3>
        <p class="project-card-desc">${escapeHtml(project.description)}</p>
        <div class="project-card-footer">
            <div class="project-card-author">
                <img src="${project.authorPhoto || ''}" alt="" onerror="this.style.display='none'">
                <span>${escapeHtml(project.authorName)}</span>
            </div>
            <span class="project-card-date">${date}</span>
        </div>
    `;

    return card;
}

// Abre detalhes do projeto
function openProjectDetail(projectId) {
    // TODO: Fase 5 - página de detalhes
    console.log('Abrir projeto:', projectId);
}

// Escape HTML para prevenir XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Carrega projetos ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
});
