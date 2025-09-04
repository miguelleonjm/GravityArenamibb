import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXLc-GA2wmNx6u_6IRYleWqEW6-BwQw_0",
  authDomain: "gravitytournamentsapp.firebaseapp.com",
  databaseURL: "https://gravitytournamentsapp-default-rtdb.firebaseio.com",
  projectId: "gravitytournamentsapp",
  storageBucket: "gravitytournamentsapp.firebasestorage.app",
  messagingSenderId: "422930488532",
  appId: "1:422930488532:web:69f48db67c5b3ba8e9af41",
  measurementId: "G-1D88DJBEQ7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- SE EJECUTA CUANDO EL DOCUMENTO HTML ESTÁ COMPLETAMENTE CARGADO ---
document.addEventListener('DOMContentLoaded', () => {
    
  // Elementos del DOM para la cabecera
  const profileIcon = document.getElementById('profile-icon');
  const profileDropdown = document.getElementById('profile-dropdown');
  const logoutBtn = document.getElementById('logout-btn');
  const usernameDisplay = document.getElementById('username-display');
  const emailDisplay = document.getElementById('email-display');
  const headerPfp = document.getElementById('header-pfp');
  const headerDefaultIcon = document.getElementById('header-default-icon');
  const dropdownPfp = document.getElementById('dropdown-pfp');

  // Observador de autenticación (tu código original sin cambios)
  onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        usernameDisplay.textContent = userData.username || 'Usuario';
        emailDisplay.textContent = user.email;

        if (userData.photoURL) {
          headerPfp.src = userData.photoURL;
          dropdownPfp.src = userData.photoURL;
          headerPfp.classList.remove('hidden');
          headerDefaultIcon.classList.add('hidden');
        } else {
          headerPfp.classList.add('hidden');
          headerDefaultIcon.classList.remove('hidden');
          dropdownPfp.src = 'https://placehold.co/48x48/1A1A1A/A8A8A8?text=G';
        }

      } else {
        await signOut(auth);
        window.location.href = '/index.html'; // Apuntamos a la nueva ubicación
      }
    } else {
      window.location.href = '/index.html'; // Apuntamos a la nueva ubicación
    }
  });

  // Lógica del menú desplegable (tu código original sin cambios)
  if (profileIcon) {
    profileIcon.addEventListener('click', (event) => {
      event.stopPropagation();
      profileDropdown.classList.toggle('show');
    });
  }
  
  document.addEventListener('click', (event) => {
    if (profileDropdown && !profileDropdown.contains(event.target) && !profileIcon.contains(event.target)) {
        profileDropdown.classList.remove('show');
    }
  });

  // Lógica para cerrar sesión (tu código original sin cambios)
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.href = '/index.html'; // Apuntamos a la nueva ubicación
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
      }
    });
  }

  // ===== INICIO DEL NUEVO CÓDIGO AÑADIDO =====
  // --- SCRIPT PARA EL HEADER AL HACER SCROLL ---
  // Función para actualizar el atributo en el body según la posición del scroll
  const handleScroll = () => {
    if (window.scrollY > 10) {
      document.body.setAttribute('data-scroll', '1');
    } else {
      document.body.setAttribute('data-scroll', '0');
    }
  };

  // Se ejecuta la función una vez al cargar por si la página ya está scrolleada
  handleScroll(); 
  
  // Se añade el listener para que se ejecute cada vez que el usuario hace scroll
  window.addEventListener('scroll', handleScroll);
  // ===== FIN DEL NUEVO CÓDIGO AÑADIDO =====

});