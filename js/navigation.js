/**
 * Navigation - Controla navegação entre seções
 * Comunidade BitDogLab
 */
document.addEventListener('DOMContentLoaded', () => {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.main > section');
    const serialControls = document.getElementById('serialControls');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.section;

            // Atualiza botões
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Atualiza seções
            sections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });

            // Mostra controles serial apenas na aba terminal
            if (targetId === 'terminalSection') {
                serialControls.style.display = 'flex';
                // xterm precisa de refresh quando a aba fica visível
                window.dispatchEvent(new Event('terminal-visible'));
            } else {
                serialControls.style.display = 'none';
            }
        });
    });
});
