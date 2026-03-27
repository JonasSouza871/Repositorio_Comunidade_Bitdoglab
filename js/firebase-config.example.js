/**
 * Firebase Config - Comunidade BitDogLab
 * Copie este arquivo como firebase-config.js e preencha com suas credenciais
 *
 * Para obter as credenciais:
 * 1. Acesse https://console.firebase.google.com
 * 2. Selecione seu projeto
 * 3. Configurações > Geral > Seus apps > Web
 */
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.firebasestorage.app",
    messagingSenderId: "SEU_ID",
    appId: "SEU_APP_ID"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);

// Instâncias globais
const auth = firebase.auth();
const db = firebase.firestore();
