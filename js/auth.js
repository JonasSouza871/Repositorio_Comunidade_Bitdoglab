/**
 * Auth - Login com Google (Gmail)
 * Comunidade BitDogLab
 */

const googleProvider = new firebase.auth.GoogleAuthProvider();

// Login com Google
async function loginWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        return result.user;
    } catch (error) {
        console.error('Erro no login:', error);
        throw error;
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
    const logoutBtn = document.getElementById('logoutBtn');

    if (user) {
        // Usuário logado
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = user.displayName || 'Usuário';
        userAvatar.src = user.photoURL || '';

        // Verifica se é primeiro login
        const isFirstLogin = await checkFirstLogin(user.uid);
        if (isFirstLogin) {
            openProfileModal(user);
        }
    } else {
        // Usuário deslogado
        loginBtn.style.display = 'flex';
        userInfo.style.display = 'none';
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
