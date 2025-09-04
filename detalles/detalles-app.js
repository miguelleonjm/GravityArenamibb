import { getFirestore, doc, getDoc, collection, getDocs, runTransaction, increment, serverTimestamp, writeBatch, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBXLc-GA2wmNx6u_6IRYleWqEW6-BwQw_0",
    authDomain: "gravitytournamentsapp.firebaseapp.com",
    projectId: "gravitytournamentsapp",
    storageBucket: "gravitytournamentsapp.firebasestorage.app",
    appId: "1:422930488532:web:69f48db67c5b3ba8e9af41",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Notificaciones personalizadas ---
function showCustomAlert(message, type = 'error') {
    const alertContainer = document.createElement('div');
    alertContainer.className = `custom-alert alert-${type}`;
    alertContainer.textContent = message;
    document.body.appendChild(alertContainer);
    setTimeout(() => {
        alertContainer.classList.add('show');
        setTimeout(() => {
            alertContainer.classList.remove('show');
            setTimeout(() => alertContainer.remove(), 500);
        }, 4000);
    }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const profileIcon = document.getElementById('profile-icon');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const headerUsernameDisplay = document.getElementById('username-display');
    const headerEmailDisplay = document.getElementById('email-display');
    const headerPfp = document.getElementById('header-pfp');
    const headerDefaultIcon = document.getElementById('header-default-icon');
    const dropdownPfp = document.getElementById('dropdown-pfp');
    const inscriptionBtn = document.getElementById('inscription-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');
    
    // Modales
    const noTeamModal = document.getElementById('no-team-modal');
    const confirmInscriptionModal = document.getElementById('confirm-inscription-modal');
    const walletPaymentModal = document.getElementById('wallet-payment-modal');
    const confirmWithdrawModal = document.getElementById('confirm-withdraw-modal');

    // Botones de cierre de modales
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById(btn.dataset.closeModal).classList.add('hidden');
        });
    });

    // Pestañas
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    // --- Variables Globales ---
    let currentUser = null;
    let currentUserData = null;
    let currentTournament = null;
    let tournamentId = null;
    let teamDataForInscription = {};

    // --- Lógica Principal de Carga ---
    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            currentUser = user;
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists()) {
                currentUserData = { uid: user.uid, ...userDocSnap.data() };
                updateHeaderUI(user, currentUserData);
                await loadTournamentDetails();
            } else {
                signOut(auth);
            }
        } else {
            window.location.href = '/index.html';
        }
    });

    function updateHeaderUI(user, userData) {
        headerUsernameDisplay.textContent = userData.username || 'Usuario';
        headerEmailDisplay.textContent = user.email;
        if (userData.photoURL) {
            headerPfp.src = userData.photoURL;
            dropdownPfp.src = userData.photoURL;
            headerPfp.style.display = 'block';
            headerDefaultIcon.style.display = 'none';
        } else {
            headerPfp.style.display = 'none';
            headerDefaultIcon.style.display = 'block';
            dropdownPfp.src = 'https://placehold.co/48x48/1A1A1A/A8A8A8?text=G';
        }
    }

    async function loadTournamentDetails() {
        const params = new URLSearchParams(window.location.search);
        tournamentId = params.get('id');
        if (!tournamentId) return;

        const docRef = doc(db, "tournaments", tournamentId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentTournament = { id: docSnap.id, ...docSnap.data() };
            document.title = `${currentTournament.name} - Gravity`;
            
            document.getElementById('detail-banner').style.backgroundImage = `url('${currentTournament.image}')`;
            document.getElementById('detail-title').textContent = currentTournament.name;
            document.getElementById('detail-game').textContent = currentTournament.game;
            document.getElementById('detail-cost').textContent = currentTournament.cost > 0 ? `S/ ${currentTournament.cost.toFixed(2)}` : 'Gratis';
            
            document.getElementById('detail-format').textContent = currentTournament.format;
            document.getElementById('detail-platform').textContent = currentTournament.platform;
            document.getElementById('detail-mode').textContent = currentTournament.mode;
            document.getElementById('detail-slots').textContent = `${currentTournament.participants || 0} / ${currentTournament.slots}`;
            
            document.getElementById('detail-description').textContent = currentTournament.description || "Sin descripción.";
            document.getElementById('rules-list').innerHTML = currentTournament.rules?.map(rule => `<li>${rule}</li>`).join('') || '<li>No hay reglas definidas.</li>';
            
            renderPrizes(currentTournament.prizes);
            renderTimeline(currentTournament.status);
            updateInscriptionStatus();
        }
    }
    
    function renderPrizes(prizes) {
        const moneyPrizesList = document.getElementById('money-prizes-list');
        const pointsPoolSection = document.getElementById('points-pool-section');
        moneyPrizesList.innerHTML = '';
        pointsPoolSection.innerHTML = '';

        const moneyPrizes = prizes?.money || {};
        const pointsPool = prizes?.pointsPool || 0;

        const prizeOrder = [
            { rank: '1er Puesto', amount: moneyPrizes.first, class: 'gold' },
            { rank: '2do Puesto', amount: moneyPrizes.second, class: 'silver' },
            { rank: '3er Puesto', amount: moneyPrizes.third, class: 'bronze' }
        ];

        let hasMoneyPrizes = false;
        prizeOrder.forEach(prize => {
            if (prize.amount > 0) {
                hasMoneyPrizes = true;
                const prizeCard = `<div class="prize-card ${prize.class}"><div class="prize-card-header">${prize.rank}</div><div class="prize-card-body">S/ ${prize.amount.toFixed(2)}</div></div>`;
                moneyPrizesList.innerHTML += prizeCard;
            }
        });

        if (!hasMoneyPrizes) moneyPrizesList.innerHTML = '<p>No hay premios en dinero.</p>';
        if (pointsPool > 0) {
            pointsPoolSection.innerHTML = `<h3><i class="fas fa-star"></i> ${pointsPool.toLocaleString('es-PE')} Puntos</h3><p>Se repartirán entre los participantes.</p>`;
        } else {
             pointsPoolSection.innerHTML = '<p>No hay bolsa de puntos.</p>';
        }
    }
    
    function renderTimeline(status) {
        const timelineList = document.getElementById('timeline-list');
        const steps = [
            { id: 'inscripciones_abiertas', title: 'Inscripciones Abiertas', description: 'Inscribe a tu equipo y prepárate.' },
            { id: 'llaves', title: 'Creación de Llaves', description: 'Los enfrentamientos serán definidos.' },
            { id: 'inicio', title: 'Inicio del Torneo', description: '¡Que comience la batalla!' },
            { id: 'en_curso', title: 'Torneo en Curso', description: 'Las partidas se están jugando.' },
            { id: 'finalizado', title: 'Torneo Finalizado', description: 'Los ganadores han sido coronados.' }
        ];
        const statusOrder = steps.map(s => s.id);
        const currentStatusIndex = statusOrder.indexOf(status);
        timelineList.innerHTML = steps.map((step, index) => {
            let itemClass = '';
            if (index < currentStatusIndex) itemClass = 'completed';
            else if (index === currentStatusIndex) itemClass = 'active';
            return `<li class="timeline-item ${itemClass}"><h4>${step.title}</h4><p>${step.description}</p></li>`;
        }).join('');
    }

    async function updateInscriptionStatus() {
        inscriptionBtn.classList.add('hidden');
        withdrawBtn.classList.add('hidden');
        
        if (!currentUserData || !currentUserData.teamId) {
            inscriptionBtn.textContent = "Inscribirse";
            inscriptionBtn.classList.remove('hidden');
            return;
        }

        const enrolledRef = doc(db, "tournaments", tournamentId, "enrolledTeams", currentUserData.teamId);
        if ((await getDoc(enrolledRef)).exists()) {
            withdrawBtn.classList.remove('hidden');
        } else {
            inscriptionBtn.textContent = currentTournament.cost > 0 ? `Inscribirse (S/ ${currentTournament.cost.toFixed(2)})` : "Inscribirse Gratis";
            inscriptionBtn.classList.remove('hidden');
        }
    }

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            tabLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const tabId = link.dataset.tab;
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });

    inscriptionBtn.addEventListener('click', async () => {
        if (!currentUserData.teamId) {
            noTeamModal.classList.remove('hidden');
            return;
        }
        const teamDocRef = doc(db, "teams", currentUserData.teamId);
        const teamDocSnap = await getDoc(teamDocRef);
        if (!teamDocSnap.exists() || teamDocSnap.data().leaderId !== currentUser.uid) {
            showCustomAlert("Solo el líder del equipo puede inscribirlo.");
            return;
        }
        await openConfirmationModal(teamDocSnap);
    });

    async function openConfirmationModal(teamDocSnap) {
        const teamData = teamDocSnap.data();
        const membersRef = collection(db, "teams", teamDocSnap.id, "members");
        const membersSnap = await getDocs(membersRef);
        
        // CORRECCIÓN 1 (Para la lista visual): Previene vacíos si un miembro no tiene nombre.
        const membersList = membersSnap.docs.map(doc => `<li>${doc.data().username || 'Nombre no disponible'}</li>`);

        const logoUrl = teamData.teamLogoURL || 'https://placehold.co/100x100/2a2a2e/FFF?text=LOGO';
        document.getElementById('confirm-team-logo').src = logoUrl;
        document.getElementById('confirm-team-name').textContent = teamData.teamName;
        document.getElementById('confirm-team-members').innerHTML = membersList.join('');
        
        const whatsappInput = document.getElementById('leader-whatsapp');
        whatsappInput.value = '';
        whatsappInput.parentElement.classList.remove('is-valid');
        document.getElementById('confirm-and-proceed-btn').disabled = true;

        // CORRECCIÓN 2 (Para el error de pago): Previene el error 'undefined' en la transacción.
        teamDataForInscription = {
            teamName: teamData.teamName,
            teamLogo: logoUrl,
            members: membersSnap.docs.map(doc => ({ 
                uid: doc.data().uid || doc.id, 
                username: doc.data().username || 'Miembro sin nombre' 
            }))
        };
        confirmInscriptionModal.classList.remove('hidden');
    }
    
    const whatsappInput = document.getElementById('leader-whatsapp');
    whatsappInput.addEventListener('input', () => {
        const isValid = /^\d{9}$/.test(whatsappInput.value);
        whatsappInput.parentElement.classList.toggle('is-valid', isValid);
        document.getElementById('confirm-and-proceed-btn').disabled = !isValid;
    });

    document.getElementById('confirm-and-proceed-btn').addEventListener('click', () => {
        const whatsappNumber = whatsappInput.value.trim();
        if (!/^\d{9}$/.test(whatsappNumber)) {
            showCustomAlert("Ingresa un WhatsApp válido (9 dígitos).");
            return;
        }
        teamDataForInscription.leaderWhatsApp = whatsappNumber;
        confirmInscriptionModal.classList.add('hidden');
        if (currentTournament.cost > 0) openWalletPaymentModal();
        else processFreeInscription();
    });

    function openWalletPaymentModal() {
        const userBalance = currentUserData.accountBalance || 0;
        const cost = currentTournament.cost;
        document.getElementById('wallet-balance').textContent = `S/ ${userBalance.toFixed(2)}`;
        document.getElementById('wallet-cost').textContent = `- S/ ${cost.toFixed(2)}`;
        document.getElementById('wallet-remaining').textContent = `S/ ${(userBalance - cost).toFixed(2)}`;
        
        const canAfford = userBalance >= cost;
        document.getElementById('confirm-wallet-payment-btn').disabled = !canAfford;
        document.getElementById('insufficient-funds-msg').classList.toggle('hidden', canAfford);
        
        walletPaymentModal.classList.remove('hidden');
    }

    async function processFreeInscription() {
        const btn = document.getElementById('inscription-btn');
        btn.disabled = true;
        btn.textContent = "Procesando...";

        const tournamentRef = doc(db, "tournaments", tournamentId);
        const enrolledTeamRef = doc(db, "tournaments", tournamentId, "enrolledTeams", currentUserData.teamId);

        try {
            const batch = writeBatch(db);
            const dataToSave = { ...teamDataForInscription, enrolledAt: serverTimestamp() };
            
            batch.set(enrolledTeamRef, dataToSave);
            batch.update(tournamentRef, { participants: increment(1) });
            await batch.commit();

            showCustomAlert("¡Inscripción gratuita exitosa!", 'success');
            await loadTournamentDetails();
        } catch (error) {
            console.error("Error en inscripción gratuita:", error);
            showCustomAlert("Error en la inscripción: " + (error.message || error));
            btn.disabled = false;
            btn.textContent = "Inscribirse Gratis";
        }
    }

    document.getElementById('confirm-wallet-payment-btn').addEventListener('click', async () => {
        const confirmBtn = document.getElementById('confirm-wallet-payment-btn');
        confirmBtn.classList.add('is-loading');
        confirmBtn.disabled = true;

        const userRef = doc(db, "users", currentUser.uid);
        const tournamentRef = doc(db, "tournaments", tournamentId);

        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists() || (userDoc.data().accountBalance || 0) < currentTournament.cost) {
                    throw new Error("Saldo insuficiente.");
                }

                transaction.update(userRef, { accountBalance: increment(-currentTournament.cost) });

                const txRef = doc(collection(db, "transactions"));
                transaction.set(txRef, {
                    userId: currentUser.uid,
                    amount: currentTournament.cost,
                    type: 'inscription_payment',
                    description: `Inscripción a ${currentTournament.name}`,
                    timestamp: serverTimestamp()
                });

                const enrolledTeamRef = doc(db, "tournaments", tournamentId, "enrolledTeams", currentUserData.teamId);
                const dataToSave = { ...teamDataForInscription, enrolledAt: serverTimestamp() };
                transaction.set(enrolledTeamRef, dataToSave);
                
                transaction.update(tournamentRef, { participants: increment(1) });
            });

            showCustomAlert("¡Inscripción exitosa! Tu equipo ha sido registrado.", 'success');
            walletPaymentModal.classList.add('hidden');
            currentUserData.accountBalance -= currentTournament.cost; 
            await loadTournamentDetails();

        } catch (error) {
            console.error("Error en la transacción de inscripción:", error);
            showCustomAlert("Error en la inscripción: " + (error.message || "Por favor, inténtalo más tarde."));
        } finally {
            confirmBtn.classList.remove('is-loading');
            if(!walletPaymentModal.classList.contains('hidden')) {
                const canAfford = (currentUserData.accountBalance || 0) >= currentTournament.cost;
                confirmBtn.disabled = !canAfford;
            }
        }
    });

    withdrawBtn.addEventListener('click', () => {
        confirmWithdrawModal.classList.remove('hidden');
    });

    document.getElementById('cancel-withdraw-btn').addEventListener('click', () => {
        confirmWithdrawModal.classList.add('hidden');
    });

    document.getElementById('confirm-withdraw-action-btn').addEventListener('click', async () => {
        const btn = document.getElementById('confirm-withdraw-action-btn');
        btn.disabled = true;
        btn.textContent = "Procesando...";

        const tournamentRef = doc(db, "tournaments", tournamentId);
        const enrolledTeamRef = doc(db, "tournaments", tournamentId, "enrolledTeams", currentUserData.teamId);

        try {
            const batch = writeBatch(db);
            batch.delete(enrolledTeamRef);
            batch.update(tournamentRef, { participants: increment(-1) });
            await batch.commit();
            showCustomAlert("Te has retirado del torneo exitosamente.", 'success');
            await loadTournamentDetails();

        } catch (error) {
            console.error("Error al retirarse:", error);
            showCustomAlert("Error al retirarse: " + error.message);
        } finally {
            confirmWithdrawModal.classList.add('hidden');
            btn.disabled = false;
            btn.textContent = "Sí, retirar mi equipo";
        }
    });

    if (profileIcon) {
        profileIcon.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown.classList.toggle('show'); });
    }
    document.addEventListener('click', (e) => {
        if (profileDropdown && !profileDropdown.contains(e.target) && !profileIcon.contains(e.target)) {
            profileDropdown.classList.remove('show');
        }
    });
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => signOut(auth));
    }
});