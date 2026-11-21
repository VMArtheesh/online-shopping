
/* =====================================
   KARTO ADMIN INVENTORY MANAGEMENT
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    /* =====================================
       DOM ELEMENTS
    ===================================== */

    const inventoryContainer = document.querySelector(
        "#inventory-container"
    );

    const message = document.querySelector(
        "#inventory-message"
    );

    const searchInput = document.querySelector(
        "#inventory-search"
    );

    const categoryFilter = document.querySelector(
        "#inventory-category-filter"
    );

    const totalProductsElement = document.querySelector(
        "#total-products"
    );

    const totalStockElement = document.querySelector(
        "#total-stock"
    );

    const lowStockElement = document.querySelector(
        "#low-stock-count"
    );

    const outOfStockElement = document.querySelector(
        "#out-of-stock-count"
    );

    const highStockElement = document.querySelector(
        "#high-stock-count"
    );

    /* STOCK UPDATE MODAL ELEMENTS */

    const stockModal = document.querySelector(
        "#stock-update-modal"
    );

    const stockUpdateForm = document.querySelector(
        "#stock-update-form"
    );

    const stockProductName = document.querySelector(
        "#stock-product-name"
    );

    const newStockInput = document.querySelector(
        "#new-stock-quantity"
    );

    const closeStockModalButton = document.querySelector(
        "#close-stock-modal"
    );

    const cancelStockUpdateButton = document.querySelector(
        "#cancel-stock-update"
    );

    const submitStockButton = document.querySelector(
        "#confirm-stock-update"
    );

    let inventoryItems = [];
    let selectedStockItem = null;

    /* =====================================
       DETERMINE STOCK STATUS
    ===================================== */

    function getStockStatus(stock) {

        if (stock === 0) {
            return {
                label: "Out of Stock",
                className: "out-of-stock"
            };
        }

        if (stock < 15) {
            return {
                label: "Low Stock",
                className: "low-stock"
            };
        }

        if (stock > 100) {
            return {
                label: "High Stock",
                className: "in-stock"
            };
        }

        return {
            label: "In Stock",
            className: "in-stock"
        };
    }

    /* =====================================
       UPDATE INVENTORY SUMMARY
    ===================================== */

    function updateInventorySummary() {

        const totalStock = inventoryItems.reduce(
            (total, item) => total + item.stock,
            0
        );

        const lowStockCount = inventoryItems.filter(
            item => item.stock > 0 && item.stock < 15
        ).length;

        const outOfStockCount = inventoryItems.filter(
            item => item.stock === 0
        ).length;

        const highStockCount = inventoryItems.filter(
            item => item.stock > 100
        ).length;

        totalProductsElement.textContent =
            inventoryItems.length;

        totalStockElement.textContent =
            totalStock.toLocaleString("en-IN");

        lowStockElement.textContent =
            lowStockCount;

        outOfStockElement.textContent =
            outOfStockCount;

        highStockElement.textContent =
            highStockCount;
    }

    /* =====================================
       DISPLAY INVENTORY
    ===================================== */

    function displayInventory(items) {

        inventoryContainer.innerHTML = "";

        const tableHeader = document.createElement("div");

        tableHeader.className =
            "inventory-table-row inventory-table-header";

        tableHeader.innerHTML = `
            <span>PRODUCT</span>
            <span>CATEGORY</span>
            <span>QUANTITY</span>
            <span>STOCK STATUS</span>
            <span>ACTION</span>
        `;

        inventoryContainer.appendChild(tableHeader);

        if (items.length === 0) {

            message.textContent =
                "No matching inventory found.";

            return;
        }

        items.forEach(item => {

            const status = getStockStatus(item.stock);

            const row = document.createElement("div");

            row.className = "inventory-table-row";

            const nameCell = document.createElement("span");
            nameCell.textContent = item.name;

            const categoryCell = document.createElement("span");
            categoryCell.textContent = item.category;

            const quantityCell = document.createElement("span");
            quantityCell.textContent = `${item.stock} units`;

            const statusCell = document.createElement("span");

            statusCell.className =
                `inventory-stock-status ${status.className}`;

            statusCell.textContent = status.label;

            const actionCell = document.createElement("button");

            actionCell.type = "button";
            actionCell.className = "inventory-update-button";
            actionCell.textContent = "Update Stock";

            actionCell.addEventListener("click", () => {
                openStockUpdate(item);
            });

            row.append(
                nameCell,
                categoryCell,
                quantityCell,
                statusCell,
                actionCell
            );

            inventoryContainer.appendChild(row);

        });

        message.textContent =
            `${items.length} products displayed.`;
    }

    /* =====================================
       SEARCH AND CATEGORY FILTER
    ===================================== */

    function filterInventory() {

        const searchTerm = searchInput.value
            .trim()
            .toLowerCase();

        const selectedCategory = categoryFilter.value;

        const filteredItems = inventoryItems.filter(item => {

            const matchesSearch =
                item.name.toLowerCase().includes(searchTerm) ||
                item.category.toLowerCase().includes(searchTerm);

            const matchesCategory =
                selectedCategory === "" ||
                item.category === selectedCategory;

            return matchesSearch && matchesCategory;

        });

        displayInventory(filteredItems);
    }

    searchInput.addEventListener(
        "input",
        filterInventory
    );

    categoryFilter.addEventListener(
        "change",
        filterInventory
    );

    /* =====================================
       OPEN STOCK UPDATE MODAL
    ===================================== */

    function openStockUpdate(item) {

        selectedStockItem = item;

        stockProductName.textContent = item.name;

        newStockInput.value = item.stock;

        stockModal.style.display = "flex";

        newStockInput.focus();
    }

    /* =====================================
       CLOSE STOCK UPDATE MODAL
    ===================================== */

    function closeStockModal() {

        stockModal.style.display = "none";

        stockUpdateForm.reset();

        selectedStockItem = null;
    }

    closeStockModalButton.addEventListener(
        "click",
        closeStockModal
    );

    cancelStockUpdateButton.addEventListener(
        "click",
        closeStockModal
    );

    /* =====================================
       SAVE UPDATED STOCK
    ===================================== */

    stockUpdateForm.addEventListener("submit", async event => {

        event.preventDefault();

        if (!selectedStockItem) {
            return;
        }

        const newStock = Number(newStockInput.value);

        if (
            newStockInput.value.trim() === "" ||
            !Number.isInteger(newStock) ||
            newStock < 0
        ) {
            alert("Please enter a valid stock quantity.");
            return;
        }

        try {

            submitStockButton.disabled = true;

            submitStockButton.textContent = "Updating...";

            const session = await getUserSession();

            if (!session) {
                window.location.href = "../auth/login.html";
                return;
            }

            await updateProductStock(
                selectedStockItem.id,
                newStock,
                session.idToken
            );

            selectedStockItem.stock = newStock;

            updateInventorySummary();

            closeStockModal();

            filterInventory();

            alert("Stock updated successfully!");

        } catch (error) {

            console.error("Stock update failed:", error);

            alert("Unable to update stock. Please try again.");

        } finally {

            submitStockButton.disabled = false;

            submitStockButton.textContent = "Update Stock";

        }

    });

    /* =====================================
       LOAD INVENTORY FROM FIRESTORE
    ===================================== */

    try {

        message.textContent = "Loading inventory...";

        const session = await getUserSession();

        if (!session) {
            window.location.href = "../auth/login.html";
            return;
        }

        const products = await getAllProducts(
            session.idToken
        );

        inventoryItems = products.map(productDocument => {

            const fields = productDocument.fields;

            return {
                id: productDocument.name.split("/").pop(),
                name: fields.name?.stringValue || "Unnamed Product",
                category: fields.category?.stringValue || "Uncategorized",
                stock: Number(fields.stockQuantity?.integerValue || 0),
                isActive: fields.isActive?.booleanValue === true
            };

        });

        updateInventorySummary();

        displayInventory(inventoryItems);

    } catch (error) {

        console.error(
            "Unable to load inventory:",
            error
        );

        message.textContent =
            "Unable to load inventory. Please try again.";

    }

});
