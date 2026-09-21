/**
 * Auth - Login com Google (Gmail)
 * Comunidade BitDogLab
 */

const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

const ADMIN_EMAILS = [
    'jonaseocara727@gmail.com',
    'bitdoglab@gmail.com'
];

window.currentUserIsAdmin = false;
window.currentUserProfileComplete = false;

async function refreshAdminStatus(user) {
    if (!user) {
        window.currentUserIsAdmin = false;
        return false;
    }

    try {
        const tokenResult = await user.getIdTokenResult(true);
        const email = (tokenResult.claims.email || user.email || '').toLowerCase();
        window.currentUserIsAdmin = tokenResult.claims.admin === true || ADMIN_EMAILS.includes(email);
        return window.currentUserIsAdmin;
    } catch (error) {
        console.error('Erro ao verificar permissões de administrador:', error);
        window.currentUserIsAdmin = false;
        return false;
    }
}

// Login com Google usando POPUP (mais confiável que redirect)
async function loginWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        return result.user;
    } catch (error) {
        console.error('Erro no login:', error.code, error.message);
        
        // Códigos de erro comuns
        if (error.code === 'auth/popup-blocked') {
            alert('Popup bloqueado! Permita popups para este site e tente novamente.');
        } else if (error.code === 'auth/popup-closed-by-user') {
            // Usuário fechou o popup, não faz nada
            return null;
        } else if (error.code === 'auth/unauthorized-domain') {
            alert('Domínio não autorizado. Contate o administrador.');
        } else if (error.code === 'auth/requests-from-referer-http://127.0.0.1:5500-are-blocked' || 
                   error.code === 'auth/requests-from-referer-http://localhost:5500-are-blocked') {
            alert('API Key bloqueada para este domínio. Configure no Google Cloud Console.');
        } else {
            alert('Erro ao fazer login: ' + error.message);
        }
        return null;
    }
}

// Logout
async function logout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Erro no logout:', error);
    }
}

// Listener de estado de autenticação
auth.onAuthStateChanged(async (user) => {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const addProjectBtn = document.getElementById('addProjectBtn');

    if (user) {
        await refreshAdminStatus(user);

        // Usuário logado
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = user.displayName || 'Usuário';
        userAvatar.src = user.photoURL || '';
        if (addProjectBtn) addProjectBtn.style.display = 'flex';

        // Verifica se o perfil existe e se está realmente completo.
        loadUserProfile(user).catch((err) => {
            console.error('Erro checkFirstLogin:', err);
        });
    } else {
        window.currentUserIsAdmin = false;
        window.currentUserProfileComplete = false;
        setProfileCompletionState(false, true);

        // Usuário deslogado
        loginBtn.style.display = 'flex';
        userInfo.style.display = 'none';
        if (addProjectBtn) addProjectBtn.style.display = 'none';
    }

    // Recarrega contribuidores pra atualizar botão de editar bio
    if (typeof loadContributors === 'function') {
        loadContributors();
    }
});

// ==========================================
// Event Listeners
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // Login/Logout
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', loginWithGoogle);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Perfil
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }

    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', async function() {
            const user = auth.currentUser;
            if (!user) return;
            const snapshot = await db.collection('users').doc(user.uid).get();
            openProfileModal(user, {
                required: !isProfileComplete(snapshot.exists ? snapshot.data() : null),
                profileData: snapshot.exists ? snapshot.data() : null
            });
        });
    }

    const profileAlertBtn = document.getElementById('profileAlertBtn');
    if (profileAlertBtn) {
        profileAlertBtn.addEventListener('click', async function() {
            const user = auth.currentUser;
            if (!user) return;
            const snapshot = await db.collection('users').doc(user.uid).get();
            openProfileModal(user, {
                required: true,
                profileData: snapshot.exists ? snapshot.data() : null
            });
        });
    }

    const closeProfileBtn = document.getElementById('closeProfileBtn');
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', closeProfileModal);
    }
});

function isProfileComplete(data) {
    return !!data
        && typeof data.name === 'string'
        && data.name.trim().length > 0
        && data.name.length <= 100
        && typeof data.bio === 'string'
        && data.bio.trim().length > 0
        && data.bio.length <= 200
        && typeof data.photoURL === 'string'
        && data.photoURL.length <= 1000
        && Number.isInteger(data.projectCount)
        && data.projectCount >= 0
        && data.projectCount <= 20
        && Number.isInteger(data.commentCount)
        && data.commentCount >= 0
        && data.commentCount <= 500
        && typeof data.projectMutationId === 'string'
        && data.projectMutationId.length <= 160
        && isValidLinkedinUrl(data.linkedin || '')
        && isValidProfileGithubUrl(data.github || '')
        && !!data.createdAt
        && !!data.updatedAt;
}

function setProfileCompletionState(isComplete, hideAlert) {
    window.currentUserProfileComplete = !!isComplete;
    const alert = document.getElementById('profileAlert');
    const editButton = document.getElementById('editProfileBtn');

    if (alert) {
        alert.style.display = hideAlert || isComplete ? 'none' : 'flex';
    }
    if (editButton) {
        editButton.classList.toggle('btn-profile-warning', !isComplete && !hideAlert);
        editButton.title = isComplete ? 'Editar perfil' : 'Complete seu perfil';
    }
}

async function loadUserProfile(user) {
    const snapshot = await db.collection('users').doc(user.uid).get();
    const profileData = snapshot.exists ? snapshot.data() : null;
    const complete = isProfileComplete(profileData);

    const userName = document.getElementById('userName');
    if (userName && profileData && profileData.name) {
        userName.textContent = profileData.name;
    }

    setProfileCompletionState(complete, false);
    if (!complete) {
        openProfileModal(user, {
            required: true,
            profileData: profileData
        });
        return;
    }

    await removeLegacyPublicEmail(user.uid);
}

async function removeLegacyPublicEmail(uid) {
    try {
        await db.collection('users').doc(uid).update({
            email: firebase.firestore.FieldValue.delete(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        if (error.code !== 'not-found' && error.code !== 'permission-denied') {
            console.warn('Não foi possível remover email legado do perfil:', error);
        }
    }
}

// Abre modal de cadastro ou edição de perfil
function openProfileModal(user, options) {
    options = options || {};
    const profileData = options.profileData || {};
    const required = options.required === true;
    const modal = document.getElementById('profileModal');
    const title = document.getElementById('profileModalTitle');
    const subtitle = document.getElementById('profileModalSubtitle');
    const notice = document.getElementById('profileModalNotice');
    const closeButton = document.getElementById('closeProfileBtn');
    const nameInput = document.getElementById('profileName');
    const bioInput = document.getElementById('profileBio');
    const linkedinInput = document.getElementById('profileLinkedin');
    const githubInput = document.getElementById('profileGithub');

    modal.dataset.required = required ? 'true' : 'false';
    title.textContent = required ? 'Complete seu perfil' : 'Editar perfil';
    subtitle.textContent = required
        ? 'Esses dados são necessários para publicar projetos na comunidade.'
        : 'Atualize seu nome, bio e links quando quiser.';
    notice.textContent = required
        ? 'Seu cadastro estava incompleto ou antigo. Complete os campos abaixo para liberar a publicação.'
        : '';
    notice.style.display = required ? 'block' : 'none';
    closeButton.style.display = required ? 'none' : 'inline-flex';

    nameInput.value = profileData.name || user.displayName || '';
    bioInput.value = profileData.bio || '';
    linkedinInput.value = isValidLinkedinUrl(profileData.linkedin || '') ? profileData.linkedin : '';
    githubInput.value = isValidProfileGithubUrl(profileData.github || '') ? profileData.github : '';
    modal.classList.add('active');
    nameInput.focus();
}

// Fecha modal de perfil
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal.dataset.required === 'true') return;
    modal.classList.remove('active');
}

function isValidLinkedinUrl(url) {
    return !url || /^https:\/\/(www\.)?linkedin\.com\/in\/[^/\s]+\/?$/.test(url);
}

function isValidProfileGithubUrl(url) {
    return !url || /^https:\/\/(www\.)?github\.com\/[^/\s]+\/?$/.test(url);
}

async function getProfileProjectCount(userId, profileData) {
    if (Number.isInteger(profileData.projectCount)
        && profileData.projectCount >= 0
        && profileData.projectCount <= 20) {
        return profileData.projectCount;
    }

    const snapshot = await db.collection('projects')
        .where('authorId', '==', userId)
        .limit(20)
        .get();
    return snapshot.size;
}

// Salva perfil no Firestore
async function saveProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const name = document.getElementById('profileName').value.trim();
    const bio = document.getElementById('profileBio').value.trim();
    const linkedin = document.getElementById('profileLinkedin').value.trim();
    const github = document.getElementById('profileGithub').value.trim();

    if (!name) {
        alert('Por favor, preencha seu nome.');
        return;
    }
    if (name.length > 100) {
        alert('Nome muito longo. Máximo: 100 caracteres.');
        return;
    }
    if (!bio) {
        alert('Por favor, escreva uma bio.');
        return;
    }
    if (bio.length > 200) {
        alert('Bio muito longa. Máximo: 200 caracteres.');
        return;
    }
    if (!isValidLinkedinUrl(linkedin)) {
        alert('Link do LinkedIn inválido.');
        return;
    }
    if (!isValidProfileGithubUrl(github)) {
        alert('Link do GitHub inválido.');
        return;
    }

    try {
        const profileRef = db.collection('users').doc(user.uid);
        const existingSnapshot = await profileRef.get();
        const existingData = existingSnapshot.exists ? (existingSnapshot.data() || {}) : {};

        if (existingSnapshot.exists && isProfileComplete(existingData)) {
            await profileRef.update({
                name: name,
                bio: bio,
                linkedin: linkedin,
                github: github,
                email: firebase.firestore.FieldValue.delete(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            const projectCount = await getProfileProjectCount(user.uid, existingData);
            const commentCount = Number.isInteger(existingData.commentCount)
                && existingData.commentCount >= 0
                && existingData.commentCount <= 500
                ? existingData.commentCount
                : 0;

            await profileRef.set({
                name: name,
                bio: bio,
                photoURL: user.photoURL || existingData.photoURL || '',
                projectCount: projectCount,
                projectMutationId: typeof existingData.projectMutationId === 'string'
                    ? existingData.projectMutationId
                    : '',
                commentCount: commentCount,
                createdAt: existingData.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                linkedin: linkedin,
                github: github
            });
        }

        setProfileCompletionState(true, false);
        document.getElementById('userName').textContent = name;
        document.getElementById('profileModal').dataset.required = 'false';
        closeProfileModal();
        alert('Perfil salvo com sucesso. Agora você já pode publicar projetos.');
    } catch (error) {
        console.error('Erro ao salvar perfil:', error);
        alert(error && error.code === 'permission-denied'
            ? 'O Firebase ainda bloqueou a atualização do perfil. Recarregue a página e tente novamente.'
            : 'Erro ao salvar perfil. Tente novamente.');
    }
}
