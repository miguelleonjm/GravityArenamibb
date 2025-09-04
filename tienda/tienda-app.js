import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, writeBatch, increment, serverTimestamp, onSnapshot, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
    const elements = {
        profileIcon: document.getElementById('profile-icon'),
        profileDropdown: document.getElementById('profile-dropdown'),
        logoutBtn: document.getElementById('logout-btn'),
        usernameDisplay: document.getElementById('username-display'),
        emailDisplay: document.getElementById('email-display'),
        headerPfp: document.getElementById('header-pfp'),
        headerDefaultIcon: document.getElementById('header-default-icon'),
        dropdownPfp: document.getElementById('dropdown-pfp'),
        userPointsDisplay: document.getElementById('user-points-display'),
        shopItemsGrid: document.getElementById('shop-items-grid'),
        categoryFilters: document.getElementById('category-filters'),
        redeemForm: document.getElementById('redeem-code-form'),
        redeemMessage: document.getElementById('redeem-message'),
        purchaseModal: document.getElementById('purchase-modal'),
        closePurchaseModalBtn: document.getElementById('close-purchase-modal-btn'),
        purchaseItemImage: document.getElementById('purchase-item-image'),
        purchaseItemName: document.getElementById('purchase-item-name'),
        purchaseItemDescription: document.getElementById('purchase-item-description'),
        purchaseWithPointsOption: document.getElementById('purchase-with-points-option'),
        purchaseWithMoneyOption: document.getElementById('purchase-with-money-option'),
        purchasePricePoints: document.getElementById('purchase-price-points'),
        purchasePriceReal: document.getElementById('purchase-price-real'),
        buyWithPointsBtn: document.getElementById('buy-with-points-btn'),
        buyWithMoneyBtn: document.getElementById('buy-with-money-btn'),
        userPointsBalance: document.getElementById('user-points-balance'),
        userMoneyBalance: document.getElementById('user-money-balance'),
        celebrationModal: document.getElementById('major-prize-celebration-modal'),
        prizeRevealBox: document.querySelector('.prize-reveal-box'),
        prizeNameDisplay: document.getElementById('prize-name-display'),
        whatsappSupportLink: document.getElementById('whatsapp-support-link'),
        closePrizeModalBtn: document.getElementById('close-prize-modal-btn'),
        animatedTextsContainer: document.querySelector('.animated-texts-container'),
        confettiContainer: document.querySelector('.confetti-container'),
        moneyContainer: document.getElementById('money-container'),
        claimCodeDisplay: document.getElementById('claim-code-display'),
        messageModal: document.getElementById('message-modal'),
        messageTitle: document.getElementById('message-title'),
        messageText: document.getElementById('message-text'),
        messageButtons: document.getElementById('message-buttons'),
        messageOkBtn: document.getElementById('message-ok-btn'),
        messageCancelBtn: document.getElementById('message-cancel-btn'),
    };

    let currentUser = null;
    let currentUserData = null;
    let allShopItems = [];
    let unsubscribeUserListener = null;

    onAuthStateChanged(auth, (user) => {
        if (user && user.emailVerified) {
            currentUser = user;
            if (unsubscribeUserListener) unsubscribeUserListener();
            const userDocRef = doc(db, "users", user.uid);
            unsubscribeUserListener = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    currentUserData = { id: user.uid, ...docSnap.data() };
                    updateUIWithUserData(user, currentUserData);
                } else {
                    signOut(auth);
                }
            });
            if (allShopItems.length === 0) {
                loadShopItems();
            }
        } else {
            window.location.href = '/index.html';
        }
    });

    function updateUIWithUserData(user, userData) {
        // --- INICIO DE LA CORRECCIÓN ---
        // Se actualiza la lógica del perfil para usar la clase .hidden, que es más robusta
        elements.usernameDisplay.textContent = userData.username || 'Usuario';
        elements.emailDisplay.textContent = user.email;
        if (userData.photoURL) {
            elements.headerPfp.src = userData.photoURL;
            elements.dropdownPfp.src = userData.photoURL;
            elements.headerPfp.classList.remove('hidden');
            elements.headerDefaultIcon.classList.add('hidden');
        } else {
            elements.headerPfp.classList.add('hidden');
            elements.headerDefaultIcon.classList.remove('hidden');
            elements.dropdownPfp.src = 'https://placehold.co/48x48/1A1A1A/A8A8A8?text=G';
        }
        // --- FIN DE LA CORRECCIÓN ---
        elements.userPointsDisplay.textContent = userData.gravityPoints || 0;
    }

    async function loadShopItems() {
        const querySnapshot = await getDocs(collection(db, "shopItems"));
        allShopItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const categories = ['Todos', ...new Set(allShopItems.map(item => item.category))];
        renderCategories(categories);
        renderItems('Todos');
    }

    function renderCategories(categories) {
        elements.categoryFilters.innerHTML = '';
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            if (category === 'Todos') button.classList.add('active');
            button.dataset.category = category;
            button.textContent = category;
            elements.categoryFilters.appendChild(button);
        });
        document.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                renderItems(button.dataset.category);
            });
        });
    }

    function renderItems(category) {
        elements.shopItemsGrid.innerHTML = '';
        const filteredItems = category === 'Todos' ? allShopItems : allShopItems.filter(item => item.category === category);
        filteredItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.addEventListener('click', () => openPurchaseModal(item));
            let pricesHTML = '';
            if (item.pricePoints > 0) pricesHTML += `<div class="price-tag points"><i class="fas fa-star"></i> ${item.pricePoints}</div>`;
            if (item.priceReal > 0) pricesHTML += `<div class="price-tag money">S/ ${item.priceReal.toFixed(2)}</div>`;
            card.innerHTML = `<div class="item-image" style="background-image: url('${item.imageUrl || 'https://placehold.co/300x300/1A1A1A/FFF?text=Gravity'}')"></div><div class="item-info"><h3 class="item-name">${item.name}</h3><div class="item-prices">${pricesHTML}</div></div>`;
            elements.shopItemsGrid.appendChild(card);
        });
    }

    function openPurchaseModal(item) {
        elements.purchaseItemImage.style.backgroundImage = `url('${item.imageUrl}')`;
        elements.purchaseItemName.textContent = item.name;
        elements.purchaseItemDescription.textContent = item.description;
        const userPoints = currentUserData.gravityPoints || 0;
        const userMoney = currentUserData.accountBalance || 0;
        elements.userPointsBalance.textContent = userPoints;
        elements.userMoneyBalance.textContent = userMoney.toFixed(2);
        if (item.pricePoints > 0) {
            elements.purchaseWithPointsOption.style.display = 'flex';
            elements.purchasePricePoints.textContent = item.pricePoints;
            elements.buyWithPointsBtn.disabled = userPoints < item.pricePoints;
            elements.buyWithPointsBtn.onclick = () => handlePurchase(item, 'points');
        } else {
            elements.purchaseWithPointsOption.style.display = 'none';
        }
        if (item.priceReal > 0) {
            elements.purchaseWithMoneyOption.style.display = 'flex';
            elements.purchasePriceReal.textContent = item.priceReal.toFixed(2);
            elements.buyWithMoneyBtn.disabled = userMoney < item.priceReal;
            elements.buyWithMoneyBtn.onclick = () => handlePurchase(item, 'money');
        } else {
            elements.purchaseWithMoneyOption.style.display = 'none';
        }
        elements.purchaseModal.classList.remove('hidden');
    }

    async function handlePurchase(item, method) {
        const cost = method === 'points' ? item.pricePoints : item.priceReal;
        const currency = method === 'points' ? 'puntos' : 'S/';
        
        const confirmed = await showMessage(
            'Confirmar Compra', 
            `¿Estás seguro de que quieres comprar "${item.name}" por ${cost} ${currency}?`,
            true
        );

        if (!confirmed) return;

        const userRef = doc(db, "users", currentUser.uid);
        try {
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("Usuario no encontrado.");
                const userData = userDoc.data();
                if (method === 'points') {
                    const currentPoints = userData.gravityPoints || 0;
                    if (currentPoints < cost) throw new Error("No tienes suficientes puntos.");
                    transaction.update(userRef, { gravityPoints: increment(-cost) });
                } else {
                    const currentBalance = userData.accountBalance || 0;
                    if (currentBalance < cost) throw new Error("No tienes saldo suficiente.");
                    transaction.update(userRef, { accountBalance: increment(-cost) });
                    const txRef = doc(collection(db, "transactions"));
                    transaction.set(txRef, { userId: currentUser.uid, type: 'purchase', description: `Compra de ${item.name}`, amount: cost, timestamp: serverTimestamp() });
                }
                const purchaseRef = doc(collection(db, "purchases"));
                transaction.set(purchaseRef, { userId: currentUser.uid, userEmail: currentUser.email, itemName: item.name, itemId: item.id, method, cost, purchasedAt: serverTimestamp() });
            });
            elements.purchaseModal.classList.add('hidden');
            await showMessage('¡Compra Exitosa!', `Has comprado "${item.name}" correctamente.`);
        } catch (error) {
            await showMessage('Error en la Compra', 'Hubo un problema al procesar tu compra: ' + error.message);
        }
    }

    elements.redeemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeInput = document.getElementById('redeem-code-input');
        const button = elements.redeemForm.querySelector('button');
        const code = codeInput.value.trim().toUpperCase();
        if (!code) return;
        button.disabled = true;
        button.innerHTML = '...';
        elements.redeemMessage.textContent = '';
        try {
            let codeDataResult = null;
            const codeRef = doc(db, "redeemCodes", code);
            const userRef = doc(db, "users", currentUser.uid);
            await runTransaction(db, async (transaction) => {
                const codeDoc = await transaction.get(codeRef);
                if (!codeDoc.exists() || codeDoc.data().usesLeft <= 0) throw new Error("Código no válido o sin usos.");
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists()) throw new Error("Usuario no encontrado.");
                const userData = userDoc.data();
                if (userData.redeemedCodes?.includes(code)) throw new Error("Ya has canjeado este código.");
                const codeData = codeDoc.data();
                codeDataResult = codeData;
                transaction.update(codeRef, { usesLeft: increment(-1) });
                const redeemedCodes = userData.redeemedCodes || [];
                redeemedCodes.push(code);
                if (codeData.type === 'points') {
                    transaction.update(userRef, { gravityPoints: increment(codeData.points), redeemedCodes });
                } else {
                    transaction.update(userRef, { redeemedCodes });
                }
            });
            if (codeDataResult.type === 'points') {
                elements.redeemMessage.textContent = `¡Felicidades! Has ganado ${codeDataResult.points} Puntos Gravity.`;
                elements.redeemMessage.style.color = '#2ECC71';
            } else if (codeDataResult.type === 'major_prize') {
                const claimsCollectionRef = collection(db, "prizeClaims");
                const newClaimRef = await addDoc(claimsCollectionRef, {
                    userId: currentUser.uid,
                    username: currentUserData.username,
                    prizeName: codeDataResult.majorPrize,
                    redeemedAt: serverTimestamp(),
                    status: 'unclaimed',
                    redeemCodeUsed: code
                });
                showMajorPrizeCelebration(codeDataResult.majorPrize, newClaimRef.id);
            }
            codeInput.value = '';
        } catch (error) {
            elements.redeemMessage.textContent = error.message;
            elements.redeemMessage.style.color = '#E74C3C';
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-arrow-right"></i>';
        }
    });

    function showMajorPrizeCelebration(prizeName, claimId) {
        elements.celebrationModal.classList.remove('hidden');
        elements.prizeRevealBox.classList.add('hidden');
        elements.animatedTextsContainer.style.display = 'block';
        elements.animatedTextsContainer.innerHTML = '';
        elements.confettiContainer.innerHTML = '';
        elements.moneyContainer.innerHTML = '';
        try { const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fmtriangle" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 1 }, volume: -10 }).toDestination(); const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.5 }).toDestination(); synth.connect(reverb); const now = Tone.now(); const notes = ["C5", "E5", "G5", "C6", "G5", "E5"]; notes.forEach((note, i) => { synth.triggerAttackRelease(note, "16n", now + i * 0.08); }); } catch (err) { console.error("Error al reproducir el sonido con Tone.js:", err); }
        for (let i = 0; i < 150; i++) { const confetti = document.createElement('div'); confetti.className = 'confetti'; if (Math.random() > 0.5) confetti.classList.add('triangle'); confetti.style.left = `${Math.random() * 100}vw`; confetti.style.animation = `fall ${2 + Math.random() * 3}s linear ${Math.random() * 4}s infinite`; confetti.style.backgroundColor = Math.random() > 0.5 ? 'var(--accent-color)' : 'var(--success-color)'; elements.confettiContainer.appendChild(confetti); }
        for (let i = 0; i < 75; i++) { const moneyBill = document.createElement('div'); moneyBill.className = 'money-bill'; moneyBill.style.left = `${Math.random() * 100}vw`; moneyBill.style.animation = `fall ${3 + Math.random() * 4}s linear ${Math.random() * 5}s infinite`; elements.moneyContainer.appendChild(moneyBill); }
        const messages = ["¡FELICIDADES!", "Tu esfuerzo ha dado sus frutos", "Has demostrado tu habilidad", "¡La comunidad de Gravity celebra tu victoria!", "Esto es solo el comienzo..."];
        let totalDelay = 500;
        messages.forEach((msg) => { setTimeout(() => { const textEl = document.createElement('h2'); textEl.className = 'animated-text'; textEl.textContent = msg; elements.animatedTextsContainer.innerHTML = ''; elements.animatedTextsContainer.appendChild(textEl); textEl.classList.add('show'); }, totalDelay); totalDelay += 3000; });
        setTimeout(() => {
            elements.animatedTextsContainer.style.display = 'none';
            elements.prizeRevealBox.classList.remove('hidden');
            elements.prizeNameDisplay.textContent = prizeName;
            elements.claimCodeDisplay.textContent = claimId;
            elements.whatsappSupportLink.href = `https://wa.me/51987654321?text=${encodeURIComponent(`¡Hola! Gané un premio: '${prizeName}'. Mi código de reclamo es: ${claimId}`)}`;
        }, totalDelay);
    }

    elements.closePrizeModalBtn.addEventListener('click', () => {
        elements.celebrationModal.classList.add('hidden');
        elements.confettiContainer.innerHTML = '';
        elements.moneyContainer.innerHTML = '';
    });

    function showMessage(title, text, isConfirmation = false) {
        return new Promise((resolve) => {
            elements.messageTitle.textContent = title;
            elements.messageText.textContent = text;
            if (isConfirmation) {
                elements.messageCancelBtn.style.display = 'inline-block';
                elements.messageOkBtn.textContent = 'Confirmar';
            } else {
                elements.messageCancelBtn.style.display = 'none';
                elements.messageOkBtn.textContent = 'OK';
            }
            elements.messageModal.classList.remove('hidden');
            elements.messageOkBtn.onclick = () => {
                elements.messageModal.classList.add('hidden');
                resolve(true);
            };
            elements.messageCancelBtn.onclick = () => {
                elements.messageModal.classList.add('hidden');
                resolve(false);
            };
        });
    }

    elements.closePurchaseModalBtn.addEventListener('click', () => elements.purchaseModal.classList.add('hidden'));
    if (elements.profileIcon) {
        elements.profileIcon.addEventListener('click', (e) => { e.stopPropagation(); elements.profileDropdown.classList.toggle('show'); });
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