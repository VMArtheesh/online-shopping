
/* =====================================
   KARTO ADMIN PRODUCT MANAGEMENT
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const productsContainer = document.querySelector(
        "#admin-products-container"
    );

    const message = document.querySelector(
        "#admin-products-message"
    );

    const searchInput = document.querySelector("#product-search");

    const categoryFilter = document.querySelector(
        "#product-category-filter"
    );

    /* PRODUCT FORM MODAL */

    const addProductButton = document.querySelector("#add-product-button");
    const productModal = document.querySelector("#add-product-modal");
    const addProductForm = document.querySelector("#add-product-form");
    const saveProductButton = document.querySelector("#save-product-button");

    const closeProductButton = document.querySelector("#close-product-form");
    const cancelProductButton = document.querySelector("#cancel-product-form");

    let editingProductId = null;
    let productEntries = [];

    function openProductModal() {

        editingProductId = null;

        addProductForm.reset();

        document.querySelector("#product-name").disabled = false;

        document.querySelector(".admin-form-heading h2").textContent =
            "Add New Product";

        saveProductButton.textContent = "Save Product";

        productModal.hidden = false;
    }

    function closeProductModal() {
        productModal.hidden = true;
    }

    addProductButton.addEventListener("click", openProductModal);

    closeProductButton.addEventListener("click", closeProductModal);

    cancelProductButton.addEventListener("click", closeProductModal);

    productModal.addEventListener("click", (event) => {
        if (event.target === productModal) {
            closeProductModal();
        }
    });

    /* SAVE OR UPDATE PRODUCT */

    addProductForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        try {

            saveProductButton.disabled = true;
            saveProductButton.textContent = "Saving...";

            const session = await getUserSession();

            if (!session) {
                window.location.href = "../auth/login.html";
                return;
            }

            const price = Number(
                document.querySelector("#product-price").value
            );

            const stock = Number(
                document.querySelector("#product-stock").value
            );

            if (!Number.isFinite(price) || price <= 0) {
                alert("Please enter a valid product price.");
                return;
            }

            if (!Number.isInteger(stock) || stock < 0) {
                alert("Stock quantity must be a whole number and cannot be negative.");
                return;
            }

            const productData = {
                name: document.querySelector("#product-name").value.trim(),
                category: document.querySelector("#product-category").value,
                description: document.querySelector("#product-description").value.trim(),
                price: price,
                stockQuantity: stock,
                imageUrl: document.querySelector("#product-image").value.trim()
            };

            if (editingProductId) {

                await updateProduct(
                    editingProductId,
                    productData,
                    session.idToken
                );

                alert("Product updated successfully!");

            } else {

                await createProduct(productData, session.idToken);

                alert("Product added successfully!");
            }

            window.location.reload();

        } catch (error) {

            console.error("Product saving failed:", error);

            alert("Unable to save product: " + error.message);

        } finally {

            saveProductButton.disabled = false;

            saveProductButton.textContent =
                editingProductId ? "Update Product" : "Save Product";
        }

    });

    /* PRODUCT SEARCH AND CATEGORY FILTER */

    function filterProducts() {

        const searchTerm = searchInput.value.trim().toLowerCase();

        const selectedCategory = categoryFilter.value;

        let visibleCount = 0;

        productEntries.forEach(entry => {

            const matchesSearch =
                entry.name.toLowerCase().includes(searchTerm) ||
                entry.category.toLowerCase().includes(searchTerm);

            const matchesCategory =
                selectedCategory === "" ||
                entry.category === selectedCategory;

            const shouldShow = matchesSearch && matchesCategory;

            entry.row.style.display = shouldShow ? "grid" : "none";

            if (shouldShow) {
                visibleCount++;
            }

        });

        if (visibleCount === 0) {
            message.textContent = "No matching products found.";
        } else {
            message.textContent =
                `${visibleCount} of ${productEntries.length} products shown.`;
        }
    }

    searchInput.addEventListener("input", filterProducts);

    categoryFilter.addEventListener("change", filterProducts);

    /* LOAD PRODUCTS */

    try {

        message.textContent = "Loading products...";

        const session = await getUserSession();

        if (!session) {
            window.location.href = "../auth/login.html";
            return;
        }

        const products = await getAllProducts(session.idToken);

        productsContainer.innerHTML = "";

        /* PRODUCT TABLE HEADER */

        const tableHeader = document.createElement("div");

        tableHeader.className =
            "admin-product-row admin-product-header";

        tableHeader.innerHTML = `
            <span>PRODUCT</span>
            <span>PRICE</span>
            <span>STOCK</span>
            <span>STATUS</span>
        `;

        productsContainer.appendChild(tableHeader);

        if (products.length === 0) {

            message.textContent = "No products found.";

            return;
        }

        /* DISPLAY PRODUCTS */

        products.forEach(productDocument => {

            const fields = productDocument.fields;

            const productId = productDocument.name.split("/").pop();

            const productName =
                fields.name?.stringValue || "Unnamed Product";

            const category =
                fields.category?.stringValue || "Uncategorized";

            const price = Number(
                fields.price?.integerValue ||
                fields.price?.doubleValue ||
                fields.price?.stringValue ||
                0
            );

            const stock = Number(
                fields.stockQuantity?.integerValue || 0
            );

            const isActive =
                fields.isActive?.booleanValue === true;

            const productRow = document.createElement("div");

            productRow.className = "admin-product-row";

            productRow.innerHTML = `
                <div class="admin-product-info">

                    <img
                        src="${fields.imageUrl?.stringValue || 'https://placehold.co/80x80?text=No+Image'}"
                        alt="${productName}"
                        class="admin-product-image"
                    >

                    <div>
                        <h3>${productName}</h3>
                        <p>${category}</p>
                    </div>

                </div>

                <p>₹${price.toLocaleString("en-IN")}</p>

                <p>${stock} units</p>

                <div class="admin-product-actions">

                    <span class="admin-product-status ${isActive ? "active" : "inactive"}">
                        ${isActive ? "Active" : "Inactive"}
                    </span>

                    <button
                        type="button"
                        class="edit-product-button"
                        data-product-id="${productId}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="toggle-product-button"
                        data-product-id="${productId}"
                        data-active="${isActive}"
                    >
                        ${isActive ? "Deactivate" : "Activate"}
                    </button>

                </div>
            `;

            productsContainer.appendChild(productRow);

            /* STORE PRODUCT DETAILS FOR FILTERING */

            productEntries.push({
                row: productRow,
                name: productName,
                category: category
            });

            /* EDIT PRODUCT */

            const editButton = productRow.querySelector(
                ".edit-product-button"
            );

            editButton.addEventListener("click", () => {

                openProductModal();

                editingProductId = productId;

                document.querySelector("#product-name").value =
                    fields.name?.stringValue || "";

                document.querySelector("#product-category").value =
                    fields.category?.stringValue || "";

                document.querySelector("#product-description").value =
                    fields.description?.stringValue || "";

                document.querySelector("#product-price").value =
                    fields.price?.doubleValue ||
                    fields.price?.integerValue || "";

                document.querySelector("#product-stock").value =
                    fields.stockQuantity?.integerValue || "";

                document.querySelector("#product-image").value =
                    fields.imageUrl?.stringValue || "";

                document.querySelector(".admin-form-heading h2").textContent =
                    "Edit Product";

                saveProductButton.textContent = "Update Product";

                productModal.hidden = false;

            });

            /* ACTIVATE / DEACTIVATE PRODUCT */

            const toggleButton = productRow.querySelector(
                ".toggle-product-button"
            );

            toggleButton.addEventListener("click", async () => {

                const shouldActivate = !isActive;

                const action = shouldActivate
                    ? "activate"
                    : "deactivate";

                const confirmed = confirm(
                    `Are you sure you want to ${action} "${productName}"?`
                );

                if (!confirmed) {
                    return;
                }

                try {

                    toggleButton.disabled = true;
                    toggleButton.textContent = "Updating...";

                    const currentSession = await getUserSession();

                    if (!currentSession) {
                        window.location.href = "../auth/login.html";
                        return;
                    }

                    await updateProductStatus(
                        productId,
                        shouldActivate,
                        currentSession.idToken
                    );

                    alert(`Product ${action}d successfully!`);

                    window.location.reload();

                } catch (error) {

                    console.error(
                        "Product status update failed:",
                        error
                    );

                    alert(
                        "Unable to update product status: " + error.message
                    );

                    toggleButton.disabled = false;

                    toggleButton.textContent =
                        isActive ? "Deactivate" : "Activate";
                }

            });

        });

        message.textContent =
            `${products.length} products found.`;

    } catch (error) {

        console.error("Unable to load admin products:", error);

        message.textContent =
            "Unable to load products. Please try again.";

    }

});

/* =====================================
   CREATE PRODUCT (ADMIN)
===================================== */

async function createProduct(productData, idToken) {

    const now = new Date().toISOString();

    const product = {
        fields: {
            name: {
                stringValue: productData.name
            },
            category: {
                stringValue: productData.category
            },
            description: {
                stringValue: productData.description
            },
            price: {
                doubleValue: Number(productData.price)
            },
            stockQuantity: {
                integerValue: String(productData.stockQuantity)
            },
            imageUrl: {
                stringValue: productData.imageUrl
            },
            isActive: {
                booleanValue: true
            },
            createdAt: {
                timestampValue: now
            },
            updatedAt: {
                timestampValue: now
            }
        }
    };

    return await firestoreRequest("products", {
        method: "POST",
        idToken: idToken,
        body: product
    });
}
