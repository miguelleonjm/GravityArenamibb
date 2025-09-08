// Importaciones de Firebase SDK (CORREGIDAS Y UNIFICADAS)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    sendPasswordResetEmail, 
    GoogleAuthProvider, 
    FacebookAuthProvider, // Aseguramos que esté aquí
    signInWithPopup, 
    sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Sistema de modal de alerta (sin cambios)
function showAlert(title, message, type = 'info') {
  const modalContainer = document.getElementById('alert-modal-container');
  const titleEl = document.getElementById('alert-modal-title');
  const messageEl = document.getElementById('alert-modal-message');
  const iconContainer = document.getElementById('alert-modal-icon-container');
  const closeBtn = document.getElementById('alert-modal-close-btn');

  if (!modalContainer) {
    console.error('El contenedor del modal de alerta no se encontró en el DOM.');
    alert(`${title}\n\n${message}`);
    return;
  }

  titleEl.textContent = title;
  messageEl.textContent = message;

  const icons = {
    error: `<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#E74C3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    success: `<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#2ECC71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    info: `<svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16V12M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#3498DB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  };
  
  iconContainer.innerHTML = icons[type] || icons['info'];
  modalContainer.classList.remove('alert-modal-hidden');
  const closeModal = () => { modalContainer.classList.add('alert-modal-hidden'); };
  closeBtn.onclick = closeModal;
  document.getElementById('alert-modal-backdrop').onclick = closeModal;
}

// Configuración de Firebase (sin cambios)
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

document.addEventListener('DOMContentLoaded', async () => {

// ===== SECCIÓN DE LOGIN (CORREGIDA) =====
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            // 1. Autenticar al usuario
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Verificar si el email está validado
            if (user && user.emailVerified) {
                // 3. OBTENER EL ROL DEL USUARIO DESDE FIRESTORE
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    // 4. REDIRIGIR SEGÚN EL ROL
                    if (userData.role === 'admin') {
                        window.location.href = '../admin/admin.html'; // Redirigir al panel de admin
                    } else {
                        window.location.href = '../home/home.html'; // Redirigir a la página de inicio normal
                    }
                } else {
                    // Si no hay datos del usuario, es un error. Mejor cerrar sesión.
                    await signOut(auth);
                    showAlert('Error de Usuario', 'No se encontraron los datos asociados a tu cuenta.', 'error');
                }
            } else {
                await signOut(auth);
                showAlert('Verificación Requerida', 'Debes verificar tu correo electrónico para poder iniciar sesión. Revisa tu bandeja de entrada o spam.', 'info');
            }
        } catch (error) {
            let errorTitle = "Error de Autenticación";
            let errorMessage = "Correo electrónico o contraseña incorrectos.";
            if (error.code === 'auth/invalid-email') {
                errorMessage = "El formato del correo electrónico no es válido.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "Demasiados intentos fallidos. Por favor, intenta de nuevo más tarde.";
            }
            showAlert(errorTitle, errorMessage, 'error');
        }
    });
}

    // ===== SECCIÓN DE REGISTRO =====
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        const iconSuccess = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const iconError = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        const showValidationMessage = (inputElement, message, type) => {
            const messageContainer = inputElement.nextElementSibling;
            inputElement.classList.remove('input-success', 'input-error');
            messageContainer.classList.remove('success', 'error');

            if (type === 'success') {
                inputElement.classList.add('input-success');
                messageContainer.classList.add('success');
                messageContainer.innerHTML = `${iconSuccess} <span>${message}</span>`;
            } else {
                inputElement.classList.add('input-error');
                messageContainer.classList.add('error');
                messageContainer.innerHTML = `${iconError} <span>${message}</span>`;
            }
        };

        const hideValidationMessage = (inputElement) => {
            inputElement.nextElementSibling.innerHTML = '';
            inputElement.classList.remove('input-success', 'input-error');
        };

        const validateUsername = () => {
            const username = usernameInput.value.trim();
            if (username.length === 0) { hideValidationMessage(usernameInput); return false; }
            if (username.length < 4) { showValidationMessage(usernameInput, 'Debe tener al menos 4 caracteres.', 'error'); return false; }
            showValidationMessage(usernameInput, 'Nombre de usuario válido.', 'success');
            return true;
        };

        const validateEmail = () => {
            const email = emailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (email.length === 0) { hideValidationMessage(emailInput); return false; }
            if (!emailRegex.test(email)) { showValidationMessage(emailInput, 'Formato de correo inválido.', 'error'); return false; }
            showValidationMessage(emailInput, 'Formato de correo válido.', 'success');
            return true;
        };

        const validatePassword = () => {
            const password = passwordInput.value;
            if (password.length === 0) { hideValidationMessage(passwordInput); return false; }
            if (password.length < 8) { showValidationMessage(passwordInput, 'Debe tener al menos 8 caracteres.', 'error'); return false; }
            showValidationMessage(passwordInput, 'Contraseña segura.', 'success');
            return true;
        };

        const validateConfirmPassword = () => {
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            if (confirmPassword.length === 0) { hideValidationMessage(confirmPasswordInput); return false; }
            if (confirmPassword !== password) { showValidationMessage(confirmPasswordInput, 'Las contraseñas no coinciden.', 'error'); return false; }
            showValidationMessage(confirmPasswordInput, 'Las contraseñas coinciden.', 'success');
            return true;
        };

        usernameInput.addEventListener('input', validateUsername);
        emailInput.addEventListener('input', validateEmail);
        passwordInput.addEventListener('input', () => {
            validatePassword();
            validateConfirmPassword();
        });
        confirmPasswordInput.addEventListener('input', validateConfirmPassword);

        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const isUsernameValid = validateUsername();
            const isEmailValid = validateEmail();
            const isPasswordValid = validatePassword();
            const isConfirmPasswordValid = validateConfirmPassword();

            if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
                showAlert('Formulario Incompleto', 'Por favor, corrige los campos marcados en rojo.', 'error');
                return;
            }

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username", "==", username));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    showValidationMessage(usernameInput, 'Este nombre de usuario ya existe.', 'error');
                    showAlert('Nombre no Disponible', 'El nombre de usuario que elegiste ya está en uso. Por favor, elige otro.', 'error');
                    return;
                }

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await sendEmailVerification(user);
                
                await setDoc(doc(db, "users", user.uid), {
                    username, email, role: "user", createdAt: new Date(), emailVerified: false
                });
                
                await signOut(auth);
                showAlert('¡Último Paso!', 'Se ha enviado un enlace de verificación a tu correo. Revisa tu bandeja de entrada (o spam) para activar tu cuenta.', 'success');
                
                setTimeout(() => { window.location.href = 'index.html'; }, 4000);

            } catch (error) {
                let errorTitle = "Error en el Registro";
                let errorMessage = "Ocurrió un error inesperado durante el registro.";
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = "Este correo electrónico ya está registrado.";
                    showValidationMessage(emailInput, 'Este correo ya está en uso.', 'error');
                }
                showAlert(errorTitle, errorMessage, 'error');
            }
        });
    }

    // ===== Logout =====
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = '/index.html'; // Usamos la ruta raíz
            } catch (error) {
                showAlert('Error', 'No se pudo cerrar la sesión.', 'error');
            }
        });
    }

    // ===== Recuperar contraseña =====
    const recoveryForm = document.getElementById('recoveryForm');
    if (recoveryForm) {
        recoveryForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const email = document.getElementById('recoveryEmail').value;
            try {
                await sendPasswordResetEmail(auth, email);
                showAlert('Petición Enviada', 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en tu bandeja de entrada.', 'success');
            } catch (error) {
                showAlert('Error', 'No se pudo enviar el correo. Por favor, verifica que la dirección sea correcta e inténtalo de nuevo.', 'error');
            }
        });
    }

    // ===== Login con Google =====
    const googleBtn = document.querySelector('.btn-social.google');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    await setDoc(userDocRef, {
                        username: user.displayName || 'Usuario de Google',
                        email: user.email,
                        role: 'user', 
                        createdAt: new Date(),
                        emailVerified: user.emailVerified
                    });
                }
                window.location.href = '../home/home.html';
            } catch (error) {
                showAlert('Error de Conexión', 'Hubo un problema al intentar iniciar sesión con Google. Por favor, inténtalo de nuevo.', 'error');
            }
        });
    }

    // ===== Login con Facebook =====
    const facebookBtn = document.querySelector('.btn-social.facebook');
    if (facebookBtn) {
        facebookBtn.addEventListener('click', async () => {
            const provider = new FacebookAuthProvider();
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                console.log("Inicio de sesión con Facebook exitoso:", user);
                
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    await setDoc(userDocRef, {
                        username: user.displayName || 'Usuario de Facebook',
                        email: user.email,
                        role: 'user', 
                        createdAt: new Date(),
                        emailVerified: user.emailVerified
                    });
                }
                
                window.location.href = '../home/home.html';

            } catch (error) {
                console.error("Error en el inicio de sesión con Facebook:", error);
                if (error.code === 'auth/account-exists-with-different-credential') {
                    showAlert('Cuenta ya existente', 'Ya tienes una cuenta con este email, pero fue creada con Google. Por favor, inicia sesión con Google.', 'error');
                } else {
                    showAlert('Error de Conexión', 'Hubo un problema al intentar iniciar sesión con Facebook. Por favor, inténtalo de nuevo.', 'error');
                }
            }
        });
    }

    // ===== Lógica de roles y protección de rutas =====
    onAuthStateChanged(auth, async (user) => {
        const isHomePage = window.location.pathname.includes('home.html');
        if (user) {
            if (isHomePage) {
                if (!user.emailVerified) { 
                    await signOut(auth); 
                    window.location.href = '/index.html'; // Usamos la ruta raíz
                    return; 
                }
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    if (userData.role === 'admin') {
                        if (window.showAdminUI) window.showAdminUI();
                    } else {
                        if (window.hideAdminUI) window.hideAdminUI();
                    }
                } else {
                    await signOut(auth);
                    window.location.href = '/index.html'; // Usamos la ruta raíz
                }
            }
        } else {
            if (isHomePage) {
                window.location.href = '/index.html'; // Usamos la ruta raíz
            }
        }
    });
});