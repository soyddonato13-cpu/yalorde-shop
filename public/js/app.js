// Initialize
let productsData = [];

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
});

function applyContent(content) {
    if (content.heroTitle) document.getElementById('cms-hero-title').textContent = content.heroTitle;
    if (content.heroSubtitle) document.getElementById('cms-hero-sub').textContent = content.heroSubtitle;
    if (content.heroImg) document.getElementById('cms-hero').style.backgroundImage = `url('${content.heroImg}')`;

    if (content.infoBar) document.getElementById('cms-info-bar').innerHTML = content.infoBar;

    if (content.whatsapp) document.getElementById('cms-social-wa').href = content.whatsapp;
    if (content.instagram) document.getElementById('cms-social-insta').href = content.instagram;
    if (content.tiktok) document.getElementById('cms-social-tiktok').href = content.tiktok;
}

// === RENDER ===
function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (products.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;">No se encontraron productos en esta categoría.</div>`;
        return;
    }

    grid.innerHTML = products.map(product => {
        // Find if stock is low for ANY size
        const totalStock = Object.values(product.sizes).reduce((a, b) => a + b.stock, 0);
        const lowStock = totalStock < 5 && totalStock > 0;
        const outOfStock = totalStock === 0;

        return `
        <div class="product-card" onclick="openProductModal('${product.id}')">
            <div class="product-image">
                <img src="${product.img}" alt="${product.title}">
                ${outOfStock ?
                `<div class="stock-tag" style="background:var(--primary)">AGOTADO</div>` :
                (lowStock ? `<div class="stock-tag low">¡Quedan Pocos!</div>` : '')
            }
            </div>
            <div class="product-info">
                <h4 class="product-title">${product.title}</h4>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    <button class="add-btn"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function filterCategory(category) {
    const title = document.getElementById('category-title');
    if (category === 'all') {
        renderProducts(productsData);
        title.textContent = "TENDENCIA AHORA";
    } else {
        const filtered = productsData.filter(p => p.category === category);
        renderProducts(filtered);
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
    document.getElementById('side-menu').classList.toggle('active');
    document.getElementById('menu-overlay').classList.toggle('active');
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');

    // If opening, render items
    if (!sidebar.classList.contains('active')) {
        renderCartItems();
    }

    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
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
        alert("Tu carrito está vacío.");
        return;
    }
    toggleCart(); // Close cart
    document.getElementById('checkout-modal').classList.add('active');
    document.getElementById('checkout-step-1').style.display = 'block';
    document.getElementById('checkout-step-2').style.display = 'none';
}

function closeCheckout() {
    document.getElementById('checkout-modal').classList.remove('active');
}

function goToPayment() {
    const name = document.getElementById('cust-name').value;
    if (!name) { alert("Por favor ingresa tu nombre"); return; }

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
            Monto: Bs. ${(Cart.total() * 60).toFixed(2)} (Tasa BCV)
        `;
    } else if (method === 'binance') {
        infoBox.innerHTML = `
            <strong>Binance Pay ID:</strong> 123456789<br>
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
    const name = document.getElementById('cust-name').value;
    if (!name) { alert("Por favor ingresa tu nombre"); return; }

    const ref = document.getElementById('pay-ref').value;
    if (!ref) { alert("Por favor ingresa la referencia de pago"); return; }

    const paymentMethod = document.querySelector('.pay-option.selected').getAttribute('onclick').includes('pago_movil') ? 'pago_movil' :
        (document.querySelector('.pay-option.selected').getAttribute('onclick').includes('binance') ? 'binance' : 'zelle');

    const orderData = {
        customer: name,
        items: Cart.items,
        total: Cart.total(),
        paymentMethod: paymentMethod,
        paymentRef: ref
    };

    const submitBtn = document.querySelector('.confirm-btn'); // Fixed selector
    submitBtn.textContent = "Procesando...";
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            alert("¡Pedido Procesado Exitosamente! Te contactaremos por WhatsApp.");
            Cart.clear();
            closeCheckout();
            location.reload();
        } else {
            alert("Hubo un error al procesar el pedido. Intenta de nuevo.");
        }
    } catch (error) {
        console.error("Error submitting order:", error);
        alert("Error de conexión");
    } finally {
        submitBtn.textContent = "Finalizar Pedido";
        submitBtn.disabled = false;
    }
}

// === FAQ TOGGLE ===
function toggleFaq(element) {
    element.classList.toggle('active');
}
