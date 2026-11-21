
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

    const productCategory = document.querySelector("#product-category");

    let editingProductId = null;
    let productEntries = [];
    let categories = [];

    /* LOAD CATEGORIES FROM FIRESTORE */

    async function loadCategories(session, products) {

        const result = await firestoreRequest(":runQuery", {
            method: "POST",
            idToken: session.idToken,
            body: {
                structuredQuery: {
                    from: [{ collectionId: "categories" }]
                }
            }
        });

        categories = result
            .filter(item => item.document)
            .map(item => ({
                id: item.document.name.split("/").pop(),
                name: item.document.fields.name?.stringValue || ""
            }))
            .filter(category => category.name);

        /* REGISTER EXISTING PRODUCT CATEGORIES */

        const existingNames = new Set(
            categories.map(category => category.name.toLowerCase())
        );

        const productCategoryNames = [
            ...new Set(
                products
                    .map(product =>
                        product.fields.category?.stringValue?.trim()
                    )
                    .filter(Boolean)
            )
        ];

        for (const name of productCategoryNames) {

            if (existingNames.has(name.toLowerCase())) {
                continue;
            }

            const now = new Date().toISOString();

            await firestoreRequest("categories", {
                method: "POST",
                idToken: session.idToken,
                body: {
                    fields: {
                        name: { stringValue: name },
                        createdAt: { timestampValue: now },
                        updatedAt: { timestampValue: now }
                    }
                }
            });

            existingNames.add(name.toLowerCase());
        }

        /* RELOAD CATEGORY COLLECTION */

        const updatedResult = await firestoreRequest(":runQuery", {
            method: "POST",
            idToken: session.idToken,
            body: {
                structuredQuery: {
                    from: [{ collectionId: "categories" }]
                }
            }
        });

        categories = updatedResult
            .filter(item => item.document)
            .map(item => ({
                id: item.document.name.split("/").pop(),
                name: item.document.fields.name?.stringValue || ""
            }))
            .filter(category => category.name)
            .sort((a, b) => a.name.localeCompare(b.name));

        populateCategoryDropdowns();
    }

    /* POPULATE BOTH CATEGORY DROPDOWNS */

    function populateCategoryDropdowns() {

        productCategory.innerHTML = "";

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select Category";

        productCategory.appendChild(placeholder);

        categoryFilter.innerHTML = "";

        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "All Categories";

        categoryFilter.appendChild(allOption);

        categories.forEach(category => {

            const productOption = document.createElement("option");
            productOption.value = category.name;
            productOption.textContent = category.name;

            productCategory.appendChild(productOption);

            const filterOption = document.createElement("option");
            filterOption.value = category.name;
            filterOption.textContent = category.name;

            categoryFilter.appendChild(filterOption);
        });
    }

    /* PRODUCT MODAL */

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

    productModal.addEventListener("click", event => {
        if (event.target === productModal) {
            closeProductModal();
        }
    });

    /* SAVE OR UPDATE PRODUCT */

    addProductForm.addEventListener("submit", async event => {

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
                category: productCategory.value,
                description: document.querySelector("#product-description").value.trim(),
                price: price,
                stockQuantity: stock,
                imageUrl: document.querySelector("#product-image").value.trim()
            };

            if (!productData.category) {
                alert("Please select a product category.");
                return;
            }

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

        message.textContent = visibleCount === 0
            ? "No matching products found."
            : `${visibleCount} of ${productEntries.length} products shown.`;
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

        /* LOAD AND SYNC CATEGORIES BEFORE DISPLAYING PRODUCTS */

        await loadCategories(session, products);

        productsContainer.innerHTML = "";

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

                /* SUPPORT OLD CATEGORIES NOT IN THE LIST */

                const currentCategory =
                    fields.category?.stringValue || "";

                if (
                    currentCategory &&
                    ![...productCategory.options].some(
                        option => option.value === currentCategory
                    )
                ) {
                    const option = document.createElement("option");
                    option.value = currentCategory;
                    option.textContent = currentCategory;
                    productCategory.appendChild(option);
                }

                productCategory.value = currentCategory;

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
