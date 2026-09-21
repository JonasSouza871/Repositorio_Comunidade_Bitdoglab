/**
 * Home - Carrega e renderiza grid de projetos
 * Comunidade BitDogLab
 */

const PROJECT_CATEGORIES = {
    MICROPYTHON: 'micropython',
    BLOCKS: 'bipes-bitdoglab'
};

let activeProjectCategory = PROJECT_CATEGORIES.MICROPYTHON;
let homeProjectsCache = [];

function getProjectCategory(project) {
    return project && project.projectType === PROJECT_CATEGORIES.BLOCKS
        ? PROJECT_CATEGORIES.BLOCKS
        : PROJECT_CATEGORIES.MICROPYTHON;
}

function updateProjectCategoryTabs(searchMode = false) {
    const tabs = document.getElementById('projectCategoryTabs');
    if (!tabs) return;

    tabs.classList.toggle('search-mode', searchMode);
    tabs.querySelectorAll('[data-project-category]').forEach(tab => {
        const isActive = !searchMode && tab.dataset.projectCategory === activeProjectCategory;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
    });
}

function renderActiveProjectCategory() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    const projects = homeProjectsCache.filter(project => getProjectCategory(project) === activeProjectCategory);
    grid.innerHTML = '';

    if (projects.length === 0) {
        const categoryLabel = activeProjectCategory === PROJECT_CATEGORIES.BLOCKS ? 'em blocos' : 'MicroPython';
        grid.innerHTML = `<p class="empty-message">Nenhum projeto ${categoryLabel} publicado ainda.</p>`;
        return;
    }

    projects.forEach(project => {
        grid.appendChild(createProjectCard(project.id, project));
    });
}

function selectProjectCategory(category) {
    if (!Object.values(PROJECT_CATEGORIES).includes(category)) return;
    activeProjectCategory = category;
    updateProjectCategoryTabs(false);

    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim() && typeof clearSearch === 'function') {
        clearSearch();
        return;
    }

    renderActiveProjectCategory();
}

function initProjectCategoryTabs() {
    const tabs = document.getElementById('projectCategoryTabs');
    if (!tabs) return;

    tabs.addEventListener('click', event => {
        const tab = event.target.closest('[data-project-category]');
        if (tab) selectProjectCategory(tab.dataset.projectCategory);
    });
    updateProjectCategoryTabs(false);
}

// Carrega todos os projetos do Firestore e exibe a categoria selecionada
async function loadProjects() {
    const grid = document.getElementById('projectsGrid');

    try {
        const snapshot = await db.collection('projects')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        if (snapshot.empty) {
            homeProjectsCache = [];
            grid.innerHTML = '<p class="empty-message">Nenhum projeto ainda. Seja o primeiro a publicar!</p>';
            return;
        }

        homeProjectsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateProjectCategoryTabs(false);
        renderActiveProjectCategory();

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
    const typeBadge = getProjectCategory(project) === PROJECT_CATEGORIES.BLOCKS
        ? '<span class="project-type-badge project-type-badge-blocks"><span class="material-icons">extension</span>Blocos</span>'
        : '<span class="project-type-badge project-type-badge-micropython"><span class="material-icons">code</span>MicroPython</span>';
    
    // Sempre mostra o placeholder por baixo, imagem por cima
    const imageHtml = directImageUrl 
        ? `<div class="project-image-wrapper"><img src="${escapeHtml(directImageUrl)}" class="project-image" alt="${escapeHtml(project.title)}"><div class="project-image-placeholder" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:-1"><span class="material-icons">image</span></div></div>`
        : `<div class="project-image-placeholder"><span class="material-icons">image</span></div>`;

    // Tags BNCC
    const bnccHtml = (project.bnccCodes && project.bnccCodes.length > 0)
        ? `<div class="project-card-tags">${project.bnccCodes.slice(0, 4).map(code =>
            `<span class="bncc-tag" data-bncc="${escapeHtml(code)}">${escapeHtml(code)}</span>`
          ).join('')}${project.bnccCodes.length > 4 ? `<span class="bncc-tag">+${project.bnccCodes.length - 4}</span>` : ''}</div>`
        : '';

    card.innerHTML = `
        ${imageHtml}
        ${typeBadge}
        <h3 class="project-card-title">${escapeHtml(project.title)}</h3>
        ${bnccHtml}
        <p class="project-card-desc">${escapeHtml(project.description)}</p>
        <div class="project-card-footer">
            <div class="project-card-author">
                <img src="${escapeHtml(authorPhoto)}" alt="">
                <span>${escapeHtml(project.authorName)}</span>
            </div>
            <span class="project-card-date">${date}</span>
        </div>
    `;

    return card;
}

// Carrega projetos ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    initProjectCategoryTabs();
    loadProjects();
});

window.updateProjectCategoryTabs = updateProjectCategoryTabs;
