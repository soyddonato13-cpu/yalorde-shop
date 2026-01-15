const Cart = {
    items: [],

    init() {
        const savedCart = localStorage.getItem('yalorde_cart');
        if (savedCart) {
            this.items = JSON.parse(savedCart);
        }
        this.updateBadge();
    },

    add(product, size) {
        // Check if item already exists in cart logic to merge quantities could go here,
        // but for fashion retail often separate lines per size are better.
        // Let's do simple ID matching.

        const existingItemIndex = this.items.findIndex(item => item.id === product.id && item.size === size);

        if (existingItemIndex > -1) {
            // Already in cart, check stock limit?
            // For MVP simpler to just add another or increment qty
            // Let's increment quantity
            this.items[existingItemIndex].qty++;
        } else {
            this.items.push({
                id: product.id,
                title: product.title,
                price: product.price,
                img: product.img,
                size: size,
                qty: 1
            });
        }

        this.save();
        this.updateBadge();

        // Return true to signal success
        return true;
    },

    remove(index) {
        this.items.splice(index, 1);
        this.save();
        this.updateBadge();
        // Trigger UI update if cart is open
        if (typeof renderCartItems === 'function') renderCartItems();
    },

    total() {
        return this.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    },

    save() {
        localStorage.setItem('yalorde_cart', JSON.stringify(this.items));
    },

    updateBadge() {
        const badge = document.querySelector('.cart-badge'); // Changed class selector from .badge to .cart-badge in updated HTML
        if (badge) {
            const count = this.items.reduce((acc, item) => acc + item.qty, 0);
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    clear() {
        this.items = [];
        this.save();
        this.updateBadge();
    }
};
