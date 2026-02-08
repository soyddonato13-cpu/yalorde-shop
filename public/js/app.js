// 1. Global State & Cart System
let productsData = [];
let currentUser = null;
let appliedDiscount = { type: 'none', value: 0, code: '' };

// Cart is loaded from cart.js

// 2. DOM Ready Logic
document.addEventListener('DOMContentLoaded', async () => {
    Cart.init();
    try {
        // Load Products
        const prodRes = await fetch('/api/products');
        if (prodRes.ok) {
            productsData = await prodRes.json();
            renderProducts(productsData);
        }

        // Load CMS Content
        const contentRes = await fetch('/api/content');
        if (contentRes.ok) {
            const content = await contentRes.json();
            applyContent(content);
        }

    } catch (error) {
        console.error('Error loading data:', error);
    }
    console.log("App Initialized v9.2");
});

// 3. Helper Functions
// 3. Helper Functions
function applyContent(content) {
    if (content.themeColor) {
        document.documentElement.style.setProperty('--primary', content.themeColor);
    }
    if (content.heroTitle) document.getElementById('cms-hero-title').textContent = content.heroTitle;
    if (content.heroSubtitle) document.getElementById('cms-hero-sub').textContent = content.heroSubtitle;
    if (content.heroImg) {
        const hero = document.getElementById('cms-hero');
        if (hero) hero.style.backgroundImage = `url('${content.heroImg}')`;
    }

    // Background Image with Blur Logic
    if (content.backgroundImage) {
        let bgDiv = document.getElementById('dynamic-bg');
        if (!bgDiv) {
            bgDiv = document.createElement('div');
            bgDiv.id = 'dynamic-bg';
            bgDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:-1; background-size:cover; background-position:center; filter:blur(8px) brightness(0.7); transform:scale(1.1); pointer-events:none; transition: background-image 0.5s ease;';
            document.body.prepend(bgDiv);
        }
        bgDiv.style.backgroundImage = `url('${content.backgroundImage}')`;
    }

    if (content.infoBar) document.getElementById('cms-info-bar').innerHTML = content.infoBar;

    // Social Links Logic
    const configSocial = (id, url) => {
        const el = document.getElementById(id);
        if (el) {
            if (url && (url.startsWith('http') || url.startsWith('wa.me'))) {
                el.href = url;
                el.style.display = 'inline-flex';
            } else {
                el.style.display = 'none'; // Hide if no URL
            }
        }
    };
    configSocial('cms-social-wa', content.whatsapp);
    configSocial('cms-social-insta', content.instagram);
    configSocial('cms-social-tiktok', content.tiktok);

    if (content.faq && Array.isArray(content.faq)) {
        const faqContainer = document.getElementById('cms-faq-list');
        if (faqContainer) {
            faqContainer.innerHTML = content.faq.map(item => `
                <div class="faq-item" onclick="toggleFaq(this)">
                    <div class="faq-question">
                        <span>${item.question}</span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </div>
                    <div class="faq-answer">
                        <p>${item.answer}</p>
                    </div>
                </div>
            `).join('');
        }
    }
}

function toggleFaq(el) {
    el.classList.toggle('active');
}

function toggleFavorite() {
    Toast.info("¡Próximamente! Podrás guardar tus favoritos muy pronto. ✨");
}
// Helper to create product card
function createProductCard(product) {
    const totalStock = Object.values(product.sizes || {}).reduce((a, b) => a + (b.stock || 0), 0);
    const lowStock = totalStock < 5 && totalStock > 0;
    const outOfStock = totalStock === 0;

    const card = document.createElement('div');
    card.className = 'product-card fade-in';
    card.onclick = () => openProductModal(product.id);

    let stockTag = '';
    if (outOfStock) {
        stockTag = `<div class="stock-tag">AGOTADO</div>`;
    } else if (lowStock) {
        stockTag = `<div class="stock-tag low">ÚLTIMAS UNIDADES</div>`;
    }

    const trendingIcon = product.isTrending ? '<span style="font-size: 0.7em;" title="Tendencia">🔥</span>' : '';
    const offerIcon = product.isOffer ? '<span style="font-size: 0.7em; margin-left:5px; background:#ffeaa7; padding:2px; border-radius:4px;" title="Oferta">🏷️</span>' : '';
    const priceDisplay = product.price ? product.price.toFixed(2) : '0.00';

    card.innerHTML = `
        <div class="product-image">
            <img src="${product.img}" alt="${product.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300'">
            ${stockTag}
        </div>
        <div class="product-info">
            <h4 class="product-title">
                ${product.title} 
                ${trendingIcon}
                ${offerIcon}
            </h4>
            <div class="product-price-row">
                <span class="product-price">$${priceDisplay}</span>
                <button class="add-btn"><i class="fa-solid fa-plus"></i></button>
            </div>
        </div>
    `;
    return card;
}

function renderProducts(products, isFiltered = false) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // Handle Sections Visibility
    const recentSec = document.getElementById('section-recent');
    const offersSec = document.getElementById('section-offers');

    // Logic for Recents (Newest 4)
    if (recentSec) {
        if (!isFiltered) {
            const gridRecent = document.getElementById('grid-recent');
            const recents = [...productsData].reverse().slice(0, 4);
            if (recents.length > 0 && gridRecent) {
                gridRecent.innerHTML = '';
                const frag = document.createDocumentFragment();
                recents.forEach(p => frag.appendChild(createProductCard(p)));
                gridRecent.appendChild(frag);
                recentSec.style.display = 'block';
            } else recentSec.style.display = 'none';
        } else recentSec.style.display = 'none';
    }

    // Logic for Offers
    if (offersSec) {
        if (!isFiltered) {
            const gridOffers = document.getElementById('grid-offers');
            const offers = productsData.filter(p => p.isOffer);
            if (offers.length > 0 && gridOffers) {
                gridOffers.innerHTML = '';
                const frag = document.createDocumentFragment();
                offers.forEach(p => frag.appendChild(createProductCard(p)));
                gridOffers.appendChild(frag);
                offersSec.style.display = 'block';
            } else offersSec.style.display = 'none';
        } else offersSec.style.display = 'none';
    }

    if (products.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;">No se encontraron productos con estos criterios.</div>`;
        return;
    }

    // Sort: Trending items first
    const sortedProducts = [...products].sort((a, b) => {
        if (a.isTrending === b.isTrending) return 0;
        return a.isTrending ? -1 : 1;
    });

    const fragment = document.createDocumentFragment();
    sortedProducts.forEach(product => {
        fragment.appendChild(createProductCard(product));
    });

    grid.appendChild(fragment);
}

function handleSearch() {
    const term = document.getElementById('smart-search').value.toLowerCase();
    const title = document.getElementById('category-title');

    if (term.length === 0) {
        renderProducts(productsData, false); // False = show sections
        title.textContent = "TENDENCIA AHORA";
        return;
    }

    const filtered = productsData.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
    );

    renderProducts(filtered, true); // True = hide sections
    title.textContent = `Resultados para "${term}"`;
}

function filterCategory(category) {
    const title = document.getElementById('category-title');
    if (category === 'all') {
        renderProducts(productsData, false);
        title.textContent = "TENDENCIA AHORA";
    } else {
        const filtered = productsData.filter(p => p.category === category);
        renderProducts(filtered, true);
        title.textContent = category.toUpperCase();
    }
}

// === PRODUCT MODAL ===
let currentProduct = null;
let selectedSize = null;

function openProductModal(id) {
    currentProduct = productsData.find(p => p.id === id);
    if (!currentProduct) return;

    document.getElementById('modal-img').src = currentProduct.img;
    document.getElementById('modal-title').textContent = currentProduct.title;
    document.getElementById('modal-price').textContent = `$${currentProduct.price.toFixed(2)}`;
    document.getElementById('modal-desc').textContent = currentProduct.description;

    // Render Sizes
    const sizesContainer = document.getElementById('modal-sizes');
    sizesContainer.innerHTML = '';
    selectedSize = null;
    toggleAddButton();

    for (const [size, details] of Object.entries(currentProduct.sizes)) {
        const btn = document.createElement('div');
        btn.className = `size-btn ${details.stock === 0 ? 'disabled' : ''}`;
        btn.textContent = size;
        if (details.stock > 0) {
            btn.onclick = () => selectSize(size, btn);
        }
        sizesContainer.appendChild(btn);
    }

    document.getElementById('product-modal').classList.add('active');
}

function selectSize(size, btnElement) {
    selectedSize = size;
    // Visually update buttons
    const allBtns = document.querySelectorAll('.size-btn');
    allBtns.forEach(b => b.classList.remove('selected'));
    btnElement.classList.add('selected');
    toggleAddButton();
}

function toggleAddButton() {
    const btnAdd = document.getElementById('modal-add-btn');
    const btnBuy = document.getElementById('modal-buy-btn'); // Secondary button

    if (selectedSize) {
        // Enable Add
        btnAdd.classList.add('enabled');
        btnAdd.onclick = addToCart;
        btnAdd.textContent = `AÑADIR - ${selectedSize}`;

        // Enable Buy
        if (btnBuy) {
            btnBuy.classList.add('enabled');
            btnBuy.onclick = buyNow;
            btnBuy.textContent = "COMPRAR AHORA";
            btnBuy.disabled = false;
        }
    } else {
        // Disable Add
        btnAdd.classList.remove('enabled');
        btnAdd.textContent = 'SELECCIONA TALLA';
        btnAdd.onclick = null;

        // Disable Buy
        if (btnBuy) {
            btnBuy.classList.remove('enabled');
            btnBuy.disabled = true;
            btnBuy.onclick = null;
        }
    }
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}

function addToCart() {
    console.log("Adding to cart...", currentProduct, selectedSize);
    if (!currentProduct || !selectedSize) {
        console.error("Missing product or size");
        return;
    }

    Cart.add(currentProduct, selectedSize);

    closeProductModal();
    toggleCart(); // Show cart immediately
}

function buyNow() {
    if (!currentProduct || !selectedSize) return;

    // Add to cart
    Cart.add(currentProduct, selectedSize);

    closeProductModal();
    // Go straight to checkout
    openCheckout();
}

// === CART & MENU ===
function toggleMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    if (menu && overlay) {
        menu.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar && overlay) {
        if (!sidebar.classList.contains('active')) {
            renderCartItems();
        }
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total-price');

    if (Cart.items.length === 0) {
        container.innerHTML = '<div class="empty-cart-msg" style="text-align:center; padding:30px; color:#999;">Tu bolsa está vacía</div>';
        totalEl.textContent = "$0.00";
        return;
    }

    container.innerHTML = Cart.items.map((item, index) => `
        <div class="cart-item">
            <img src="${item.img}" alt="${item.title}">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.title}</div>
                <div class="cart-item-meta">Talla: ${item.size} | Cant: ${item.qty}</div>
                <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
            </div>
            <div class="cart-item-remove" onclick="Cart.remove(${index}); renderCartItems();">
                <i class="fa-solid fa-trash"></i>
            </div>
        </div>
    `).join('');

    totalEl.textContent = `$${Cart.total().toFixed(2)}`;
}

// === CHECKOUT LOGIC ===
function openCheckout() {
    if (Cart.items.length === 0) {
        Toast.info("Tu carrito está vacío.");
        return;
    }
    toggleCart(); // Close cart

    // Pre-fill if logued in
    if (currentUser) {
        if (document.getElementById('cust-name')) document.getElementById('cust-name').value = currentUser.name || '';
        if (document.getElementById('cust-email')) document.getElementById('cust-email').value = currentUser.email || '';
        if (document.getElementById('cust-phone')) document.getElementById('cust-phone').value = currentUser.phone || '';
        if (document.getElementById('cust-address')) document.getElementById('cust-address').value = currentUser.address || '';
        if (currentUser.address) toggleAddressField(true);
    }

    document.getElementById('checkout-modal').classList.add('active');
    document.getElementById('checkout-step-1').style.display = 'block';
    document.getElementById('checkout-step-2').style.display = 'none';

    // Reset coupon
    appliedDiscount = { type: 'none', value: 0, code: '' };
    document.getElementById('coupon-msg').textContent = '';
    document.getElementById('coupon-code').value = '';
}

function closeCheckout() {
    document.getElementById('checkout-modal').classList.remove('active');
}

function toggleAddressField() {
    const method = document.getElementById('cust-delivery').value;
    const addrGroup = document.getElementById('address-group');
    if (method === 'mrw' || method === 'delivery') {
        addrGroup.style.display = 'block';
    } else {
        addrGroup.style.display = 'none';
        document.getElementById('cust-address').value = '';
    }
}

function goToPayment() {
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const method = document.getElementById('cust-delivery').value;
    const address = document.getElementById('cust-address').value;

    if (!name) { Toast.error("El nombre es requerido"); return; }
    if (!phone) { Toast.error("El teléfono es requerido"); return; }

    if ((method === 'mrw' || method === 'delivery') && !address) {
        Toast.error("Por favor ingresa la dirección de envío"); return;
    }

    document.getElementById('checkout-step-1').style.display = 'none';
    document.getElementById('checkout-step-2').style.display = 'block';
}

function backToStep1() {
    document.getElementById('checkout-step-1').style.display = 'block';
    document.getElementById('checkout-step-2').style.display = 'none';
}

function selectPayment(method, el) {
    const options = document.querySelectorAll('.pay-option');
    options.forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');

    const infoBox = document.getElementById('payment-info-box');

    if (method === 'pago_movil') {
        infoBox.innerHTML = `
            <strong>Datos Pago Móvil:</strong><br>
            Banesco (0134)<br>
            Telf: 0414-6756068<br>
            CI: 19.503.236<br>
            Monto: Bs. ${(Cart.total() * 60).toFixed(2)} (Ref Tasa)
        `;
    } else if (method === 'binance') {
        infoBox.innerHTML = `
            <strong>Binance Pay ID:</strong> 423456789<br>
            <strong>Email:</strong> pagos@yalorde.com<br>
            <div style="text-align:center; margin-top:10px;"><i class="fa-solid fa-qrcode" style="font-size:30px;"></i></div>
        `;
    } else if (method === 'zelle') {
        infoBox.innerHTML = `
            <strong>Zelle Email:</strong><br>
            pagosusa@yalorde.com<br>
            Titular: Yalorde Tentaciones CA
        `;
    }
}

async function submitOrder() {
    // Collect Data
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const docId = document.getElementById('cust-doc').value;
    const email = document.getElementById('cust-email').value;
    const deliveryMethod = document.getElementById('cust-delivery').value;
    const address = document.getElementById('cust-address').value;

    const paymentOption = document.querySelector('.pay-option.selected');
    if (!paymentOption) { Toast.error("Selecciona un método de pago"); return; }

    const ref = document.getElementById('pay-ref').value;
    if (!ref) { Toast.error("Ingresa la referencia de pago"); return; }

    // Derive method string from onclick attribute or data attribute 
    // (Simplification: Checking text content or id would be better but let's stick to previous pattern logic or cleaner)
    let paymentMethod = 'Unknown';
    if (paymentOption.innerHTML.includes('Pago Móvil')) paymentMethod = 'pago_movil';
    else if (paymentOption.innerHTML.includes('Binance')) paymentMethod = 'binance';
    else if (paymentOption.innerHTML.includes('Zelle')) paymentMethod = 'zelle';

    const fileInput = document.getElementById('pay-proof');
    if (paymentMethod === 'pago_movil' && (!fileInput || !fileInput.files[0])) {
        Toast.error("Por favor adjunta el comprobante de pago"); return;
    }

    const orderData = new FormData();
    // Calculate Final Total
    let finalTotal = Cart.total();
    if (appliedDiscount.type === 'percentage') finalTotal *= (1 - appliedDiscount.value / 100);
    else if (appliedDiscount.type === 'fixed') finalTotal -= appliedDiscount.value;

    orderData.append('customer', JSON.stringify({
        name,
        phone,
        docId,
        email,
        address: `[${deliveryMethod.toUpperCase()}] ${address}`
    }));
    orderData.append('items', JSON.stringify(Cart.items));
    orderData.append('total', finalTotal);
    orderData.append('paymentMethod', paymentMethod);
    orderData.append('paymentRef', ref);
    if (appliedDiscount.code) orderData.append('couponUsed', appliedDiscount.code);

    // Append file if exists
    if (fileInput && fileInput.files[0]) {
        orderData.append('paymentProof', fileInput.files[0]);
    }

    const submitBtn = document.querySelector('.confirm-btn'); // Fixed selector
    submitBtn.textContent = "Procesando...";
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            // headers: { 'Content-Type': 'multipart/form-data' }, // browser sets boundary automatically
            body: orderData
        });

        if (response.ok) {
            const orderResult = await response.json();
            const trackingId = orderResult.trackingCode || orderResult.orderId;

            // Show tracking ID modal
            const trackingModal = document.createElement('div');
            trackingModal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10000; display:flex; align-items:center; justify-content:center;';
            trackingModal.innerHTML = `
                <div style="background:white; padding:30px; border-radius:15px; max-width:500px; width:90%; text-align:center; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                    <div style="font-size:60px; margin-bottom:15px;">🎉</div>
                    <h2 style="color:var(--primary); margin:0 0 10px 0;">¡Pedido Realizado!</h2>
                    <p style="color:#666; margin-bottom:20px;">Tu pedido ha sido procesado exitosamente. Te contactaremos por WhatsApp.</p>
                    
                    <div style="background:#f8f9fa; padding:20px; border-radius:10px; margin:20px 0;">
                        <p style="font-size:0.85rem; color:#666; margin:0 0 10px 0; font-weight:600;">📋 GUARDA ESTE CÓDIGO PARA RASTREAR TU PEDIDO:</p>
                        <div style="background:white; padding:15px; border-radius:8px; border:2px dashed var(--primary); margin-bottom:15px;">
                            <p id="tracking-code" style="font-size:1.3rem; font-weight:700; color:var(--primary); margin:0; letter-spacing:2px; font-family:monospace;">
                                ${trackingId}
                            </p>
                        </div>
                        <button onclick="copyTrackingCode('${trackingId}')" style="background:var(--primary); color:white; border:none; padding:12px 24px; border-radius:25px; cursor:pointer; font-weight:600; font-size:0.9rem; transition:all 0.3s;">
                            <i class="fa-solid fa-copy"></i> Copiar Código
                        </button>
                    </div>
                    
                    <p style="font-size:0.8rem; color:#999; margin:15px 0;">Puedes rastrear tu pedido en cualquier momento usando este código en nuestra página principal.</p>
                    
                    <button onclick="location.reload()" style="background:#6c757d; color:white; border:none; padding:12px 30px; border-radius:25px; cursor:pointer; font-weight:600; margin-top:10px;">
                        Volver a la Tienda
                    </button>
                </div>
            `;
            document.body.appendChild(trackingModal);

            Cart.clear();
            closeCheckout();
        } else {
            Toast.error("Hubo un error al procesar el pedido. Intenta de nuevo.");
        }
    } catch (error) {
        console.error("Error submitting order:", error);
        Toast.error("Error de conexión");
    } finally {
        submitBtn.textContent = "Finalizar Pedido";
        submitBtn.disabled = false;
    }
}

// Helper function to copy tracking code
function copyTrackingCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        Toast.success("¡Código copiado! Guárdalo para rastrear tu pedido.");
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        Toast.success("¡Código copiado!");
    });
}

// === AUTH & TRACKING ===
function openAuthModal() { document.getElementById('auth-modal').classList.add('active'); }
function closeAuthModal() { document.getElementById('auth-modal').classList.remove('active'); }
function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}
function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

async function handleRegister() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-pass').value;

    if (!name || !email || !password) return Toast.error("Completa los campos obligatorios");

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });
        const data = await res.json();
        if (res.ok) {
            Toast.success("¡Cuenta creada! Bienvenido, " + name);
            closeAuthModal();
            updateUIForAuth(data.user);
        } else {
            Toast.error(data.error);
        }
    } catch (err) {
        Toast.error("Error de conexión");
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            Toast.success("Hola de nuevo, " + data.user.name);
            closeAuthModal();
            updateUIForAuth(data.user);
        } else {
            Toast.error(data.error);
        }
    } catch (err) {
        Toast.error("Error de conexión");
    }
}

function updateUIForAuth(user) {
    currentUser = user; // Save globally
    const authLink = document.querySelector('li[onclick*="openAuthModal"]');
    if (authLink && user) {
        authLink.innerHTML = `<i class="fa-solid fa-user-check" style="margin-right:10px;"></i> Hola, ${user.name.split(' ')[0]}`;
        authLink.onclick = () => { if (confirm("¿Cerrar sesión?")) handleLogout(); };
    }
}

async function handleLogout() {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) location.reload();
}

// Tracking
function openTrackingModal() { document.getElementById('tracking-modal').classList.add('active'); }
function closeTrackingModal() { document.getElementById('tracking-modal').classList.remove('active'); }

async function trackOrder() {
    const id = document.getElementById('track-id-input').value.trim();
    if (!id) return Toast.error("Ingresa un ID de pedido");

    const resultDiv = document.getElementById('tracking-result');
    resultDiv.innerHTML = '<p style="text-align:center;">🔍 Buscando tu pedido...</p>';
    resultDiv.style.display = 'block';

    try {
        const res = await fetch(`/api/orders/track/${id}`);
        const order = await res.json();

        if (res.ok) {
            const statusLabels = {
                'pending': '🟡 Pendiente de Verificación',
                'approved': '🟢 Pago Verificado - Preparando Envío',
                'shipped': '🚚 En Camino',
                'delivered': '✅ Entregado',
                'cancelled': '❌ Cancelado'
            };

            const paymentLabels = {
                'pending': '🟡 Pendiente',
                'verified': '🟢 Verificado',
                'rejected': '🔴 Rechazado'
            };

            // Timeline visual
            const timeline = ['pending', 'approved', 'shipped', 'delivered'];
            const currentIndex = timeline.indexOf(order.status);
            const isCancelled = order.status === 'cancelled';

            let timelineHTML = '';
            if (!isCancelled) {
                timelineHTML = `
                    <div style="margin: 20px 0;">
                        <h4 style="margin-bottom: 15px; font-size: 0.9rem; color: #666;">📍 Seguimiento del Pedido</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center; position: relative;">
                            ${timeline.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const labels = {
                        'pending': 'Recibido',
                        'approved': 'Verificado',
                        'shipped': 'Enviado',
                        'delivered': 'Entregado'
                    };
                    return `
                                    <div style="flex: 1; text-align: center; position: relative;">
                                        <div style="width: 30px; height: 30px; border-radius: 50%; background: ${isCompleted ? 'var(--primary)' : '#ddd'}; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 0.8rem; font-weight: bold; z-index: 2; position: relative;">
                                            ${isCompleted ? '✓' : index + 1}
                                        </div>
                                        <p style="font-size: 0.7rem; margin-top: 5px; color: ${isCompleted ? 'var(--primary)' : '#999'}; font-weight: ${isCompleted ? '600' : '400'};">
                                            ${labels[step]}
                                        </p>
                                        ${index < timeline.length - 1 ? `
                                            <div style="position: absolute; top: 15px; left: 50%; width: 100%; height: 2px; background: ${index < currentIndex ? 'var(--primary)' : '#ddd'}; z-index: 1;"></div>
                                        ` : ''}
                                    </div>
                                `;
                }).join('')}
                        </div>
                    </div>
                `;
            }

            // Mensaje del admin
            const adminMessageHTML = order.notes ? `
                <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; font-size: 0.85rem; color: #856404;">
                        <strong>💬 Mensaje de Yalorde:</strong><br>
                        ${order.notes}
                    </p>
                </div>
            ` : '';

            // Items del pedido
            const itemsHTML = order.items && order.items.length > 0 ? `
                <div style="margin: 15px 0;">
                    <h4 style="font-size: 0.9rem; color: #666; margin-bottom: 10px;">📦 Productos</h4>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px;">
                        ${order.items.map(item => `
                            <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-size: 0.85rem;">${item.qty}x ${item.title} (${item.size})</span>
                                <span style="font-size: 0.85rem; font-weight: 600;">$${(item.price * item.qty).toFixed(2)}</span>
                            </div>
                        `).join('')}
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; margin-top: 5px;">
                            <span style="font-weight: 700;">TOTAL</span>
                            <span style="font-weight: 700; color: var(--primary);">$${order.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            ` : '';

            resultDiv.innerHTML = `
                <div style="background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
                        <h3 style="margin: 0 0 10px 0; color: var(--primary);">¡Hola, ${order.customer.name}! 👋</h3>
                        <p style="font-size: 0.85rem; color: #666; margin: 0;">Pedido #${order._id.slice(-6).toUpperCase()}</p>
                        <p style="font-size: 0.75rem; color: #999; margin: 5px 0 0 0;">Realizado el ${new Date(order.date).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>

                    <!-- Estado Actual -->
                    <div style="background: linear-gradient(135deg, var(--primary) 0%, #d63384 100%); padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                        <p style="margin: 0; color: white; font-size: 1.1rem; font-weight: 700;">
                            ${statusLabels[order.status] || order.status}
                        </p>
                        ${order.paymentStatus ? `
                            <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.9); font-size: 0.85rem;">
                                Estado de Pago: ${paymentLabels[order.paymentStatus] || order.paymentStatus}
                            </p>
                        ` : ''}
                    </div>

                    <!-- Timeline -->
                    ${timelineHTML}

                    <!-- Tracking Code -->
                    ${order.trackingCode ? `
                        <div style="background: #e7f3ff; padding: 12px; border-radius: 8px; margin: 15px 0; text-align: center;">
                            <p style="margin: 0; font-size: 0.8rem; color: #0056b3;">📍 Código de Rastreo</p>
                            <p style="margin: 5px 0 0 0; font-size: 1.1rem; font-weight: 700; color: #004085; letter-spacing: 1px;">
                                ${order.trackingCode}
                            </p>
                        </div>
                    ` : ''}

                    <!-- Admin Message -->
                    ${adminMessageHTML}

                    <!-- Items -->
                    ${itemsHTML}

                    <!-- Contact Section -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-top: 20px; text-align: center;">
                        <p style="font-size: 0.85rem; color: #666; margin: 0 0 10px 0;">
                            ¿Tienes alguna duda o crees que esto es un error?
                        </p>
                        <a href="https://wa.me/584146756068?text=Hola,%20tengo%20una%20consulta%20sobre%20mi%20pedido%20${order._id.slice(-6).toUpperCase()}" 
                           target="_blank"
                           style="display: inline-block; background: #25D366; color: white; padding: 12px 24px; border-radius: 25px; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: all 0.3s;">
                            <i class="fa-brands fa-whatsapp"></i> Contáctanos por WhatsApp
                        </a>
                        <p style="font-size: 0.75rem; color: #999; margin: 10px 0 0 0;">
                            Responderemos lo más pronto posible 💚
                        </p>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="color: var(--danger); font-size: 1.1rem; margin-bottom: 10px;">❌ ${order.error || 'Pedido no encontrado'}</p>
                    <p style="font-size: 0.85rem; color: #666;">Verifica que el ID sea correcto o contáctanos para ayudarte.</p>
                    <a href="https://wa.me/584146756068?text=Hola,%20no%20puedo%20encontrar%20mi%20pedido" 
                       target="_blank"
                       style="display: inline-block; background: #25D366; color: white; padding: 10px 20px; border-radius: 20px; text-decoration: none; margin-top: 15px;">
                        <i class="fa-brands fa-whatsapp"></i> Contactar Soporte
                    </a>
                </div>
            `;
        }
    } catch (err) {
        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="color: var(--danger);">⚠️ Error de conexión</p>
                <p style="font-size: 0.85rem; color: #666;">Por favor, intenta de nuevo en unos momentos.</p>
            </div>
        `;
    }
}

async function applyCoupon() {
    const code = document.getElementById('coupon-code').value.trim();
    if (!code) return;

    const msg = document.getElementById('coupon-msg');
    msg.textContent = "Validando...";
    msg.style.color = "#888";

    try {
        const res = await fetch('/api/coupons/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, cartTotal: Cart.total() })
        });
        const data = await res.json();
        if (res.ok) {
            appliedDiscount = { type: data.discountType, value: data.discountValue, code: code.toUpperCase() };
            msg.textContent = `¡Cupón aplicado! Descuento: ${data.discountType === 'percentage' ? data.discountValue + '%' : '$' + data.discountValue}`;
            msg.style.color = "var(--success)";
            Toast.success("Descuento aplicado");
        } else {
            appliedDiscount = { type: 'none', value: 0, code: '' };
            msg.textContent = data.error;
            msg.style.color = "var(--danger)";
        }
    } catch (err) {
        msg.textContent = "Error de conexión";
    }
}

// On Load
window.addEventListener('load', async () => {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const user = await res.json();
            updateUIForAuth(user);
        }
    } catch (e) { }
});

// === FAQ TOGGLE ===
function toggleFaq(element) {
    element.classList.toggle('active');
}

// === CLOSE TRACKING MODAL ===
function closeTrackingModal() {
    document.getElementById('tracking-modal').style.display = 'none';
    document.getElementById('tracking-result').style.display = 'none';
    document.getElementById('track-id-input').value = '';
}
