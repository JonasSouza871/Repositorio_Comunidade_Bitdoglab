/**
 * Contributors - Página de contribuidores da comunidade
 * Comunidade BitDogLab
 */

// Carrega contribuidores ordenados por quantidade de projetos
async function loadContributors() {
    var grid = document.getElementById('contributorsGrid');

    try {
        var snapshot = await db.collection('users')
            .orderBy('projectCount', 'desc')
            .get();

        if (snapshot.empty) {
            grid.innerHTML = '<p class="empty-message">Nenhum contribuidor ainda.</p>';
            return;
        }

        grid.innerHTML = '';
        var rank = 1;

        snapshot.forEach(function(doc) {
            var userData = doc.data();
            if ((userData.projectCount || 0) > 0) {
                var card = createContributorCard(doc.id, userData, rank);
                grid.appendChild(card);
                loadContributorProjects(doc.id);
                rank++;
            }
        });

        if (rank === 1) {
            grid.innerHTML = '<p class="empty-message">Nenhum contribuidor com projetos publicados.</p>';
        }

    } catch (error) {
        console.error('Erro ao carregar contribuidores:', error);
        grid.innerHTML = '<p class="empty-message">Erro ao carregar contribuidores.</p>';
    }
}

// Cria card de um contribuidor
function createContributorCard(userId, userData, rank) {
    var card = document.createElement('div');
    card.className = 'contributor-card';
    card.id = 'contributor-' + userId;

    var isOwner = auth.currentUser && auth.currentUser.uid === userId;
    var rankClass = rank <= 3 ? 'rank-' + rank : '';
    var rankIcon = '';
    if (rank === 1) rankIcon = '🥇';
    else if (rank === 2) rankIcon = '🥈';
    else if (rank === 3) rankIcon = '🥉';
    else rankIcon = '#' + rank;

    card.innerHTML =
        '<div class="contributor-rank ' + rankClass + '">' + rankIcon + '</div>' +
        '<div class="contributor-profile">' +
            '<img src="' + (userData.photoURL || '') + '" class="contributor-avatar" alt="' + escapeHtml(userData.name) + '" onerror="this.style.display=\'none\'">' +
            '<div class="contributor-info">' +
                '<h3 class="contributor-name">' + escapeHtml(userData.name) + '</h3>' +
                '<div class="contributor-stats">' +
                    '<span class="material-icons">folder</span>' +
                    '<span>' + (userData.projectCount || 0) + ' projeto' + ((userData.projectCount || 0) !== 1 ? 's' : '') + '</span>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="contributor-bio-section">' +
            '<div class="contributor-bio-wrapper" id="bio-wrapper-' + userId + '">' +
                '<p class="contributor-bio" id="bio-' + userId + '">' + escapeHtml(userData.bio || 'Sem bio ainda.') + '</p>' +
                (isOwner ? '<button class="btn-edit-bio" onclick="enableBioEdit(\'' + userId + '\')" title="Editar bio">' +
                    '<span class="material-icons">edit</span>' +
                '</button>' : '') +
            '</div>' +
        '</div>' +
        '<div class="contributor-socials" id="socials-wrapper-' + userId + '">' +
            renderSocialLinks(userId, userData, isOwner) +
        '</div>' +
        '<div class="contributor-projects-section">' +
            '<h4 class="contributor-projects-title"><span class="material-icons">code</span> Projetos</h4>' +
            '<div class="contributor-projects" id="projects-' + userId + '">' +
                '<p class="loading-text">Carregando...</p>' +
            '</div>' +
        '</div>';

    return card;
}

// Carrega projetos de um contribuidor
async function loadContributorProjects(userId) {
    var container = document.getElementById('projects-' + userId);

    try {
        var snapshot = await db.collection('projects')
            .where('authorId', '==', userId)
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message-small">Sem projetos publicados.</p>';
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(function(doc) {
            var project = doc.data();
            var item = document.createElement('div');
            item.className = 'contributor-project-item';
            item.onclick = function() { openProjectDetail(doc.id); };
            item.innerHTML =
                '<span class="material-icons">description</span>' +
                '<span class="contributor-project-title">' + escapeHtml(project.title) + '</span>';
            container.appendChild(item);
        });

    } catch (error) {
        console.error('Erro ao carregar projetos do contribuidor:', error);
        container.innerHTML = '<p class="empty-message-small">Erro ao carregar projetos.</p>';
    }
}

// Ativa edição de bio
function enableBioEdit(userId) {
    var wrapper = document.getElementById('bio-wrapper-' + userId);
    var bioEl = document.getElementById('bio-' + userId);
    var currentBio = bioEl.textContent;
    if (currentBio === 'Sem bio ainda.') currentBio = '';

    wrapper.innerHTML =
        '<textarea class="bio-edit-input" id="bioEdit-' + userId + '" maxlength="200" rows="2" placeholder="Conte um pouco sobre você...">' + escapeHtml(currentBio) + '</textarea>' +
        '<div class="bio-edit-actions">' +
            '<button class="btn btn-small btn-save" onclick="saveBioEdit(\'' + userId + '\')">Salvar</button>' +
            '<button class="btn btn-small" onclick="loadContributors()">Cancelar</button>' +
        '</div>';

    document.getElementById('bioEdit-' + userId).focus();
}

// Salva bio editada
async function saveBioEdit(userId) {
    var textarea = document.getElementById('bioEdit-' + userId);
    var newBio = textarea.value.trim();

    if (newBio.length > 200) {
        alert('Bio muito longa. Máximo: 200 caracteres.');
        return;
    }

    try {
        await db.collection('users').doc(userId).update({
            bio: newBio,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadContributors();
    } catch (error) {
        console.error('Erro ao salvar bio:', error);
        alert('Erro ao salvar. Tente novamente.');
    }
}

// ============================================
// Social Links (LinkedIn + GitHub)
// ============================================

function renderSocialLinks(userId, userData, isOwner) {
    var linkedin = userData.linkedin || '';
    var github = userData.github || '';
    var hasLinks = linkedin || github;

    var html = '<div class="social-links">';

    if (linkedin) {
        html += '<a href="' + escapeHtml(linkedin) + '" target="_blank" rel="noopener" class="social-link social-linkedin">' +
            '<svg viewBox="0 0 24 24" class="social-icon"><path fill="currentColor" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>' +
            'LinkedIn</a>';
    }

    if (github) {
        html += '<a href="' + escapeHtml(github) + '" target="_blank" rel="noopener" class="social-link social-github">' +
            '<svg viewBox="0 0 24 24" class="social-icon"><path fill="currentColor" d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>' +
            'GitHub</a>';
    }

    html += '</div>';

    if (isOwner) {
        html += '<button class="btn-edit-socials" onclick="enableSocialsEdit(\'' + userId + '\')" title="Editar links">' +
            '<span class="material-icons">edit</span>' +
        '</button>';
    }

    if (!hasLinks && !isOwner) {
        return '';
    }

    return html;
}

function enableSocialsEdit(userId) {
    var wrapper = document.getElementById('socials-wrapper-' + userId);

    // Busca dados atuais do Firestore
    db.collection('users').doc(userId).get().then(function(doc) {
        var data = doc.data() || {};

        wrapper.innerHTML =
            '<div class="socials-edit-form">' +
                '<div class="social-edit-row">' +
                    '<svg viewBox="0 0 24 24" class="social-icon social-icon-edit"><path fill="currentColor" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>' +
                    '<input type="url" class="social-edit-input" id="linkedinEdit-' + userId + '" placeholder="https://linkedin.com/in/seu-perfil" value="' + escapeHtml(data.linkedin || '') + '">' +
                '</div>' +
                '<div class="social-edit-row">' +
                    '<svg viewBox="0 0 24 24" class="social-icon social-icon-edit"><path fill="currentColor" d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>' +
                    '<input type="url" class="social-edit-input" id="githubEdit-' + userId + '" placeholder="https://github.com/seu-usuario" value="' + escapeHtml(data.github || '') + '">' +
                '</div>' +
                '<div class="bio-edit-actions">' +
                    '<button class="btn btn-small btn-save" onclick="saveSocialsEdit(\'' + userId + '\')">Salvar</button>' +
                    '<button class="btn btn-small" onclick="loadContributors()">Cancelar</button>' +
                '</div>' +
            '</div>';
    });
}

async function saveSocialsEdit(userId) {
    var linkedin = document.getElementById('linkedinEdit-' + userId).value.trim();
    var github = document.getElementById('githubEdit-' + userId).value.trim();

    // Validação básica
    if (linkedin && !linkedin.includes('linkedin.com')) {
        alert('Link do LinkedIn inválido.');
        return;
    }
    if (github && !github.includes('github.com')) {
        alert('Link do GitHub inválido.');
        return;
    }

    try {
        await db.collection('users').doc(userId).update({
            linkedin: linkedin,
            github: github,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadContributors();
    } catch (error) {
        console.error('Erro ao salvar links:', error);
        alert('Erro ao salvar. Tente novamente.');
    }
}

// Carrega ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    loadContributors();
});
