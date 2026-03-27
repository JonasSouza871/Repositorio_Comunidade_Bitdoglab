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

// Cria card de projeto
function createProjectCard(id, project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.onclick = () => openProjectDetail(id);

    const date = project.createdAt ? project.createdAt.toDate().toLocaleDateString('pt-BR') : '';

    card.innerHTML = `
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
