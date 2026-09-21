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
            .limit(50)
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

// Cria card de projeto
function createProjectCard(id, project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.addEventListener('click', () => openProjectDetail(id));

    const date = project.createdAt ? project.createdAt.toDate().toLocaleDateString('pt-BR') : '';
    const directImageUrl = getDirectImageUrl(project.imageURL);
    const authorPhoto = sanitizeHttpUrl(project.authorPhoto || '');
    
    // Sempre mostra o placeholder por baixo, imagem por cima
    const imageHtml = directImageUrl 
        ? `<div class="project-image-wrapper"><img src="${escapeHtml(directImageUrl)}" class="project-image" alt="${escapeHtml(project.title)}" onerror="this.style.display='none'"><div class="project-image-placeholder" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:-1"><span class="material-icons">image</span></div></div>`
        : `<div class="project-image-placeholder"><span class="material-icons">image</span></div>`;

    // Tags BNCC
    const bnccHtml = (project.bnccCodes && project.bnccCodes.length > 0)
        ? `<div class="project-card-tags">${project.bnccCodes.slice(0, 4).map(code =>
            `<span class="bncc-tag" data-bncc="${escapeHtml(code)}">${escapeHtml(code)}</span>`
          ).join('')}${project.bnccCodes.length > 4 ? `<span class="bncc-tag">+${project.bnccCodes.length - 4}</span>` : ''}</div>`
        : '';

    card.innerHTML = `
        ${imageHtml}
        <h3 class="project-card-title">${escapeHtml(project.title)}</h3>
        ${bnccHtml}
        <p class="project-card-desc">${escapeHtml(project.description)}</p>
        <div class="project-card-footer">
            <div class="project-card-author">
                <img src="${escapeHtml(authorPhoto)}" alt="" onerror="this.style.display='none'">
                <span>${escapeHtml(project.authorName)}</span>
            </div>
            <span class="project-card-date">${date}</span>
        </div>
    `;

    return card;
}

// Carrega projetos ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
});
