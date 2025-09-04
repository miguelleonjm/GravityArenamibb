import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        // Header
        profileIcon: document.getElementById('profile-icon'),
        profileDropdown: document.getElementById('profile-dropdown'),
        logoutBtn: document.getElementById('logout-btn'),
        usernameDisplay: document.getElementById('username-display'),
        emailDisplay: document.getElementById('email-display'),
        headerPfp: document.getElementById('header-pfp'),
        headerDefaultIcon: document.getElementById('header-default-icon'),
        dropdownPfp: document.getElementById('dropdown-pfp'),
        // Wallet
        accountBalanceDisplay: document.getElementById('account-balance-display'),
        gravityPointsDisplay: document.getElementById('gravity-points-display'),
        cardUsernameDisplay: document.getElementById('card-username-display'),
        transactionsList: document.getElementById('transactions-list'),
        depositBtn: document.getElementById('deposit-btn'),
        withdrawBtn: document.getElementById('withdraw-btn'),
        vipCard: document.querySelector('.vip-wallet-card'),
        // Deposit Modals & Views
        depositModal: document.getElementById('deposit-modal'),
        paymentMethodView: document.getElementById('payment-method-view'),
        transferPaymentView: document.getElementById('transfer-payment-view'),
        yapePaymentView: document.getElementById('yape-payment-view'),
        paymentMethodOptions: document.querySelectorAll('.payment-method-option'),
        backToSelectionBtns: document.querySelectorAll('.back-to-selection-btn'),
        // Forms
        transferDepositForm: document.getElementById('transfer-deposit-form'),
        yapeDepositForm: document.getElementById('yape-deposit-form'),
        withdrawForm: document.getElementById('withdraw-form'),
        // Withdraw Modal
        withdrawModal: document.getElementById('withdraw-modal'),
        closeModalBtns: document.querySelectorAll('.close-modal-btn'),
        // Message Modal
        messageModal: document.getElementById('message-modal'),
        messageTitle: document.getElementById('message-title'),
        messageText: document.getElementById('message-text'),
        messageOkBtn: document.getElementById('message-ok-btn'),
        // Filters
        filterBtns: document.querySelectorAll('.filter-btn'),
    };

    let currentUser = null;
    let currentUserData = null;

    onAuthStateChanged(auth, (user) => {
        if (user && user.emailVerified) {
            currentUser = user;
            setupUserListener(user.uid);
            loadTransactions(user.uid, 'all');
        } else {
            window.location.href = '/index.html';
        }
    });

    function setupUserListener(uid) {
        const userDocRef = doc(db, "users", uid);
        onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                updateUI(currentUser, currentUserData);
            }
        });
    }

    function updateUI(user, userData) {
        elements.usernameDisplay.textContent = userData.username || 'Usuario';
        elements.emailDisplay.textContent = user.email;
        if (userData.photoURL) {
            elements.headerPfp.src = userData.photoURL;
            elements.dropdownPfp.src = userData.photoURL;
            elements.headerPfp.style.display = 'block';
            elements.headerDefaultIcon.style.display = 'none';
        } else {
            elements.headerPfp.style.display = 'none';
            elements.headerDefaultIcon.style.display = 'block';
        }
        elements.accountBalanceDisplay.textContent = `S/ ${(userData.accountBalance || 0).toFixed(2)}`;
        elements.gravityPointsDisplay.textContent = `★ ${userData.gravityPoints || 0}`;
        elements.cardUsernameDisplay.textContent = userData.username || 'Usuario';
    }

    async function loadTransactions(uid, filter = 'all') {
        let constraints = [where("userId", "==", uid)];
        if (filter === 'income') constraints.push(where("type", "in", ["deposit", "prize_payout"]));
        else if (filter === 'expenses') constraints.push(where("type", "in", ["withdrawal", "inscription_payment", "purchase"]));
        
        const q = query(collection(db, "transactions"), ...constraints, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        elements.transactionsList.innerHTML = '';
        if (querySnapshot.empty) {
            elements.transactionsList.innerHTML = '<p class="text-gray-500 text-center py-4">No tienes movimientos en esta categoría.</p>';
            return;
        }
        querySnapshot.forEach(doc => {
            const tx = doc.data();
            const date = tx.timestamp.toDate().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
            const isPositive = ['deposit', 'prize_payout'].includes(tx.type);
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `<div class="transaction-icon ${tx.type}"><i class="fas ${isPositive ? 'fa-arrow-up' : 'fa-arrow-down'}"></i></div><div class="transaction-details"><p class="description">${tx.description}</p><p class="date">${date}</p></div><div class="transaction-amount ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : '-'} S/ ${tx.amount.toFixed(2)}</div>`;
            elements.transactionsList.appendChild(item);
        });
    }

    function showDepositView(viewId) {
        document.querySelectorAll('.deposit-view').forEach(view => view.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
    }

    elements.depositBtn.addEventListener('click', () => {
        showDepositView('payment-method-view');
        elements.depositModal.classList.remove('hidden');
    });

    elements.withdrawBtn.addEventListener('click', () => elements.withdrawModal.classList.remove('hidden'));

    elements.closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modalId;
            document.getElementById(modalId).classList.add('hidden');
        });
    });

    elements.paymentMethodOptions.forEach(option => {
        option.addEventListener('click', () => {
            if (option.classList.contains('disabled')) return;
            const method = option.dataset.method;
            if (method === 'transfer') showDepositView('transfer-payment-view');
            else if (method === 'yape') showDepositView('yape-payment-view');
        });
    });

    elements.backToSelectionBtns.forEach(btn => {
        btn.addEventListener('click', () => showDepositView('payment-method-view'));
    });

    async function handleDepositRequest(amount, method, details) {
        try {
            await addDoc(collection(db, "depositRequests"), {
                userId: currentUser.uid,
                username: currentUserData.username,
                amount: amount,
                method: method,
                details: details,
                status: 'pendiente',
                requestedAt: serverTimestamp()
            });
            elements.depositModal.classList.add('hidden');
            showMessage('Solicitud Enviada', 'Tu solicitud de depósito ha sido enviada. Se reflejará en tu saldo una vez que sea verificada por un administrador.');
        } catch (error) {
            showMessage('Error', 'Hubo un problema al enviar tu solicitud. Inténtalo de nuevo.');
        }
    }

    elements.transferDepositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('transfer-amount').value);
        const code = document.getElementById('transfer-code').value.trim();
        const holder = document.getElementById('transfer-holder').value.trim();
        const button = e.target.querySelector('button');
        button.disabled = true;
        await handleDepositRequest(amount, 'Transferencia Bancaria', { transactionCode: code, accountHolder: holder });
        e.target.reset();
        button.disabled = false;
    });

    elements.yapeDepositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('yape-amount').value);
        const code = document.getElementById('yape-code').value.trim();
        const button = e.target.querySelector('button');
        button.disabled = true;
        await handleDepositRequest(amount, 'Yape/Plin', { transactionCode: code });
        e.target.reset();
        button.disabled = false;
    });

    elements.withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('withdraw-amount').value);
        const details = document.getElementById('withdraw-details').value.trim();
        const button = e.target.querySelector('button');
        button.disabled = true;
        if (amount > (currentUserData.accountBalance || 0)) {
            showMessage('Saldo Insuficiente', 'No puedes retirar un monto mayor a tu saldo actual.');
            button.disabled = false;
            return;
        }
        try {
            await addDoc(collection(db, "withdrawalRequests"), {
                userId: currentUser.uid,
                username: currentUserData.username,
                amount: amount,
                payoutDetails: details,
                status: 'pendiente',
                requestedAt: serverTimestamp()
            });
            elements.withdrawModal.classList.add('hidden');
            showMessage('Solicitud Enviada', 'Tu solicitud de retiro ha sido enviada. Será procesada en las próximas 24 horas.');
            e.target.reset();
        } catch (error) {
            showMessage('Error', 'Hubo un problema al enviar tu solicitud.');
        } finally {
            button.disabled = false;
        }
    });
    
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadTransactions(currentUser.uid, btn.dataset.filter);
        });
    });

    function showMessage(title, text) {
        elements.messageTitle.textContent = title;
        elements.messageText.textContent = text;
        elements.messageModal.classList.remove('hidden');
        elements.messageOkBtn.onclick = () => {
            elements.messageModal.classList.add('hidden');
        };
    }

    if (elements.vipCard) {
        elements.vipCard.addEventListener('mousemove', (e) => {
            const rect = elements.vipCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            elements.vipCard.style.setProperty('--x', `${(x / rect.width) * 100}%`);
            elements.vipCard.style.setProperty('--y', `${(y / rect.height) * 100}%`);
        });
    }
    
    // Funcionalidad del ícono de perfil restaurada
    if (elements.profileIcon) {
        elements.profileIcon.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            elements.profileDropdown.classList.toggle('show'); 
        });
    }
    document.addEventListener('click', (e) => {
        if (elements.profileDropdown && !elements.profileDropdown.contains(e.target) && !elements.profileIcon.contains(e.target)) {
            elements.profileDropdown.classList.remove('show');
        }
    });
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', () => signOut(auth));
    }
});
