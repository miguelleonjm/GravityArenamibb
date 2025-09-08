import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
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

// --- SE EJECUTA CUANDO EL DOCUMENTO HTML ESTÁ COMPLETAMENTE CARGADO ---
document.addEventListener('DOMContentLoaded', () => {

    // Elementos del DOM de la página de perfil
    const pfpPreview = document.getElementById('pfp-preview');
    const pfpInput = document.getElementById('pfp-input');
    const profileForm = document.getElementById('profile-form');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const saveBtn = document.getElementById('save-btn');
    const successMessage = document.getElementById('success-message');

    // Elementos del DOM para la cabecera
    const profileIcon = document.getElementById('profile-icon');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const headerUsernameDisplay = document.getElementById('username-display');
    const headerEmailDisplay = document.getElementById('email-display');
    const headerPfp = document.getElementById('header-pfp');
    const headerDefaultIcon = document.getElementById('header-default-icon');
    const dropdownPfp = document.getElementById('dropdown-pfp');

    let currentUser = null;
    let newPfpFile = null;

    async function loadUserProfile(user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            usernameInput.value = userData.username || '';
            emailInput.value = user.email;
            phoneInput.value = userData.phone || '';
            if (userData.photoURL) {
                pfpPreview.src = userData.photoURL;
            }
        }
    }

    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            currentUser = user;
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                headerUsernameDisplay.textContent = userData.username || 'Usuario';
                headerEmailDisplay.textContent = user.email;

                // Lógica directa para mostrar/ocultar foto e ícono
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
            loadUserProfile(user);
        } else {
            window.location.href = '/index.html';
        }
    });

    if (pfpInput) {
        pfpInput.addEventListener('change', (e) => {
            newPfpFile = e.target.files[0];
            if (newPfpFile) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    pfpPreview.src = event.target.result;
                };
                reader.readAsDataURL(newPfpFile);
            }
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser) return;

            saveBtn.disabled = true;
            saveBtn.textContent = 'Guardando...';
            successMessage.style.display = 'none';

            try {
                const dataToUpdate = {
                    username: usernameInput.value.trim(),
                    phone: phoneInput.value.trim(),
                };

                if (newPfpFile) {
                    const storageRef = ref(storage, `profile-pictures/${currentUser.uid}`);
                    await uploadBytes(storageRef, newPfpFile);
                    const photoURL = await getDownloadURL(storageRef);
                    dataToUpdate.photoURL = photoURL;
                }

                const userDocRef = doc(db, "users", currentUser.uid);
                await updateDoc(userDocRef, dataToUpdate);

                successMessage.textContent = '¡Perfil actualizado con éxito!';
                successMessage.style.display = 'block';
                newPfpFile = null;

            } catch (error) {
                console.error("Error al actualizar el perfil:", error);
                alert("Hubo un error al guardar los cambios.");
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar Cambios';
            }
        });
    }

    // Lógica del menú desplegable
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
    // Lógica para cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = '/index.html';
            } catch (error) {
                console.error("Error al cerrar la sesión:", error);
            }
        });
    }
})