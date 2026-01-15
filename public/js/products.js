const productsData = [
    // === VESTIDOS ===
    {
        id: "v1",
        category: "vestidos",
        title: "Maxi Vestido Floral",
        price: 45.00,
        img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&auto=format&fit=crop&q=60",
        description: "Elegante vestido largo con estampado floral, ideal para eventos de día o tardes de verano. Tela fresca y caída suave.",
        sizes: {
            "S": { stock: 2 },
            "M": { stock: 5 },
            "L": { stock: 0 } // Agotado
        }
    },
    {
        id: "v2",
        category: "vestidos",
        title: "Vestido Coctel Negro",
        price: 60.00,
        img: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&auto=format&fit=crop&q=60",
        description: "El clásico 'Little Black Dress' que no puede faltar. Corte ajustado, escote asimétrico y acabado premium.",
        sizes: {
            "S": { stock: 4 },
            "M": { stock: 2 },
            "L": { stock: 3 }
        }
    },
    {
        id: "v3",
        category: "vestidos",
        title: "Vestido Gala Rojo",
        price: 85.00,
        img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60",
        description: "Impactante vestido rojo para noches inolvidables. Diseño de espalda abierta.",
        sizes: {
            "S": { stock: 1 },
            "M": { stock: 0 },
            "L": { stock: 1 }
        }
    },

    // === TOPS (Blusas) ===
    {
        id: "t1",
        category: "tops",
        title: "Blusa Seda Ivory",
        price: 28.00,
        img: "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=500&auto=format&fit=crop&q=60",
        description: "Blusa de seda sintética con acabado satinado. Perfecta para oficina o salidas casuales.",
        sizes: {
            "S": { stock: 8 },
            "M": { stock: 10 },
            "L": { stock: 5 }
        }
    },
    {
        id: "t2",
        category: "tops",
        title: "Crop Top Asimétrico",
        price: 22.00,
        img: "https://images.unsplash.com/photo-1503185912284-5271ff81b9a8?w=500&auto=format&fit=crop&q=60",
        description: "Diseño moderno y atrevido. Tela stretch que se ajusta perfectamente.",
        sizes: {
            "S": { stock: 15 },
            "M": { stock: 12 },
            "L": { stock: 0 }
        }
    },

    // === BOTTOMS (Pantalones) ===
    {
        id: "b1",
        category: "bottoms",
        title: "Pantalón Palazzo",
        price: 35.00,
        img: "https://images.unsplash.com/photo-1509631179647-b8491715402f?w=500&auto=format&fit=crop&q=60",
        description: "Comodidad y estilo. Pantalón de pierna ancha, cintura alta.",
        sizes: {
            "S": { stock: 3 },
            "M": { stock: 4 },
            "L": { stock: 2 }
        }
    },
    {
        id: "b2",
        category: "bottoms",
        title: "Jeans High Waist",
        price: 40.00,
        img: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=60",
        description: "Denim de alta calidad, corte alto que estiliza la figura.",
        sizes: {
            "36": { stock: 5 },
            "38": { stock: 5 },
            "40": { stock: 2 }
        }
    },

    // === CALZADO ===
    {
        id: "s1",
        category: "calzado",
        title: "Tacones Stiletto Nude",
        price: 55.00,
        img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&auto=format&fit=crop&q=60",
        description: "El básico que combina con todo. Altura de 10cm, plantilla confort.",
        sizes: {
            "36": { stock: 1 },
            "37": { stock: 0 },
            "38": { stock: 2 }
        }
    }
];

// Helper to get logic stock
function getProductStock(productId, size) {
    const product = productsData.find(p => p.id === productId);
    if (!product || !product.sizes[size]) return 0;
    return product.sizes[size].stock;
}
