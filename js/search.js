/**
 * Search - Busca de projetos por título ou código BNCC
 * Comunidade BitDogLab
 */

// Configuração da busca
const SEARCH_CONFIG = {
    minChars: 2,
    debounceMs: 300
};

// Cache de projetos para busca rápida
let projectsCache = [];
let searchTimeout = null;

/**
 * Inicializa o sistema de busca
 */
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput) return;
    
    // Carrega cache inicial
    loadProjectsCache();
    
    // Listener com debounce
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < SEARCH_CONFIG.minChars) {
            clearSearchResults();
            return;
        }
        
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, SEARCH_CONFIG.debounceMs);
    });
    
    // Busca ao pressionar Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            performSearch(e.target.value.trim());
        }
    });
}

/**
 * Carrega projetos em cache para busca rápida
 */
async function loadProjectsCache() {
    try {
        const snapshot = await db.collection('projects').get();
        projectsCache = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Erro ao carregar cache:', error);
    }
}

/**
 * Realiza a busca por título ou código BNCC
 */
function performSearch(query) {
    const normalizedQuery = normalizeText(query);
    
    // Detecta se é código BNCC (formato: EFXXCXX ou EMIXCXX)
    const isBNCCCode = /^[A-Z]{2}\d{2}[A-Z]\d{2}$/i.test(query);
    
    let results = [];
    
    if (isBNCCCode) {
        // Busca exata por código BNCC
        results = projectsCache.filter(project => {
            if (!project.bnccCodes || !Array.isArray(project.bnccCodes)) return false;
            return project.bnccCodes.some(code => 
                code.toUpperCase() === query.toUpperCase()
            );
        });
    } else {
        // Busca por título (parcial)
        results = projectsCache.filter(project => {
            const title = normalizeText(project.title || '');
            const description = normalizeText(project.description || '');
            
            return title.includes(normalizedQuery) || 
                   description.includes(normalizedQuery);
        });
    }
    
    displaySearchResults(results, query, isBNCCCode);
}

/**
 * Normaliza texto para busca (remove acentos, lowercase)
 */
function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/**
 * Exibe resultados da busca
 */
function displaySearchResults(results, query, isBNCCCode) {
    const grid = document.getElementById('projectsGrid');
    const searchInfo = document.getElementById('searchInfo');
    
    // Limpa grid atual
    grid.innerHTML = '';
    
    // Atualiza info de busca
    if (searchInfo) {
        if (results.length === 0) {
            searchInfo.innerHTML = `<p class="search-empty">Nenhum projeto encontrado para "<strong>${escapeHtml(query)}</strong>"</p>`;
        } else {
            const typeLabel = isBNCCCode ? 'código BNCC' : 'título';
            searchInfo.innerHTML = `<p class="search-info">${results.length} projeto(s) encontrado(s) por ${typeLabel} "<strong>${escapeHtml(query)}</strong>"</p>`;
        }
    }
    
    // Renderiza resultados
    if (results.length === 0) {
        grid.innerHTML = `
            <div class="empty-search">
                <span class="material-icons">search_off</span>
                <p>Nenhum projeto encontrado</p>
                <button class="btn btn-small" onclick="clearSearch()">Limpar busca</button>
            </div>
        `;
        return;
    }
    
    results.forEach(project => {
        const card = createProjectCard(project.id, project);
        grid.appendChild(card);
    });
}

/**
 * Limpa resultados da busca e volta ao normal
 */
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchInfo = document.getElementById('searchInfo');
    
    if (searchInput) searchInput.value = '';
    if (searchInfo) searchInfo.innerHTML = '';
    
    // Recarrega todos os projetos
    loadProjects();
}

/**
 * Limpa resultados da busca
 */
function clearSearchResults() {
    const searchInfo = document.getElementById('searchInfo');
    if (searchInfo) searchInfo.innerHTML = '';
    loadProjects();
}

/**
 * Busca avançada com filtros múltiplos
 */
async function advancedSearch(filters) {
    let query = db.collection('projects');
    
    // Filtro por código BNCC
    if (filters.bnccCode) {
        query = query.where('bnccCodes', 'array-contains', filters.bnccCode.toUpperCase());
    }
    
    // Filtro por autor
    if (filters.author) {
        query = query.where('authorName', '==', filters.author);
    }
    
    // Ordenação
    query = query.orderBy('createdAt', 'desc');
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

// Inicializa ao carregar
document.addEventListener('DOMContentLoaded', initSearch);

// Expõe funções globais
window.clearSearch = clearSearch;
window.performSearch = performSearch;
