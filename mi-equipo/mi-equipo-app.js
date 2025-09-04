import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, writeBatch, onSnapshot, deleteDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBXLc-GA2wmNx6u_6IRYleWqEW6-BwQw_0",
    authDomain: "gravitytournamentsapp.firebaseapp.com",
    projectId: "gravitytournamentsapp",
    storageBucket: "gravitytournamentsapp.firebasestorage.app",
    messagingSenderId: "422930488532",
    appId: "1:422930488532:web:69f48db67c5b3ba8e9af41",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', () => {
    
    // --- ELEMENTOS DEL DOM ---
    const profileIcon = document.getElementById('profile-icon');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const headerEmailDisplay = document.getElementById('email-display');
    const headerPfp = document.getElementById('header-pfp');
    const dropdownPfp = document.getElementById('dropdown-pfp-new');
    const fullnameDisplay = document.getElementById('fullname-display');
    const noTeamView = document.getElementById('no-team-view');
    const hasTeamView = document.getElementById('has-team-view');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const chatForm = document.getElementById('chat-form');
    const chatMessageInput = document.getElementById('chat-message-input');
    const chatMessagesContainer = document.getElementById('chat-messages');

    let currentUser, currentUserData, currentTeamId, teamUnsubscribe, chatUnsubscribe;

    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            currentUser = user;
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists()) {
                currentUserData = userDocSnap.data();
                setupHeader(currentUserData);
                
                currentTeamId = currentUserData.teamId;
                if (currentTeamId) {
                    noTeamView.classList.add('hidden');
                    hasTeamView.classList.remove('hidden');
                    loadTeamData(currentTeamId);
                } else {
                    hasTeamView.classList.add('hidden');
                    noTeamView.classList.remove('hidden');
                }
            } else {
                signOut(auth);
            }
        } else {
            window.location.href = '/index.html';
        }
    });

    function setupHeader(userData) {
        fullnameDisplay.textContent = userData.fullName || userData.username;
        headerEmailDisplay.textContent = auth.currentUser.email;
        const photo = userData.photoURL;
        if (photo) {
            headerPfp.src = photo;
            dropdownPfp.src = photo;
            headerPfp.style.display = 'block';
        } else {
             headerPfp.style.display = 'none';
             dropdownPfp.src = 'https://placehold.co/48x48/1A1A1A/A8A8A8?text=G';
        }
    }

    function loadTeamData(teamId) {
        if (teamUnsubscribe) teamUnsubscribe();
        if (chatUnsubscribe) chatUnsubscribe();
        
        const teamDocRef = doc(db, "teams", teamId);
        teamUnsubscribe = onSnapshot(teamDocRef, (teamDocSnap) => {
            if (teamDocSnap.exists()) {
                const teamData = teamDocSnap.data();
                displayTeamProfile(teamData);
                displayTeamMembers(teamId, teamData.leaderId);
                setupActionButtons(teamData); // Esto configurará los botones correctamente para todos
            }
        });
        
        loadTeamChat(teamId);
        loadEnrolledTournaments(teamId);
    }
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
            });

            const targetPane = document.getElementById(`${btn.dataset.tab}-tab`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    profileIcon.addEventListener('click', (event) => {
        event.stopPropagation();
        profileDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => {
        if (profileDropdown && profileDropdown.classList.contains('show')) {
            profileDropdown.classList.remove('show');
        }
    });
    logoutBtn.addEventListener('click', () => signOut(auth));
    
    function displayTeamProfile(teamData) {
        document.getElementById('team-banner').style.backgroundImage = `url('${teamData.teamBannerURL || ''}')`;
        document.getElementById('team-logo').src = teamData.teamLogoURL || 'https://placehold.co/150x150/1A1A1A/A8A8A8?text=Logo';
        document.getElementById('team-name-display').textContent = teamData.teamName;
        document.getElementById('team-description').textContent = teamData.teamDescription || 'El líder aún no ha añadido una descripción.';
    }

    function displayTeamMembers(teamId, leaderId) {
        const membersList = document.getElementById('team-members-list');
        const membersQuery = collection(db, "teams", teamId, "members");
        onSnapshot(membersQuery, (snapshot) => {
            membersList.innerHTML = '';
            if (snapshot.empty) {
                membersList.innerHTML = '<p class="chat-placeholder" style="padding: 1rem 0;">Solo estás tú por ahora.</p>';
                return;
            }
            snapshot.forEach(memberDoc => {
                const memberData = memberDoc.data();
                const isLeader = memberDoc.id === leaderId;
                membersList.innerHTML += `
                    <li>
                        <img src="${memberData.photoURL || 'https://placehold.co/45x45/1A1A1A/A8A8A8?text=G'}" class="member-pfp">
                        <div class="member-info">
                            <span class="username">${memberData.username}</span>
                            ${isLeader ? `<span class="role">Líder</span>` : ''}
                        </div>
                    </li>`;
            });
        });
    }

    function loadTeamChat(teamId) {
        const chatQuery = query(collection(db, "teams", teamId, "messages"), orderBy("timestamp", "asc"));
        chatUnsubscribe = onSnapshot(chatQuery, (snapshot) => {
            chatMessagesContainer.innerHTML = '';
            if (snapshot.empty) {
                chatMessagesContainer.innerHTML = '<p class="chat-placeholder">Bienvenido al chat del equipo...</p>';
            } else {
                snapshot.forEach(doc => {
                    const message = doc.data();
                    const messageClass = message.senderId === currentUser.uid ? 'sent' : 'received';
                    chatMessagesContainer.innerHTML += `<div class="chat-message ${messageClass}"><div>${messageClass === 'received' ? `<div class="message-sender">${message.senderName}</div>` : ''}<p>${message.text}</p></div></div>`;
                });
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            }
        });
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = chatMessageInput.value.trim();
        if (!text || !currentTeamId) return;
        chatMessageInput.value = '';
        await addDoc(collection(db, "teams", currentTeamId, "messages"), { text, senderId: currentUser.uid, senderName: currentUserData.username, timestamp: serverTimestamp() });
    });

    async function loadEnrolledTournaments(teamId) {
        const tournamentsContainer = document.getElementById('enrolled-tournaments-list');
        tournamentsContainer.innerHTML = '<p class="chat-placeholder">Buscando torneos...</p>';
        const tournamentsQuery = query(collection(db, "tournaments"));
        const tournamentsSnapshot = await getDocs(tournamentsQuery);
        let enrolledTournaments = [];
        for (const tournamentDoc of tournamentsSnapshot.docs) {
            const enrolledRef = doc(db, "tournaments", tournamentDoc.id, "enrolledTeams", teamId);
            const enrolledSnap = await getDoc(enrolledRef);
            if (enrolledSnap.exists()) {
                enrolledTournaments.push({ id: tournamentDoc.id, ...tournamentDoc.data() });
            }
        }
        if (enrolledTournaments.length > 0) {
            tournamentsContainer.innerHTML = '';
            enrolledTournaments.forEach(t => {
                tournamentsContainer.innerHTML += `<a href="../detalles/detalles.html?id=${t.id}" class="tournament-list-item"><h4>${t.name}</h4><p>${t.game} - ${new Date(t.startDate).toLocaleDateString()}</p></a>`;
            });
        } else {
            tournamentsContainer.innerHTML = '<p class="chat-placeholder">El equipo no está inscrito en ningún torneo.</p>';
        }
    }

    // --- ⭐ FUNCIÓN MODIFICADA ---
    // Ahora asigna el evento para abandonar el equipo correctamente.
    function setupActionButtons(teamData) {
        const teamActionsContainer = document.getElementById('team-actions');
        const leaderPanel = document.getElementById('leader-actions');
        const copyCodeBtn = document.getElementById('copy-code-btn');

        // Limpiamos los botones para evitar duplicados si los datos se recargan
        teamActionsContainer.innerHTML = '';

        if (currentUser.uid === teamData.leaderId) {
            leaderPanel.classList.remove('hidden');
            document.getElementById('team-code-display').textContent = teamData.invitationCode;
            copyCodeBtn.onclick = () => { // Añadimos funcionalidad al botón de copiar
                navigator.clipboard.writeText(teamData.invitationCode).then(() => {
                    alert('¡Código copiado!');
                });
            };

            teamActionsContainer.innerHTML = `<button class="edit-btn" id="edit-team-btn">Editar Equipo</button><button class="leave-btn" id="disband-team-btn">Disolver Equipo</button>`;
            
            document.getElementById('edit-team-btn').addEventListener('click', () => {
                // Llamamos directamente a la función, no a través de 'window'
                populateEditModal(teamData); 
            });
            document.getElementById('disband-team-btn').addEventListener('click', () => disbandTeam(currentTeamId, teamData.teamName));
        
        } else { // Si el usuario NO es el líder
            leaderPanel.classList.add('hidden');
            teamActionsContainer.innerHTML = `<button class="leave-btn" id="leave-team-btn">Abandonar Equipo</button>`;
            
            // Asignamos el evento al botón para que llame a la función leaveTeam
            document.getElementById('leave-team-btn').addEventListener('click', () => leaveTeam(currentTeamId));
        }
    }

    function setupActionForms() {
        document.getElementById('create-team-form').addEventListener('submit', createTeam);
        document.getElementById('join-team-form').addEventListener('submit', joinTeam);
    }
    
    // --- FUNCIONES DE CREAR, UNIRSE Y GESTIONAR EQUIPO ---

    async function createTeam(e) {
        e.preventDefault();
        const teamNameInput = document.getElementById('new-team-name');
        const teamName = teamNameInput.value.trim();
        if (!teamName || !currentUser) return;

        const button = e.target.querySelector('button');
        button.disabled = true;
        button.textContent = 'Creando...';

        try {
            const invitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            const teamDocRef = await addDoc(collection(db, "teams"), {
                teamName: teamName,
                leaderId: currentUser.uid,
                leaderName: currentUserData.username,
                invitationCode: invitationCode,
                teamDescription: '',
                teamLogoURL: '',
                teamBannerURL: '',
                createdAt: serverTimestamp()
            });

            const teamId = teamDocRef.id;
            const batch = writeBatch(db);

            const teamMemberRef = doc(db, "teams", teamId, "members", currentUser.uid);
            batch.set(teamMemberRef, {
                username: currentUserData.username,
                photoURL: currentUserData.photoURL || null
            });

            const userDocRef = doc(db, "users", currentUser.uid);
            batch.update(userDocRef, { teamId: teamId });

            await batch.commit();

            // En lugar de actualizar la UI manualmente, recargamos la página.
            // Esto asegura que todo el estado (botones, chat, etc.) se cargue correctamente.
            window.location.reload();

        } catch (error) {
            console.error("Error al crear el equipo:", error);
            alert("Hubo un error al crear el equipo. Inténtalo de nuevo.");
            button.disabled = false;
            button.textContent = 'Fundar Equipo';
        }
    }

    // --- ⭐ FUNCIÓN MODIFICADA ---
    // Al unirse, se recarga la página para asegurar que el nuevo miembro tenga todos los controles.
    async function joinTeam(e) {
        e.preventDefault();
        const invitationCodeInput = document.getElementById('invitation-code');
        const code = invitationCodeInput.value.trim();
        if (!code || !currentUser) return;
        
        const button = e.target.querySelector('button');
        button.disabled = true;
        button.textContent = 'Uniéndote...';

        try {
            const q = query(collection(db, "teams"), where("invitationCode", "==", code));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("Código de invitación inválido o no encontrado.");
                button.disabled = false;
                button.textContent = 'Unirme';
                return;
            }

            const teamDoc = querySnapshot.docs[0];
            const teamId = teamDoc.id;
            const batch = writeBatch(db);

            const teamMemberRef = doc(db, "teams", teamId, "members", currentUser.uid);
            batch.set(teamMemberRef, {
                username: currentUserData.username,
                photoURL: currentUserData.photoURL || null
            });

            const userDocRef = doc(db, "users", currentUser.uid);
            batch.update(userDocRef, { teamId: teamId });

            await batch.commit();
            
            // ¡SOLUCIÓN CLAVE! Recarga la página para que la UI se inicialice con los permisos correctos.
            window.location.reload();

        } catch (error) {
            console.error("Error al unirse al equipo:", error);
            alert("Hubo un error al unirse al equipo. Inténtalo de nuevo.");
            button.disabled = false;
            button.textContent = 'Unirme';
        }
    }

    // --- ⭐ NUEVA FUNCIÓN AÑADIDA ---
    // Esta función permite a un miembro abandonar el equipo.
    async function leaveTeam(teamId) {
        if (!confirm("¿Estás seguro de que quieres abandonar este equipo?")) {
            return;
        }

        try {
            const batch = writeBatch(db);

            // 1. Borra el documento del miembro de la subcolección del equipo
            const memberRef = doc(db, "teams", teamId, "members", currentUser.uid);
            batch.delete(memberRef);

            // 2. Actualiza el documento del usuario para quitarle el teamId
            const userRef = doc(db, "users", currentUser.uid);
            batch.update(userRef, { teamId: null });

            await batch.commit();

            // Recarga la página para mostrar la vista "sin equipo"
            window.location.reload();

        } catch (error) {
            console.error("Error al abandonar el equipo:", error);
            alert("Hubo un error al abandonar el equipo.");
        }
    }

    async function disbandTeam(teamId, teamName) {
        if (!confirm(`¿Estás seguro de que quieres disolver el equipo "${teamName}"? Esta acción es irreversible.`)) {
            return;
        }

        try {
            const batch = writeBatch(db);
            const membersQuery = query(collection(db, "teams", teamId, "members"));
            const membersSnapshot = await getDocs(membersQuery);
            
            membersSnapshot.forEach(memberDoc => {
                batch.delete(doc(db, "teams", teamId, "members", memberDoc.id));
                const userRef = doc(db, "users", memberDoc.id);
                batch.update(userRef, { teamId: null });
            });

            const teamRef = doc(db, "teams", teamId);
            batch.delete(teamRef);

            await batch.commit();
            window.location.reload();

        } catch (error) {
            console.error("Error al disolver el equipo:", error);
            alert("Hubo un error al disolver el equipo.");
        }
    }

    // --- LÓGICA DEL MODAL REDISEÑADO ---
    // (Esta sección no necesita cambios)
    function setupModal() {
        const modal = document.getElementById('edit-team-modal');
        if(!modal) return;
        const editTeamForm = document.getElementById('edit-team-form');
        const logoPreview = document.getElementById('logo-preview');
        const bannerPreview = document.getElementById('banner-preview');
        const logoInput = document.getElementById('edit-team-logo');
        const bannerInput = document.getElementById('edit-team-banner');
        const teamNameInput = document.getElementById('edit-team-name');
        const teamDescriptionInput = document.getElementById('edit-team-description');

        const closeModal = () => modal.classList.add('hidden');
        document.getElementById('close-modal-btn').addEventListener('click', closeModal);
        document.getElementById('cancel-edit-btn').addEventListener('click', closeModal);

        // Hacemos que esta función sea accesible globalmente dentro del módulo
        window.populateEditModal = (teamData) => {
            teamNameInput.value = teamData.teamName;
            teamDescriptionInput.value = teamData.teamDescription || '';
            logoPreview.src = teamData.teamLogoURL || 'https://placehold.co/100x100/1A1A1A/A8A8A8?text=Logo';
            bannerPreview.src = teamData.teamBannerURL || 'https://placehold.co/250x100/1A1A1A/A8A8A8?text=Banner';
            modal.classList.remove('hidden');
        };

        logoInput.addEventListener('change', e => {
            if (e.target.files[0]) logoPreview.src = URL.createObjectURL(e.target.files[0]);
        });
        bannerInput.addEventListener('change', e => {
            if (e.target.files[0]) bannerPreview.src = URL.createObjectURL(e.target.files[0]);
        });

        editTeamForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('.btn-primary');
            btn.disabled = true;
            btn.textContent = 'Guardando...';

            try {
                const data = {
                    teamName: teamNameInput.value,
                    teamDescription: teamDescriptionInput.value,
                };
                const logoFile = logoInput.files[0];
                const bannerFile = bannerInput.files[0];
                if (logoFile) {
                    const logoRef = ref(storage, `team-logos/${currentTeamId}`);
                    await uploadBytes(logoRef, logoFile);
                    data.teamLogoURL = await getDownloadURL(logoRef);
                }
                if (bannerFile) {
                    const bannerRef = ref(storage, `team-banners/${currentTeamId}`);
                    await uploadBytes(bannerRef, bannerFile);
                    data.teamBannerURL = await getDownloadURL(bannerRef);
                }
                await updateDoc(doc(db, "teams", currentTeamId), data);
            } catch (error) {
                console.error("Error al actualizar equipo:", error);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Guardar Cambios';
                closeModal();
            }
        });
    }

    // Inicializar las funciones principales
    setupActionForms();
    setupModal();
});