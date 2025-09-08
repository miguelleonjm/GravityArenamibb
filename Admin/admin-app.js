import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection, addDoc, onSnapshot, updateDoc, deleteDoc, writeBatch, query, where, increment, serverTimestamp, setDoc, orderBy, runTransaction, limit } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBXLc-GA2wmNx6u_6IRYleWqEW6-BwQw_0",
    authDomain: "gravitytournamentsapp.firebaseapp.com",
    projectId: "gravitytournamentsapp",
    storageBucket: "gravitytournamentsapp.firebasestorage.app",
    appId: "1:422930488532:web:69f48db67c5b3ba8e9af41",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const loader = document.getElementById('loader');
    const adminContainer = document.getElementById('admin-container');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.admin-section');
    const tournamentForm = document.getElementById('tournament-form');
    const tournamentsList = document.getElementById('tournaments-list');
    const usersList = document.getElementById('users-list');
    const inscriptionsList = document.getElementById('inscriptions-list');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-tournament-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const tournamentIdField = document.getElementById('tournament-id');
    const imageInput = document.getElementById('tournament-image');
    let currentImageURL = null;
    const controlSection = document.getElementById('control-section');
    const tournamentSelectorView = document.getElementById('tournament-selector-view');
    const activeTournamentsList = document.getElementById('active-tournaments-list');
    const tournamentControlPanel = document.getElementById('tournament-control-panel');
    const backToSelectorBtn = document.getElementById('back-to-selector-btn');
    const controlPanelTitle = document.getElementById('control-panel-title');
    const controlPanelGame = document.getElementById('control-panel-game');
    const enrolledTeamsContainer = document.getElementById('enrolled-teams-container');
    const finalizeTournamentBtn = document.getElementById('finalize-tournament-btn');
    const shopItemForm = document.getElementById('shop-item-form');
    const shopItemsList = document.getElementById('shop-items-list');
    const shopFormTitle = document.getElementById('shop-form-title');
    const submitShopBtn = document.getElementById('submit-shop-item-btn');
    const cancelShopEditBtn = document.getElementById('cancel-shop-edit-btn');
    const shopItemIdField = document.getElementById('shop-item-id');
    const itemImageInput = document.getElementById('item-image');
    let currentItemImageURL = null;
    const editUserModal = document.getElementById('edit-user-modal');
    const editUserForm = document.getElementById('edit-user-form');
    const cancelUserEditBtn = document.getElementById('cancel-user-edit-btn');
    const editUserId = document.getElementById('edit-user-id');
    const editUserUsername = document.getElementById('edit-user-username');
    const editUserPoints = document.getElementById('edit-user-points');
    const editUserBalance = document.getElementById('edit-user-balance');
    const purchasesList = document.getElementById('purchases-list');
    const createCodeForm = document.getElementById('create-code-form');
    const codesList = document.getElementById('codes-list');
    const generateCodeBtn = document.getElementById('generate-code-btn');
    const codeIdInput = document.getElementById('code-id');
    const rewardTypeSelect = document.getElementById('code-reward-type');
    const pointsRewardGroup = document.getElementById('points-reward-group');
    const majorPrizeRewardGroup = document.getElementById('major-prize-reward-group');
    const claimsList = document.getElementById('claims-list'); 

    let currentTournamentIdForControl = null;
    let currentTournamentDataForControl = null;
    let userActivityChartInstance = null; // Para guardar la instancia del gráfico

    // --- LÓGICA PRINCIPAL ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                loader.classList.add('hidden');
                adminContainer.classList.remove('hidden');
                lucide.createIcons();
                
                // ===== SE LLAMAN TODAS LAS FUNCIONES DE CARGA =====
                loadDashboardData(); // <--- NUEVA FUNCIÓN DEL DASHBOARD
                loadPendingInscriptions();
                loadTournaments();
                loadUsers();
                loadActiveTournamentsForControl();
                loadShopItems();
                loadRedeemCodes();
                loadPurchaseHistory();
                loadPrizeClaims(); 
            } else {
                window.location.href = '/index.html';
            }
        } else {
            window.location.href = '/index.html';
        }
    });

    // ==========================================================
    // ===    NUEVO CÓDIGO PARA EL DASHBOARD FUNCIONAL        ===
    // ==========================================================

    async function loadDashboardData() {
        updateTotalUsersKPI();
        updateActiveTournamentsKPI();
        updateMonthlyRevenueKPI();
        renderUserActivityChart();
        updateRecentTournamentsWidget();
        updateEnrollmentProgressWidget();
    }

    // --- Funciones para las tarjetas de KPIs ---
    async function updateTotalUsersKPI() {
        const usersSnapshot = await getDocs(collection(db, "users"));
        document.getElementById('kpi-total-users').textContent = usersSnapshot.size.toLocaleString('es-PE');
    }

    async function updateActiveTournamentsKPI() {
        const q = query(collection(db, "tournaments"), where("status", "!=", "finalizado"));
        const tournamentsSnapshot = await getDocs(q);
        document.getElementById('kpi-active-tournaments').textContent = tournamentsSnapshot.size;
    }

    async function updateMonthlyRevenueKPI() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const q = query(collection(db, "transactions"), 
            where("type", "==", "inscription_payment"),
            where("timestamp", ">=", startOfMonth),
            where("timestamp", "<=", endOfMonth)
        );
        
        const transactionsSnapshot = await getDocs(q);
        let totalRevenue = 0;
        transactionsSnapshot.forEach(doc => {
            totalRevenue += doc.data().amount;
        });

        document.getElementById('kpi-monthly-revenue').textContent = `S/ ${totalRevenue.toFixed(2)}`;
    }

    // --- Función para el gráfico de actividad ---
    async function renderUserActivityChart() {
        const labels = [];
        const data = [];
        // Preparar los últimos 7 días
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }));
            data.push(0);
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Asume que los usuarios tienen un campo 'createdAt' de tipo Timestamp
        const q = query(collection(db, "users"), where("createdAt", ">=", sevenDaysAgo));
        const usersSnapshot = await getDocs(q);

        usersSnapshot.forEach(doc => {
            const createdAt = doc.data().createdAt.toDate();
            const dayIndex = labels.findIndex(label => {
                const [weekday, day] = label.split(' ');
                return parseInt(day) === createdAt.getDate();
            });
            if (dayIndex !== -1) {
                data[dayIndex]++;
            }
        });

        const ctx = document.getElementById('userActivityChart').getContext('2d');
        if (userActivityChartInstance) {
            userActivityChartInstance.destroy(); // Destruir gráfico anterior si existe
        }
        userActivityChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Nuevos Usuarios',
                    data: data,
                    borderColor: '#4F46E5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // --- Funciones para los widgets secundarios ---
    async function updateRecentTournamentsWidget() {
        const container = document.getElementById('recent-tournaments-list');
        // Asume que los torneos tienen un campo 'startDate'
        const q = query(collection(db, "tournaments"), orderBy("startDate", "desc"), limit(5));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="text-center p-4 text-gray-400">No hay torneos recientes.</p>';
            return;
        }
        
        container.innerHTML = '';
        const list = document.createElement('ul');
        list.className = 'space-y-3';
        snapshot.forEach(doc => {
            const tournament = doc.data();
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center text-sm';
            li.innerHTML = `
                <span class="font-medium text-gray-700">${tournament.name}</span>
                <span class="text-gray-500">${tournament.game}</span>
            `;
            list.appendChild(li);
        });
        container.appendChild(list);
    }

    async function updateEnrollmentProgressWidget() {
        const container = document.getElementById('enrollment-progress-widget');
        const q = query(collection(db, "tournaments"), where("status", "==", "inscripciones_abiertas"), orderBy("startDate", "asc"), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '<p class="text-center p-4 text-gray-400">No hay torneos con inscripciones abiertas.</p>';
            return;
        }

        const tournament = snapshot.docs[0].data();
        const enrolled = tournament.participants || 0;
        const slots = tournament.slots;
        const percentage = slots > 0 ? ((enrolled / slots) * 100).toFixed(0) : 0;

        container.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between font-medium text-sm">
                    <span class="text-gray-700">${tournament.name}</span>
                    <span class="text-gray-500">${enrolled} / ${slots}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-indigo-600 h-2.5 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }

    // ==========================================================
    // ===       FIN DEL NUEVO CÓDIGO PARA EL DASHBOARD       ===
    // ==========================================================


    // --- Lógica de Navegación --- (SIN CAMBIOS)
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = link.dataset.section;
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            sections.forEach(s => s.classList.add('hidden'));
            document.getElementById(`${targetSection}-section`).classList.remove('hidden');
        });
    });
    // --- GESTIÓN DE INSCRIPCIONES (SIN CAMBIOS) ---
    function loadPendingInscriptions() {
        const q = query(collection(db, "pendingInscriptions"), where("status", "==", "pendiente"));
        onSnapshot(q, (snapshot) => {
            inscriptionsList.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">No hay inscripciones pendientes.</td></tr>';
            if (snapshot.empty) return;
            inscriptionsList.innerHTML = '';
            snapshot.forEach(doc => {
                const inscription = doc.data(); const row = document.createElement('tr'); row.className = 'border-b border-gray-700';
                row.innerHTML = `<td class="p-4 font-semibold">${inscription.tournamentName}</td><td class="p-4">${inscription.teamName}</td><td class="p-4">${inscription.leaderUsername} (${inscription.contactWhatsapp})</td><td class="p-4 text-sm"><strong>Pagador:</strong> ${inscription.paymentDetails.payerName}<br><strong>Operación:</strong> ${inscription.paymentDetails.transactionCode}</td><td class="p-4 text-center"><span class="status-badge ${inscription.status}">${inscription.status}</span></td><td class="p-4 text-right flex justify-end gap-2"><button class="action-btn approve" data-id="${doc.id}" title="Aprobar Inscripción"><i data-lucide="check-circle" class="w-5 h-5 text-green-400"></i></button><button class="action-btn reject" data-id="${doc.id}" title="Rechazar Inscripción"><i data-lucide="x-circle" class="w-5 h-5 text-red-500"></i></button></td>`;
                inscriptionsList.appendChild(row);
            });
            lucide.createIcons();
        });
    }
    inscriptionsList.addEventListener('click', async (e) => {
        const approveBtn = e.target.closest('.approve'); const rejectBtn = e.target.closest('.reject');
        if (approveBtn) {
            const inscriptionId = approveBtn.dataset.id; if (!confirm('¿Estás seguro de que quieres APROBAR esta inscripción?')) return;
            try {
                const inscriptionRef = doc(db, "pendingInscriptions", inscriptionId); const inscriptionSnap = await getDoc(inscriptionRef); if (!inscriptionSnap.exists()) throw new Error("La inscripción ya no existe.");
                const inscriptionData = inscriptionSnap.data(); const tournamentRef = doc(db, "tournaments", inscriptionData.tournamentId); const batch = writeBatch(db);
                batch.update(inscriptionRef, { status: "aprobado" }); batch.update(tournamentRef, { participants: increment(1) });
                const enrolledTeamRef = doc(db, "tournaments", inscriptionData.tournamentId, "enrolledTeams", inscriptionData.teamId);
                batch.set(enrolledTeamRef, { teamName: inscriptionData.teamName, enrolledAt: serverTimestamp() }); await batch.commit(); alert('Inscripción aprobada con éxito.');
            } catch (error) { console.error("Error al aprobar:", error); alert("Hubo un error al aprobar."); }
        }
        if (rejectBtn) {
            const inscriptionId = rejectBtn.dataset.id; if (!confirm('¿Estás seguro de que quieres RECHAZAR esta inscripción?')) return;
            try { await updateDoc(doc(db, "pendingInscriptions", inscriptionId), { status: "rechazado" }); alert('Inscripción rechazada.');
            } catch (error) { console.error("Error al rechazar:", error); alert("Hubo un error al rechazar."); }
        }
    });

    // --- GESTIÓN DE TORNEOS (SIN CAMBIOS) ---
    function loadTournaments() {
        onSnapshot(collection(db, "tournaments"), (snapshot) => {
            tournamentsList.innerHTML = '';
            snapshot.forEach(doc => {
                const tournament = doc.data(); const row = document.createElement('tr'); row.className = 'border-b border-gray-700';
                row.innerHTML = `<td class="p-4 font-semibold">${tournament.name}</td><td class="p-4">${tournament.game}</td><td class="p-4 text-center">${tournament.participants || 0} / ${tournament.slots}</td><td class="p-4 text-right"><button class="edit-btn" data-id="${doc.id}"><i data-lucide="pencil" class="w-5 h-5 text-blue-400 hover:text-blue-300"></i></button><button class="delete-btn" data-id="${doc.id}"><i data-lucide="trash-2" class="w-5 h-5 text-red-500 hover:text-red-400"></i></button></td>`;
                tournamentsList.appendChild(row);
            });
            lucide.createIcons();
        });
    }
    tournamentForm.addEventListener('submit', async (e) => {
        e.preventDefault(); submitBtn.disabled = true; submitBtn.textContent = 'Guardando...'; const id = tournamentIdField.value; const imageFile = imageInput.files[0]; let imageUrl = currentImageURL;
        try {
            if (imageFile) { const storageRef = ref(storage, `tournament-banners/${Date.now()}-${imageFile.name}`); await uploadBytes(storageRef, imageFile); imageUrl = await getDownloadURL(storageRef); }
            if (!id && !imageUrl) throw new Error('Se requiere una imagen para crear un nuevo torneo.');
            const tournamentData = { 
                name: document.getElementById('tournament-name').value, game: document.getElementById('tournament-game').value, mode: document.getElementById('tournament-mode').value, platform: document.getElementById('tournament-platform').value, format: document.getElementById('tournament-format').value, cost: parseFloat(document.getElementById('tournament-cost').value), slots: parseInt(document.getElementById('tournament-slots').value), status: document.getElementById('tournament-status').value, closeDate: document.getElementById('tournament-close-date').value, startDate: document.getElementById('tournament-start-date').value, description: document.getElementById('tournament-description').value, rules: document.getElementById('tournament-rules').value.split(';').map(r => r.trim()).filter(r => r), image: imageUrl, 
                prizes: { money: { first: parseFloat(document.getElementById('prize-money-first').value) || 0, second: parseFloat(document.getElementById('prize-money-second').value) || 0, third: parseFloat(document.getElementById('prize-money-third').value) || 0, }, pointsPool: parseInt(document.getElementById('prize-points-pool').value) || 0 }
            };
            if (id) { await updateDoc(doc(db, "tournaments", id), tournamentData); alert('Torneo actualizado'); } else { tournamentData.participants = 0; await addDoc(collection(db, "tournaments"), tournamentData); alert('Torneo creado'); }
            resetForm();
        } catch (error) { console.error("Error:", error); alert(`Error: ${error.message}`); } finally { submitBtn.disabled = false; submitBtn.textContent = id ? 'Guardar Cambios' : 'Crear Torneo'; }
    });
    tournamentsList.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const id = editBtn.dataset.id; const docSnap = await getDoc(doc(db, "tournaments", id));
            if (docSnap.exists()) {
                const data = docSnap.data(); formTitle.textContent = "Editar Torneo"; submitBtn.textContent = "Guardar Cambios"; cancelBtn.classList.remove('hidden');
                tournamentIdField.value = id; document.getElementById('tournament-name').value = data.name || ''; document.getElementById('tournament-game').value = data.game || ''; document.getElementById('tournament-mode').value = data.mode || ''; document.getElementById('tournament-platform').value = data.platform || ''; document.getElementById('tournament-format').value = data.format || ''; document.getElementById('tournament-cost').value = data.cost || 0; document.getElementById('tournament-slots').value = data.slots || 0; document.getElementById('tournament-status').value = data.status || 'inscripciones_abiertas'; document.getElementById('tournament-close-date').value = data.closeDate || ''; document.getElementById('tournament-start-date').value = data.startDate || ''; document.getElementById('tournament-description').value = data.description || ''; document.getElementById('tournament-rules').value = data.rules ? data.rules.join('; ') : ''; document.getElementById('prize-money-first').value = data.prizes?.money?.first || ''; document.getElementById('prize-money-second').value = data.prizes?.money?.second || ''; document.getElementById('prize-money-third').value = data.prizes?.money?.third || ''; document.getElementById('prize-points-pool').value = data.prizes?.pointsPool || ''; currentImageURL = data.image; imageInput.value = ''; window.scrollTo(0, 0);
            }
        }
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) { const id = deleteBtn.dataset.id; if (confirm('¿Seguro?')) { await deleteDoc(doc(db, "tournaments", id)); alert('Eliminado.'); } }
    });
    function resetForm() { tournamentForm.reset(); tournamentIdField.value = ''; formTitle.textContent = "Crear Nuevo Torneo"; submitBtn.textContent = "Crear Torneo"; cancelBtn.classList.add('hidden'); currentImageURL = null; }
    cancelBtn.addEventListener('click', resetForm);
    
    // --- CONTROL DE TORNEOS (SECCIÓN MODIFICADA) ---
    function loadActiveTournamentsForControl() {
        const q = query(collection(db, "tournaments"), where("status", "!=", "finalizado"));
        onSnapshot(q, (snapshot) => {
            activeTournamentsList.innerHTML = '<p>Cargando torneos...</p>';
            if(snapshot.empty){ activeTournamentsList.innerHTML = '<p>No hay torneos activos.</p>'; return; }
            activeTournamentsList.innerHTML = '';
            snapshot.forEach(doc => {
                const t = doc.data(); const card = document.createElement('div'); card.className = 'bg-gray-800 p-6 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors'; card.dataset.id = doc.id;
                card.innerHTML = `<h4 class="font-bold text-lg text-white">${t.name}</h4><p class="text-sm text-purple-400">${t.game}</p><p class="text-xs text-gray-400 mt-2">Inscritos: ${t.participants || 0} / ${t.slots}</p>`;
                card.addEventListener('click', () => showTournamentControlPanel(doc.id)); activeTournamentsList.appendChild(card);
            });
        });
    }

    async function showTournamentControlPanel(tournamentId) {
        currentTournamentIdForControl = tournamentId;
        tournamentSelectorView.classList.add('hidden');
        tournamentControlPanel.classList.remove('hidden');
        const tournamentSnap = await getDoc(doc(db, "tournaments", tournamentId));
        if (!tournamentSnap.exists()) return;

        // Guardamos los datos del torneo para usarlos luego
        currentTournamentDataForControl = tournamentSnap.data();
        controlPanelTitle.textContent = currentTournamentDataForControl.name;
        controlPanelGame.textContent = currentTournamentDataForControl.game;

        enrolledTeamsContainer.innerHTML = '<p class="text-gray-500">Cargando equipos...</p>';
        const enrolledTeamsQuery = query(collection(db, "tournaments", tournamentId, "enrolledTeams"));
        
        onSnapshot(enrolledTeamsQuery, (snapshot) => {
            if (snapshot.empty) {
                enrolledTeamsContainer.innerHTML = '<p class="text-gray-500">Aún no hay equipos inscritos.</p>';
                return;
            }
            enrolledTeamsContainer.innerHTML = ''; // Limpiar antes de renderizar
            
            // Reemplazamos la creación de tarjetas simples por la nueva lógica
            snapshot.forEach(async (teamDoc) => {
                const teamId = teamDoc.id;
                const teamData = teamDoc.data();
                
                // Usamos la plantilla HTML que creamos
                const template = document.getElementById('team-control-card-template');
                const card = template.content.cloneNode(true);

                // Poblamos los datos básicos de la tarjeta
                card.querySelector('.team-card-logo').src = teamData.teamLogo || 'https://placehold.co/56x56/4A5568/E2E8F0?text=L';
                card.querySelector('.team-card-name').textContent = teamData.teamName;
                card.querySelector('.team-card-id').textContent = `ID: ${teamId}`;
                
                // Poblamos la lista de miembros
                const membersList = card.querySelector('.team-card-members-list');
                membersList.innerHTML = ''; // Limpiar la lista por defecto
                if (teamData.members && teamData.members.length > 0) {
                    teamData.members.forEach(member => {
                        const li = document.createElement('li');
                        li.textContent = member.username;
                        membersList.appendChild(li);
                    });
                } else {
                    membersList.innerHTML = '<li>No hay miembros registrados.</li>';
                }

                // Poblamos la fecha de inscripción
                const dateElement = card.querySelector('.team-card-date');
                if (teamData.enrolledAt && teamData.enrolledAt.seconds) {
                    dateElement.textContent = new Date(teamData.enrolledAt.seconds * 1000).toLocaleString('es-PE');
                } else {
                    dateElement.textContent = 'No disponible';
                }

                // Buscamos y poblamos el método de pago
                const methodElement = card.querySelector('.team-card-method');
                const txDetailsElement = card.querySelector('.team-card-tx-details');
                
                const inscriptionsQuery = query(collection(db, "pendingInscriptions"), 
                    where("tournamentId", "==", tournamentId), 
                    where("teamId", "==", teamId), 
                    where("status", "==", "aprobado")
                );
                const inscriptionSnap = await getDocs(inscriptionsQuery);

                let methodName = '';
                if (!inscriptionSnap.empty) {
                    methodName = 'Manual';
                    const details = inscriptionSnap.docs[0].data().paymentDetails;
                    txDetailsElement.classList.remove('hidden');
                    card.querySelector('.team-card-tx-code').textContent = details.transactionCode;
                    card.querySelector('.team-card-tx-payer').textContent = details.payerName;
                } else {
                    if (currentTournamentDataForControl.cost > 0) {
                        methodName = 'Billetera';
                    } else {
                        methodName = 'Gratuita';
                    }
                }
                methodElement.textContent = methodName;
                methodElement.className = `method-badge ${methodName.toLowerCase()}`;

                // Asignamos el ID al selector de ranking para que la premiación funcione
                card.querySelector('.team-rank-selector').dataset.teamId = teamId;

                // Añadimos la tarjeta completa al contenedor
                enrolledTeamsContainer.appendChild(card);
            });
        });
    }

    backToSelectorBtn.addEventListener('click', () => {
        tournamentSelectorView.classList.remove('hidden');
        tournamentControlPanel.classList.add('hidden');
        currentTournamentIdForControl = null;
        currentTournamentDataForControl = null; // Limpiar datos del torneo
    });

    // --- LÓGICA DE PREMIACIÓN (SIN CAMBIOS) ---
    finalizeTournamentBtn.addEventListener('click', () => {
        if (!currentTournamentIdForControl) return;
        if (confirm('¿Estás seguro de que quieres finalizar este torneo y repartir los premios? Esta acción es irreversible.')) {
            handlePrizeDistribution(currentTournamentIdForControl);
        }
    });

    async function handlePrizeDistribution(tournamentId) {
        finalizeTournamentBtn.disabled = true;
        finalizeTournamentBtn.textContent = 'Procesando...';
        try {
            const tournamentRef = doc(db, "tournaments", tournamentId);
            await runTransaction(db, async (transaction) => {
                const tournamentSnap = await transaction.get(tournamentRef);
                if (!tournamentSnap.exists()) throw new Error("El torneo no existe.");
                const tournamentData = tournamentSnap.data();
                const prizes = tournamentData.prizes;
                const rankSelectors = document.querySelectorAll('.team-rank-selector');
                const teamRanks = new Map();
                rankSelectors.forEach(selector => { teamRanks.set(selector.dataset.teamId, selector.value); });
                const teamMemberPromises = Array.from(teamRanks.keys()).map(teamId => getDocs(collection(db, "teams", teamId, "members")));
                const teamMemberSnapshots = await Promise.all(teamMemberPromises);
                const teamMembersMap = new Map();
                Array.from(teamRanks.keys()).forEach((teamId, index) => { const memberIds = teamMemberSnapshots[index].docs.map(d => d.id); teamMembersMap.set(teamId, memberIds); });
                for (const [teamId, rank] of teamRanks.entries()) {
                    let moneyReward = 0;
                    if (rank === '1er Puesto') moneyReward = prizes.money.first || 0; if (rank === '2do Puesto') moneyReward = prizes.money.second || 0; if (rank === '3er Puesto') moneyReward = prizes.money.third || 0;
                    if (moneyReward > 0) {
                        const members = teamMembersMap.get(teamId);
                        if (members && members.length > 0) {
                            const moneyPerMember = moneyReward / members.length;
                            for (const memberId of members) {
                                transaction.update(doc(db, "users", memberId), { accountBalance: increment(moneyPerMember) });
                                const txRef = doc(collection(db, "transactions"));
                                transaction.set(txRef, { userId: memberId, amount: moneyPerMember, type: 'prize_payout', description: `Premio (${rank}) en ${tournamentData.name}`, timestamp: serverTimestamp() });
                            }
                        }
                    }
                }
                if (prizes.pointsPool > 0) {
                    const performancePoints = new Map(); let totalPerformancePoints = 0;
                    for (const [teamId, rank] of teamRanks.entries()) { let points = 1; if (rank === '3er Puesto') points = 3; if (rank === '2do Puesto') points = 5; if (rank === '1er Puesto') points = 8; performancePoints.set(teamId, points); totalPerformancePoints += points; }
                    if (totalPerformancePoints > 0) {
                        const valuePerPoint = prizes.pointsPool / totalPerformancePoints;
                        for (const [teamId, perfPoints] of performancePoints.entries()) {
                            const members = teamMembersMap.get(teamId);
                            if (members && members.length > 0) {
                                const totalPointsForTeam = Math.floor(perfPoints * valuePerPoint); const pointsPerMember = Math.floor(totalPointsForTeam / members.length);
                                if (pointsPerMember > 0) { for (const memberId of members) { transaction.update(doc(db, "users", memberId), { gravityPoints: increment(pointsPerMember) }); } }
                            }
                        }
                    }
                }
                transaction.update(tournamentRef, { status: 'finalizado' });
            });
            alert('¡Torneo finalizado y premios repartidos con éxito!');
            backToSelectorBtn.click();
        } catch (error) {
            console.error("Error al repartir premios:", error);
            alert("Hubo un error al finalizar el torneo: " + error.message);
        } finally {
            finalizeTournamentBtn.disabled = false;
            finalizeTournamentBtn.textContent = 'Finalizar y Repartir Premios';
        }
    }
    
    // --- CÓDIGO RESTANTE (SIN CAMBIOS) ---
    async function getFullTeamDetails(teamId) {
        try {
            const membersQuery = query(collection(db, "teams", teamId, "members"));
            const membersSnapshot = await getDocs(membersQuery);
            if (membersSnapshot.empty) return '<span>Sin miembros definidos.</span>';
            const membersList = membersSnapshot.docs.map(doc => `<span>- ${doc.data().username}</span>`);
            return `<p class="font-semibold mt-2">Miembros:</p><div class="flex flex-col">${membersList.join('')}</div>`;
        } catch (error) {
            console.error(`Error al obtener detalles del equipo ${teamId}:`, error);
            return '<span>Error al cargar miembros.</span>';
        }
    }
    function loadShopItems() {
        onSnapshot(collection(db, "shopItems"), (snapshot) => {
            shopItemsList.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Cargando...</td></tr>';
            if (snapshot.empty) { shopItemsList.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay artículos.</td></tr>'; return; }
            shopItemsList.innerHTML = '';
            snapshot.forEach(doc => {
                const item = doc.data(); const row = document.createElement('tr'); row.className = 'border-b border-gray-700';
                row.innerHTML = `<td class="p-4 font-semibold">${item.name}</td><td>${item.category}</td><td class="p-4 text-center">${item.priceReal ? `S/ ${item.priceReal.toFixed(2)}` : 'N/A'}</td><td class="p-4 text-center text-purple-400">${item.pricePoints || 'N/A'}</td><td class="p-4 text-right flex justify-end gap-3"><button class="edit-item-btn" data-id="${doc.id}"><i data-lucide="pencil" class="w-5 h-5 text-blue-400"></i></button><button class="delete-item-btn" data-id="${doc.id}"><i data-lucide="trash-2" class="w-5 h-5 text-red-500"></i></button></td>`;
                shopItemsList.appendChild(row);
            });
            lucide.createIcons();
        });
    }
    shopItemForm.addEventListener('submit', async (e) => {
        e.preventDefault(); submitShopBtn.disabled = true; submitShopBtn.textContent = 'Guardando...'; const id = shopItemIdField.value; let imageUrl = currentItemImageURL;
        try {
            const file = itemImageInput.files[0];
            if (file) { const storageRef = ref(storage, `shop-items/${Date.now()}-${file.name}`); await uploadBytes(storageRef, file); imageUrl = await getDownloadURL(storageRef); }
            if (!id && !imageUrl) throw new Error('Se requiere una imagen para crear un nuevo artículo.');
            const itemData = { name: document.getElementById('item-name').value, category: document.getElementById('item-category').value, description: document.getElementById('item-description').value, priceReal: parseFloat(document.getElementById('item-price-real').value) || 0, pricePoints: parseInt(document.getElementById('item-price-points').value) || 0, tags: document.getElementById('item-tags').value.split(';').map(t => t.trim()).filter(t => t), imageUrl: imageUrl };
            if (id) { await updateDoc(doc(db, "shopItems", id), itemData); alert('Artículo actualizado.'); } else { await addDoc(collection(db, "shopItems"), itemData); alert('Artículo creado.'); }
            resetShopForm();
        } catch (error) { alert(`Error: ${error.message}`); } finally { submitShopBtn.disabled = false; }
    });
    shopItemsList.addEventListener('click', async (e) => {
        if (e.target.closest('.edit-item-btn')) {
            const id = e.target.closest('.edit-item-btn').dataset.id; const docSnap = await getDoc(doc(db, "shopItems", id));
            if (docSnap.exists()) {
                const item = docSnap.data(); shopFormTitle.textContent = "Editar Artículo"; submitShopBtn.textContent = "Guardar Cambios"; cancelShopEditBtn.classList.remove('hidden'); shopItemIdField.value = id; document.getElementById('item-name').value = item.name || ''; document.getElementById('item-category').value = item.category || 'Skins'; document.getElementById('item-description').value = item.description || ''; document.getElementById('item-price-real').value = item.priceReal || ''; document.getElementById('item-price-points').value = item.pricePoints || ''; document.getElementById('item-tags').value = item.tags ? item.tags.join('; ') : ''; currentItemImageURL = item.imageUrl; window.scrollTo(0, 0);
            }
        }
        if (e.target.closest('.delete-item-btn')) { const id = e.target.closest('.delete-item-btn').dataset.id; if (confirm('¿Seguro?')) { await deleteDoc(doc(db, "shopItems", id)); alert('Artículo eliminado.'); } }
    });
    function resetShopForm() { shopItemForm.reset(); shopItemIdField.value = ''; currentItemImageURL = null; shopFormTitle.textContent = "Crear Nuevo Artículo"; submitShopBtn.textContent = "Crear Artículo"; cancelShopEditBtn.classList.add('hidden'); }
    cancelShopEditBtn.addEventListener('click', resetShopForm);
    function loadUsers() {
        onSnapshot(collection(db, "users"), (snapshot) => {
            usersList.innerHTML = '';
            snapshot.forEach(doc => {
                const user = doc.data(); const row = document.createElement('tr'); row.className = 'border-b border-gray-700'; const isAdmin = user.role === 'admin';
                row.innerHTML = `<td class="p-4">${user.email}</td><td class="p-4">${user.username || 'N/A'}</td><td class="p-4 text-center"><span class="role-badge ${isAdmin ? 'admin' : 'user'}">${user.role}</span></td><td class="p-4 text-center font-semibold text-green-400">S/ ${(user.accountBalance || 0).toFixed(2)}</td><td class="p-4 text-center font-semibold text-purple-400">${user.gravityPoints || 0}</td><td class="p-4 text-right"><button class="edit-user-btn" data-id="${doc.id}" data-username="${user.username || 'N/A'}" data-points="${user.gravityPoints || 0}" data-balance="${user.accountBalance || 0}"><i data-lucide="edit" class="w-5 h-5 text-yellow-400"></i></button></td>`;
                usersList.appendChild(row);
            });
            lucide.createIcons();
        });
    }
    usersList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-user-btn');
        if (editBtn) {
            editUserId.value = editBtn.dataset.id; editUserUsername.textContent = editBtn.dataset.username || 'N/A'; editUserPoints.value = editBtn.dataset.points || '0'; editUserBalance.value = parseFloat(editBtn.dataset.balance || '0').toFixed(2); editUserModal.style.display = 'flex';
        }
    });
    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault(); const userId = editUserId.value; const points = parseInt(editUserPoints.value); const balance = parseFloat(editUserBalance.value);
        if (isNaN(points) || isNaN(balance)) { alert('Ingresa números válidos para ambos campos.'); return; }
        try { await updateDoc(doc(db, "users", userId), { gravityPoints: points, accountBalance: balance }); alert('Saldos actualizados.'); editUserModal.style.display = 'none';
        } catch (error) { alert('Error al actualizar.'); console.error(error); }
    });
    cancelUserEditBtn.addEventListener('click', () => { editUserModal.style.display = 'none'; });
    generateCodeBtn.addEventListener('click', () => {
        const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; let result = '';
        for (let i = 0; i < 8; i++) { result += chars.charAt(Math.floor(Math.random() * chars.length)); }
        codeIdInput.value = result;
    });
    rewardTypeSelect.addEventListener('change', () => {
        if (rewardTypeSelect.value === 'points') {
            pointsRewardGroup.classList.remove('hidden'); majorPrizeRewardGroup.classList.add('hidden'); document.getElementById('code-points').required = true; document.getElementById('major-prize-description').required = false;
        } else {
            pointsRewardGroup.classList.add('hidden'); majorPrizeRewardGroup.classList.remove('hidden'); document.getElementById('code-points').required = false; document.getElementById('major-prize-description').required = true;
        }
    });
    createCodeForm.addEventListener('submit', async (e) => {
        e.preventDefault(); const code = codeIdInput.value; const uses = parseInt(document.getElementById('code-uses').value); const rewardType = rewardTypeSelect.value;
        if (!code || isNaN(uses)) { return alert('Por favor, genera un código y define un número de usos.'); }
        const codeData = { type: rewardType, usesLeft: uses };
        if (rewardType === 'points') {
            const points = parseInt(document.getElementById('code-points').value); if (isNaN(points) || points <= 0) return alert('La cantidad de puntos debe ser un número positivo.'); codeData.points = points;
        } else {
            const description = document.getElementById('major-prize-description').value.trim(); if (!description) return alert('Debes añadir una descripción para el Premio Mayor.'); codeData.majorPrize = description;
        }
        try { const codeRef = doc(db, "redeemCodes", code); await setDoc(codeRef, codeData); alert(`¡Código "${code}" creado con éxito!`); createCodeForm.reset(); rewardTypeSelect.dispatchEvent(new Event('change')); codeIdInput.value = '';
        } catch (error) { console.error("Error al crear el código:", error); alert("Hubo un error al crear el código."); }
    });
    function loadRedeemCodes() {
        onSnapshot(collection(db, "redeemCodes"), (snapshot) => {
            codesList.innerHTML = ''; if (snapshot.empty) { codesList.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No hay códigos creados.</td></tr>'; return; }
            snapshot.forEach(doc => {
                const code = doc.data(); const row = document.createElement('tr'); row.className = 'border-b border-gray-700'; let prizeType = ''; let prizeValue = '';
                if (code.type === 'points') { prizeType = '<span class="payment-badge points">Puntos</span>'; prizeValue = `<span class="font-bold text-purple-400">${code.points}</span>`; } else if (code.type === 'major_prize') { prizeType = '<span class="role-badge admin">Premio Mayor</span>'; prizeValue = `<span>${code.majorPrize}</span>`; }
                row.innerHTML = `<td class="p-4 font-semibold">${doc.id}</td><td class="p-4 text-center">${prizeType}</td><td class="p-4 text-center">${prizeValue}</td><td class="p-4 text-center">${code.usesLeft}</td><td class="p-4 text-right"><button class="delete-code-btn" data-id="${doc.id}"><i data-lucide="trash-2" class="w-5 h-5 text-red-500 hover:text-red-400"></i></button></td>`;
                codesList.appendChild(row);
            });
            lucide.createIcons();
        });
    }
    codesList.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-code-btn');
        if (deleteBtn) { const codeId = deleteBtn.dataset.id; if (confirm(`¿Estás seguro de que quieres eliminar el código "${codeId}"?`)) { await deleteDoc(doc(db, "redeemCodes", codeId)); alert('Código eliminado.'); } }
    });
    function loadPurchaseHistory() {
        const q = query(collection(db, "purchases"), orderBy("purchasedAt", "desc"));
        onSnapshot(q, (snapshot) => {
            purchasesList.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Cargando...</td></tr>';
            if (snapshot.empty) { purchasesList.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No se ha realizado ninguna compra.</td></tr>'; return; }
            purchasesList.innerHTML = '';
            snapshot.forEach(doc => {
                const purchase = doc.data(); const purchaseDate = purchase.purchasedAt?.toDate().toLocaleString('es-PE') || 'Fecha no disponible'; const row = document.createElement('tr'); row.className = 'border-b border-gray-700';
                row.innerHTML = `<td class="p-4">${purchase.userEmail}</td><td class="p-4 font-semibold">${purchase.itemName}</td><td class="p-4 text-center"><span class="payment-badge ${purchase.method}">${purchase.method}</span></td><td class="p-4 text-center font-bold ${purchase.method === 'points' ? 'text-purple-400' : 'text-green-400'}">${purchase.cost}</td><td class="p-4 text-sm text-gray-400">${purchaseDate}</td>`;
                purchasesList.appendChild(row);
            });
        });
    }
    function loadPrizeClaims() {
        const q = query(collection(db, "prizeClaims"), orderBy("redeemedAt", "desc"));
        onSnapshot(q, (snapshot) => {
            claimsList.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Cargando reclamos...</td></tr>';
            if (snapshot.empty) { claimsList.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">No hay premios mayores reclamados.</td></tr>'; return; }
            claimsList.innerHTML = '';
            snapshot.forEach(doc => {
                const claim = doc.data(); const claimDate = claim.redeemedAt?.toDate().toLocaleString('es-PE') || 'Fecha no disponible'; const row = document.createElement('tr'); row.className = 'border-b border-gray-700';
                let statusText = claim.status === 'unclaimed' ? 'Pendiente' : 'Entregado'; let statusClass = claim.status === 'unclaimed' ? 'unclaimed' : 'claimed';
                let actionButton = ''; if (claim.status === 'unclaimed') { actionButton = `<button class="action-btn approve claim-btn" data-id="${doc.id}" title="Marcar como Entregado"><i data-lucide="check-circle" class="w-5 h-5 text-green-400"></i></button>`; }
                row.innerHTML = `<td class="p-4 font-mono text-sm">${doc.id}</td><td class="p-4">${claim.username || claim.userId}</td><td class="p-4 font-semibold">${claim.prizeName}</td><td class="p-4 text-sm text-gray-400">${claimDate}</td><td class="p-4 text-center"><span class="claim-status-badge ${statusClass}">${statusText}</span></td><td class="p-4 text-right">${actionButton}</td>`;
                claimsList.appendChild(row);
            });
            lucide.createIcons();
        });
    }
    claimsList.addEventListener('click', async (e) => {
        const claimBtn = e.target.closest('.claim-btn');
        if (claimBtn) {
            const claimId = claimBtn.dataset.id;
            if (confirm(`¿Confirmas que has entregado este premio y quieres marcarlo como reclamado?\nID: ${claimId}`)) {
                try { await updateDoc(doc(db, "prizeClaims", claimId), { status: "claimed" }); alert('Premio marcado como entregado.');
                } catch (error) { console.error("Error al actualizar el reclamo:", error); alert("Hubo un error al actualizar el estado del reclamo."); }
            }
        }
    });
    const logoutBtn = document.getElementById('admin-logout-btn');
    logoutBtn.addEventListener('click', async () => {
        try { await signOut(auth); } catch (error) { console.error("Error al cerrar sesión:", error); }
    });
});