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
let searchRequestId = 0;
let isSearchActive = false;

/**
 * Inicializa o sistema de busca
 */
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const projectsGrid = document.getElementById('projectsGrid');

    if (!searchInput) return;

    if (projectsGrid) {
        projectsGrid.addEventListener('click', (e) => {
            if (e.target.closest('[data-search-action="clear"]')) {
                clearSearch();
            }
        });
    }
    
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
 * Realiza a busca por título ou código BNCC
 */
async function performSearch(query) {
    query = (query || '').trim();
    if (query.length < SEARCH_CONFIG.minChars) {
        clearSearchResults();
        return;
    }

    const requestId = ++searchRequestId;
    const normalizedQuery = normalizeText(query);
    const normalizedCodeQuery = normalizeBnccQuery(query);
    const isExactBNCCCode = /^[A-Z]{2}\d{2}CO\d{2}$/.test(normalizedCodeQuery);
    const looksLikeBNCC = /^(EI|EF|EM)\d{0,2}(CO\d{0,2})?$/.test(normalizedCodeQuery);
    let results = [];

    try {
        if (isExactBNCCCode) {
            results = await searchByExactBnccCode(normalizedCodeQuery);
        } else {
            await refreshProjectsCache();
            results = filterProjectsFromCache(normalizedQuery, normalizedCodeQuery);
        }
    } catch (error) {
        console.error('Erro ao buscar projetos:', error);
        results = filterProjectsFromCache(normalizedQuery, normalizedCodeQuery);
    }

    if (requestId !== searchRequestId) return;
    displaySearchResults(results, query, looksLikeBNCC || isExactBNCCCode);
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

function normalizeBnccQuery(text) {
    return (text || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
}

async function refreshProjectsCache() {
    const snapshot = await db.collection('projects')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

    projectsCache = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

async function searchByExactBnccCode(code) {
    try {
        const snapshot = await db.collection('projects')
            .where('bnccCodes', 'array-contains', code)
            .limit(50)
            .get();

        const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort(sortProjectsByDateDesc);

        if (results.length === 0) {
            await refreshProjectsCache();
            return filterProjectsFromCache('', code).filter(project => {
                return getProjectBnccCodes(project).some(projectCode => projectCode === code);
            });
        }

        projectsCache = mergeProjectsCache(projectsCache, results);
        return results;
    } catch (error) {
        await refreshProjectsCache();
        return filterProjectsFromCache('', code).filter(project => {
            return getProjectBnccCodes(project).some(projectCode => projectCode === code);
        });
    }
}

function mergeProjectsCache(current, incoming) {
    const map = new Map();
    current.concat(incoming).forEach(project => {
        if (project && project.id) map.set(project.id, project);
    });
    return Array.from(map.values());
}

function getProjectBnccCodes(project) {
    if (!project || !Array.isArray(project.bnccCodes)) return [];
    return project.bnccCodes
        .filter(Boolean)
        .map(code => normalizeBnccQuery(String(code)));
}

function filterProjectsFromCache(normalizedTextQuery, normalizedCodeQuery) {
    return projectsCache.filter(project => {
        const title = normalizeText(project.title || '');
        const description = normalizeText(project.description || '');
        const authorName = normalizeText(project.authorName || '');
        const bnccCodes = getProjectBnccCodes(project);

        const matchesText = normalizedTextQuery
            && (title.includes(normalizedTextQuery)
                || description.includes(normalizedTextQuery)
                || authorName.includes(normalizedTextQuery));

        const matchesBncc = normalizedCodeQuery
            && bnccCodes.some(code => code.includes(normalizedCodeQuery));

        return matchesText || matchesBncc;
    }).sort(sortProjectsByDateDesc);
}

function sortProjectsByDateDesc(a, b) {
    const aDate = a.createdAt && typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : 0;
    const bDate = b.createdAt && typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : 0;
    return bDate - aDate;
}

/**
 * Exibe resultados da busca
 */
function displaySearchResults(results, query, isBNCCCode) {
    const grid = document.getElementById('projectsGrid');
    const searchInfo = document.getElementById('searchInfo');
    isSearchActive = true;
    if (typeof updateProjectCategoryTabs === 'function') {
        updateProjectCategoryTabs(true);
    }
    
    // Limpa grid atual
    grid.innerHTML = '';
    
    // Atualiza info de busca
    if (searchInfo) {
        if (results.length === 0) {
            searchInfo.innerHTML = `<p class="search-empty">Nenhum projeto encontrado para "<strong>${escapeHtml(query)}</strong>"</p>`;
        } else {
            const typeLabel = isBNCCCode ? 'código/tag BNCC' : 'nome ou descrição';
            searchInfo.innerHTML = `<p class="search-info">${results.length} projeto(s) encontrado(s) em MicroPython e Blocos por ${typeLabel} "<strong>${escapeHtml(query)}</strong>"</p>`;
        }
    }
    
    // Renderiza resultados
    if (results.length === 0) {
        grid.innerHTML = `
            <div class="empty-search">
                <span class="material-icons">search_off</span>
                <p>Nenhum projeto encontrado</p>
                <button type="button" class="btn btn-small" data-search-action="clear">Limpar busca</button>
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
    searchRequestId++;
    isSearchActive = false;
    const searchInput = document.getElementById('searchInput');
    const searchInfo = document.getElementById('searchInfo');
    const searchClear = document.querySelector('.search-clear');

    if (searchInput) searchInput.value = '';
    if (searchInfo) searchInfo.innerHTML = '';
    if (searchClear) searchClear.style.display = 'none';
    if (typeof updateProjectCategoryTabs === 'function') {
        updateProjectCategoryTabs(false);
    }
    
    // Recarrega todos os projetos
    loadProjects();
}

/**
 * Limpa resultados da busca
 */
function clearSearchResults() {
    searchRequestId++;
    const searchInfo = document.getElementById('searchInfo');
    if (searchInfo) searchInfo.innerHTML = '';
    if (typeof updateProjectCategoryTabs === 'function') {
        updateProjectCategoryTabs(false);
    }

    if (isSearchActive) {
        isSearchActive = false;
        if (typeof updateProjectCategoryTabs === 'function') {
            updateProjectCategoryTabs(false);
        }
        loadProjects();
    }
}

// Inicializa ao carregar
document.addEventListener('DOMContentLoaded', initSearch);

// Expõe funções globais
window.clearSearch = clearSearch;
window.performSearch = performSearch;
