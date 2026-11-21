
/* =====================================
   KARTO HOMEPAGE
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const productsContainer = document.querySelector(
        ".products-container"
    );

    const categoriesContainer = document.querySelector(
        ".categories-container"
    );

    const productsViewAllButton = document.querySelector(
        "#products-view-all"
    );

    const searchToggle = document.querySelector("#search-toggle");
    const cartCount = document.querySelector("#cart-count");

    let cartItems = [];

    // Update navbar cart count
    function updateCartCount() {

        if (!cartCount) return;

        const totalItems = cartItems.reduce(
            (total, item) => total + item.quantity,
            0
        );

        cartCount.textContent = totalItems;

    }

    // Retrieve customer's cart
    async function refreshCartItems() {

        const session = JSON.parse(
            sessionStorage.getItem("kartoUserSession") || "null"
        );

        if (!session?.uid || !session?.idToken) {
            cartItems = [];
            updateCartCount();
            return;
        }

        try {

            cartItems = await getCartItems();
            updateCartCount();

        } catch (error) {

            console.error("Cart loading failed:", error);
            cartItems = [];
            updateCartCount();

        }

    }

    // Remove unnecessary product View All button
    if (productsViewAllButton) {
        productsViewAllButton.style.display = "none";
    }

    try {

        productsContainer.textContent = "Loading products...";

        const products = await getActiveProducts();

        await refreshCartItems();

        const categories = getProductCategories(products);

        let selectedCategory = "All Products";

        // Create search field
        const searchContainer = document.createElement("div");
        searchContainer.className = "product-search-container";
        searchContainer.hidden = true;

        const searchInput = document.createElement("input");
        searchInput.type = "search";
        searchInput.className = "product-search-input";
        searchInput.placeholder = "Search products...";
        searchInput.setAttribute("aria-label", "Search products");

        searchContainer.appendChild(searchInput);

        productsContainer.parentElement.insertBefore(
            searchContainer,
            productsContainer
        );

        // Display products
        function renderProducts() {

            let filteredProducts = selectedCategory === "All Products"
                ? products
                : products.filter(product =>
                    product.fields.category?.stringValue === selectedCategory
                );

            const searchTerm = searchInput.value.trim().toLowerCase();

            if (searchTerm) {

                filteredProducts = filteredProducts.filter(product => {

                    const fields = product.fields;

                    const name = fields.name?.stringValue || "";
                    const category = fields.category?.stringValue || "";
                    const description = fields.description?.stringValue || "";

                    return (
                        name.toLowerCase().includes(searchTerm) ||
                        category.toLowerCase().includes(searchTerm) ||
                        description.toLowerCase().includes(searchTerm)
                    );

                });

            }

            displayProducts(
                filteredProducts,
                productsContainer,
                searchTerm,
                cartItems,
                async () => {
                    await refreshCartItems();
                    renderProducts();
                }
            );

        }

        // Search input
        searchInput.addEventListener("input", renderProducts);

        // Search button
        if (searchToggle) {

            searchToggle.addEventListener("click", event => {

                event.preventDefault();

                searchContainer.hidden = !searchContainer.hidden;

                if (!searchContainer.hidden) {

                    searchInput.focus();

                    document.querySelector("#products").scrollIntoView({
                        behavior: "smooth"
                    });

                } else {

                    searchInput.value = "";
                    renderProducts();

                }

            });

        }

        // Display categories
        let showAllCategories = false;

        function renderCategories() {

            categoriesContainer.innerHTML = "";

            const visibleCategories = showAllCategories
                ? categories
                : categories.slice(0, 4);

            // All Products category
            createCategoryCard("All Products", categoriesContainer, () => {

                selectedCategory = "All Products";
                renderProducts();

            });

            visibleCategories.forEach(category => {

                createCategoryCard(category, categoriesContainer, () => {

                    selectedCategory = category;
                    renderProducts();

                });

            });

        }

        // Render categories initially
        renderCategories();

        // Categories View All toggle
        const categoriesViewAllButton = document.querySelector(
            "#categories-view-all"
        );

        if (categoriesViewAllButton) {

            categoriesViewAllButton.addEventListener("click", () => {

                showAllCategories = !showAllCategories;
                renderCategories();

                categoriesViewAllButton.textContent = showAllCategories
                    ? "Show Less"
                    : "View All";

            });

        }

        // Display all products initially
        renderProducts();

    } catch (error) {

        console.error("Product loading failed:", error);

        productsContainer.textContent =
            "Unable to load products. Please try again later.";

    }

});

/* =====================================
   CATEGORY SERVICE
===================================== */

function getProductCategories(products) {

    const categories = products
        .map(product => product.fields.category?.stringValue)
        .filter(category => category && category.trim() !== "");

    return [...new Set(categories)];

}

/* =====================================
   CATEGORY CARD
===================================== */

function createCategoryCard(category, container, onClick) {

    const categoryCard = document.createElement("button");

    categoryCard.type = "button";
    categoryCard.className = "category-card";
    categoryCard.textContent = category;

    categoryCard.addEventListener("click", () => {

        container.querySelectorAll(".category-card").forEach(card => {
            card.classList.remove("active");
        });

        categoryCard.classList.add("active");

        onClick();

    });

    container.appendChild(categoryCard);

}

/* =====================================
   PRODUCT DISPLAY
===================================== */

function displayProducts(
    products,
    container,
    searchTerm = "",
    cartItems = [],
    onCartChanged = () => {}
) {

    container.innerHTML = "";

    if (products.length === 0) {

        container.textContent = searchTerm
            ? "No products match your search."
            : "No products available in this category.";

        return;
    }

    products.forEach(product => {

        const fields = product.fields;

        const productId = product.name.split("/").pop();

        const productCard = document.createElement("article");
        productCard.className = "product-card";
        productCard.dataset.productId = productId;

        // Product image
        const imageContainer = document.createElement("div");
        imageContainer.className = "product-image";

        const productImage = document.createElement("img");
        productImage.src = fields.imageUrl?.stringValue || "";
        productImage.alt = fields.name?.stringValue || "Product";
        productImage.loading = "lazy";

        imageContainer.appendChild(productImage);

        // Product category
        const productCategory = document.createElement("span");
        productCategory.className = "product-category";
        productCategory.textContent =
            fields.category?.stringValue || "General";

        // Product name
        const productName = document.createElement("h3");
        productName.textContent =
            fields.name?.stringValue || "Unnamed Product";

        // Product price
        const productPrice = document.createElement("p");

        const priceValue =
            fields.price?.doubleValue ??
            fields.price?.integerValue ??
            0;

        productPrice.className = "product-price";
        productPrice.textContent =
            `₹${Number(priceValue).toFixed(2)}`;

        // Check whether product is already in cart
        const cartItem = cartItems.find(
            item => item.productId === productId
        );

        // Create quantity controls
        function createQuantityControls(quantity) {

            const quantityContainer = document.createElement("div");
            quantityContainer.className = "quantity-control";

            const decreaseButton = document.createElement("button");
            decreaseButton.type = "button";
            decreaseButton.className = "quantity-btn";
            decreaseButton.textContent = "−";
            decreaseButton.setAttribute("aria-label", "Decrease quantity");

            const quantityValue = document.createElement("span");
            quantityValue.className = "quantity-value";
            quantityValue.textContent = quantity;

            const increaseButton = document.createElement("button");
            increaseButton.type = "button";
            increaseButton.className = "quantity-btn";
            increaseButton.textContent = "+";
            increaseButton.setAttribute("aria-label", "Increase quantity");

            // Disable increase at maximum quantity
            if (quantity >= 99) {
                increaseButton.disabled = true;
            }

            // Decrease quantity
            decreaseButton.addEventListener("click", async () => {

                decreaseButton.disabled = true;
                increaseButton.disabled = true;

                try {

                    if (quantity === 1) {

                        await removeFromCart(productId);

                    } else {

                        await updateCartItemQuantity(
                            productId,
                            quantity - 1
                        );

                    }

                    await onCartChanged();

                } catch (error) {

                    console.error("Quantity update failed:", error);
                    alert(error.message || "Unable to update quantity.");

                    decreaseButton.disabled = false;
                    increaseButton.disabled = quantity >= 99;

                }

            });

            // Increase quantity
            increaseButton.addEventListener("click", async () => {

                decreaseButton.disabled = true;
                increaseButton.disabled = true;

                try {

                    await updateCartItemQuantity(
                        productId,
                        quantity + 1
                    );

                    await onCartChanged();

                } catch (error) {

                    console.error("Quantity update failed:", error);
                    alert(error.message || "Unable to update quantity.");

                    decreaseButton.disabled = false;
                    increaseButton.disabled = quantity >= 99;

                }

            });

            quantityContainer.appendChild(decreaseButton);
            quantityContainer.appendChild(quantityValue);
            quantityContainer.appendChild(increaseButton);

            return quantityContainer;

        }

        // Show quantity controls or Add to Cart
        if (cartItem) {

            productCard.appendChild(
                createQuantityControls(cartItem.quantity)
            );

        } else {

            const addToCartButton = document.createElement("button");

            addToCartButton.type = "button";
            addToCartButton.className = "add-to-cart-button";
            addToCartButton.textContent = "Add to Cart";

            addToCartButton.addEventListener("click", async () => {

                addToCartButton.disabled = true;
                addToCartButton.textContent = "Adding...";

                try {

                    const session = JSON.parse(
                        sessionStorage.getItem("kartoUserSession") || "null"
                    );

                    if (!session?.uid || !session?.idToken) {

                        alert("Please log in before adding products to your cart.");

                        window.location.href = "pages/auth/login.html";
                        return;

                    }

                    await addToCart(productId);

                    await onCartChanged();

                } catch (error) {

                    console.error("Add to cart failed:", error);

                    alert(error.message || "Unable to add product to cart.");

                    addToCartButton.disabled = false;
                    addToCartButton.textContent = "Add to Cart";

                }

            });

            productCard.appendChild(addToCartButton);

        }

        // Assemble product card
        productCard.insertBefore(imageContainer, productCard.firstChild);
        productCard.appendChild(productCategory);
        productCard.appendChild(productName);
        productCard.appendChild(productPrice);

        container.appendChild(productCard);

    });

}

/* =====================================
   STICKY NAVBAR SCROLL EFFECT
===================================== */

const siteHeader = document.querySelector(".site-header");

function updateNavbarOnScroll() {

    if (!siteHeader) return;

    siteHeader.classList.toggle(
        "scrolled",
        window.scrollY > 20
    );

}

window.addEventListener("scroll", updateNavbarOnScroll, {
    passive: true
});

updateNavbarOnScroll();

/* =====================================
   ACCOUNT NAVIGATION
===================================== */

const accountLink = document.querySelector("#account-link");

if (accountLink) {

    const session = JSON.parse(
        sessionStorage.getItem("kartoUserSession") || "null"
    );

    accountLink.href = session?.uid
        ? "pages/customer/dashboard.html"
        : "pages/auth/login.html";

}
