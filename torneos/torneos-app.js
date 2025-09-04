import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const profileIcon = document.getElementById('profile-icon');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const usernameDisplay = document.getElementById('username-display');
    const emailDisplay = document.getElementById('email-display');
    const headerPfp = document.getElementById('header-pfp');
    const headerDefaultIcon = document.getElementById('header-default-icon');
    const dropdownPfp = document.getElementById('dropdown-pfp');
    const tournamentsGrid = document.getElementById('tournaments-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let allTournaments = []; // Almacenamos todos los torneos aquí

    // --- LÓGICA DE AUTENTICACIÓN Y CARGA INICIAL ---
    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                updateHeaderUI(user, userData);
            }
            loadAllTournaments(); // Carga inicial de torneos
        } else {
            window.location.href = '/index.html';
        }
    });

    // --- LÓGICA DE TORNEOS ---
    function loadAllTournaments() {
        const tournamentsRef = collection(db, "tournaments");
        onSnapshot(tournamentsRef, (snapshot) => {
            if (snapshot.empty) {
                tournamentsGrid.innerHTML = "<p>No hay torneos disponibles en este momento.</p>";
                return;
            }
            allTournaments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTournaments('Todos'); // Renderiza todos por defecto
        });
    }

    function renderTournaments(filter) {
        tournamentsGrid.innerHTML = '';
        const filteredTournaments = filter === 'Todos' 
            ? allTournaments 
            : allTournaments.filter(t => t.game === filter);

        if (filteredTournaments.length === 0) {
            tournamentsGrid.innerHTML = `<p class="col-span-full text-center text-gray-500">No hay torneos para el juego seleccionado.</p>`;
            return;
        }

        filteredTournaments.forEach(tournament => {
            const card = document.createElement('a');
            card.href = `../detalles/detalles.html?id=${tournament.id}`;
            card.className = 'tournament-card';
            
            const statusClass = tournament.status === 'inscripciones_abiertas' ? 'abiertas' : tournament.status;
            const statusText = tournament.status.replace('_', ' ').toUpperCase();
            const costText = tournament.cost > 0 ? `S/ ${tournament.cost.toFixed(2)}` : 'Gratis';
            const progress = (tournament.participants / tournament.slots) * 100;

            card.innerHTML = `
                <div class="card-banner" style="background-image: url('${tournament.image || 'https://placehold.co/400x225/1A1A1A/FFF?text=Gravity'}')">
                    <div class="status-tag ${statusClass}">${statusText}</div>
                </div>
                <div class="card-content">
                    <p class="tournament-game">${tournament.game}</p>
                    <h3 class="tournament-name">${tournament.name}</h3>
                    <div class="card-info-grid">
                        <div class="info-item">
                            <span class="info-label">Premio</span>
                            <span class="info-value prize">${tournament.prize}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Inscripción</span>
                            <span class="info-value">${costText}</span>
                        </div>
                    </div>
                    <div class="slots-bar-container">
                        <div class="slots-bar-progress" style="width: ${progress}%"></div>
                    </div>
                    <p class="slots-text">${tournament.participants || 0} de ${tournament.slots} cupos</p>
                </div>
            `;
            tournamentsGrid.appendChild(card);
        });
    }

    // --- LÓGICA DE FILTROS ---
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const gameFilter = button.dataset.game;
            renderTournaments(gameFilter);
        });
    });

    // --- FUNCIONES DE UI Y EVENTOS ---
    function updateHeaderUI(user, userData) {
        usernameDisplay.textContent = userData.username || 'Usuario';
        emailDisplay.textContent = user.email;
        if (userData.photoURL) {
            headerPfp.src = userData.photoURL;
            dropdownPfp.src = userData.photoURL;
            headerPfp.style.display = 'block';
            headerDefaultIcon.style.display = 'none';
        } else {
            headerPfp.style.display = 'none';
            headerDefaultIcon.style.display = 'block';
        }
    }

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
