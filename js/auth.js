/**
 * Auth - Login com Google (Gmail)
 * Comunidade BitDogLab
 */

const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Login com Google usando POPUP (mais confiável que redirect)
async function loginWithGoogle() {
    try {
        console.log('Iniciando login com popup...');
        const result = await auth.signInWithPopup(googleProvider);
        console.log('Login bem-sucedido:', result.user.email);
        return result.user;
    } catch (error) {
        console.error('Erro no login:', error.code, error.message);
        
        // Códigos de erro comuns
        if (error.code === 'auth/popup-blocked') {
            alert('Popup bloqueado! Permita popups para este site e tente novamente.');
        } else if (error.code === 'auth/popup-closed-by-user') {
            // Usuário fechou o popup, não faz nada
            console.log('Login cancelado pelo usuário');
        } else if (error.code === 'auth/unauthorized-domain') {
            alert('Domínio não autorizado. Contate o administrador.');
        } else if (error.code === 'auth/requests-from-referer-http://127.0.0.1:5500-are-blocked' || 
                   error.code === 'auth/requests-from-referer-http://localhost:5500-are-blocked') {
            alert('API Key bloqueada para este domínio. Configure no Google Cloud Console.');
        } else {
            alert('Erro ao fazer login: ' + error.message);
        }
        throw error;
    }
}

// Logout
async function logout() {
    try {
        await auth.signOut();
        console.log('Logout realizado');
    } catch (error) {
        console.error('Erro no logout:', error);
    }
}

// Listener de estado de autenticação
auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? user.email : 'null');
    
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const addProjectBtn = document.getElementById('addProjectBtn');

    if (user) {
        // Usuário logado
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = user.displayName || 'Usuário';
        userAvatar.src = user.photoURL || '';
        if (addProjectBtn) addProjectBtn.style.display = 'flex';

        // Verifica se é primeiro login
        checkFirstLogin(user.uid).then((isFirstLogin) => {
            if (isFirstLogin) {
                openProfileModal(user);
            }
        }).catch((err) => {
            console.error('Erro checkFirstLogin:', err);
        });
    } else {
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
// Event Listeners (substitui onclick inline)
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

    // Salvar perfil
    const saveProfileBtn = document.querySelector('#profileModal .btn-save');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }
});

// Verifica se usuário já tem perfil no Firestore
async function checkFirstLogin(uid) {
    const doc = await db.collection('users').doc(uid).get();
    return !doc.exists;
}

// Abre modal de cadastro de perfil
function openProfileModal(user) {
    const modal = document.getElementById('profileModal');
    const nameInput = document.getElementById('profileName');

    // Preenche com nome do Google como sugestão
    nameInput.value = user.displayName || '';
    modal.classList.add('active');
}

// Fecha modal de perfil
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.remove('active');
}

// Salva perfil no Firestore
async function saveProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const name = document.getElementById('profileName').value.trim();
    const bio = document.getElementById('profileBio').value.trim();

    if (!name) {
        alert('Por favor, preencha seu nome.');
        return;
    }
    if (!bio) {
        alert('Por favor, escreva uma bio.');
        return;
    }

    try {
        await db.collection('users').doc(user.uid).set({
            name: name,
            bio: bio,
            email: user.email,
            photoURL: user.photoURL || '',
            projectCount: 0,
            commentCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        closeProfileModal();
    } catch (error) {
        console.error('Erro ao salvar perfil:', error);
        alert('Erro ao salvar perfil. Tente novamente.');
    }
}
