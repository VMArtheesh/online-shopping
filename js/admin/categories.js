
/* =====================================
   KARTO ADMIN CATEGORY MANAGEMENT
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const categoriesContainer = document.querySelector("#categories-container");
    const categoriesMessage = document.querySelector("#categories-message");

    const addButton = document.querySelector("#add-category-button");
    const modal = document.querySelector("#add-category-modal");
    const form = document.querySelector("#category-form");
    const nameInput = document.querySelector("#category-name");
    const saveButton = document.querySelector("#save-category-button");

    const closeButton = document.querySelector("#close-category-form");
    const cancelButton = document.querySelector("#cancel-category-form");

    const formHeading = document.querySelector(
        ".category-form-heading h2"
    );

    let categories = [];
    let editingCategory = null;

    /* FIRESTORE HELPERS */

    async function getCategories() {

        const result = await firestoreRequest(":runQuery", {
            method: "POST",
            idToken: session.idToken,
            body: {
                structuredQuery: {
                    from: [{ collectionId: "categories" }]
                }
            }
        });

        return result
            .filter(item => item.document)
            .map(item => ({
                ...item.document,
                id: item.document.name.split("/").pop(),
                categoryName: item.document.fields.name?.stringValue || ""
            }))
            .sort((a, b) =>
                a.categoryName.localeCompare(b.categoryName)
            );
    }

    async function getProducts() {

        const result = await firestoreRequest(":runQuery", {
            method: "POST",
            idToken: session.idToken,
            body: {
                structuredQuery: {
                    from: [{ collectionId: "products" }]
                }
            }
        });

        return result
            .filter(item => item.document)
            .map(item => item.document);
    }

    function showMessage(message, isError = false) {

        categoriesMessage.textContent = message;
        categoriesMessage.className = isError
            ? "category-message-error"
            : "category-message-success";
    }

    function showFormMessage(message, isError = false) {

        const formMessage = document.querySelector(
            "#category-form-message"
        );

        formMessage.textContent = message;
        formMessage.className = isError
            ? "category-message-error"
            : "category-message-success";
    }

    /* MODAL */

    function openModal(category = null) {

        editingCategory = category;

        form.reset();
        showFormMessage("");

        if (category) {

            formHeading.textContent = "Edit Category";
            saveButton.textContent = "Update Category";
            nameInput.value = category.categoryName;

        } else {

            formHeading.textContent = "Add New Category";
            saveButton.textContent = "Save Category";
        }

        modal.hidden = false;
        nameInput.focus();
    }

    function closeModal() {

        modal.hidden = true;
        editingCategory = null;
        form.reset();
        showFormMessage("");
    }

    addButton.addEventListener("click", () => openModal());

    closeButton.addEventListener("click", closeModal);
    cancelButton.addEventListener("click", closeModal);

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal();
        }
    });

    /* DISPLAY CATEGORIES */

    function renderCategories() {

        categoriesContainer.innerHTML = "";

        if (categories.length === 0) {

            categoriesContainer.textContent =
                "No categories found. Add your first category.";

            return;
        }

        categories.forEach(category => {

            const card = document.createElement("div");
            card.className = "category-card";

            const details = document.createElement("div");
            details.className = "category-card-info";

            const heading = document.createElement("h3");
            heading.textContent = category.categoryName;

            const idText = document.createElement("p");
            idText.textContent = `Category ID: ${category.id}`;

            details.append(heading, idText);

            const actions = document.createElement("div");
            actions.className = "category-card-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "Edit";
            editButton.className = "category-edit-button";

            editButton.addEventListener("click", () => {
                openModal(category);
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.className = "category-delete-button";

            deleteButton.addEventListener("click", () => {
                deleteCategory(category, deleteButton);
            });

            actions.append(editButton, deleteButton);
            card.append(details, actions);

            categoriesContainer.appendChild(card);
        });
    }

    /* CHECK DUPLICATE NAMES */

    function isDuplicateName(name) {

        return categories.some(category =>
            category.categoryName.toLowerCase() === name.toLowerCase() &&
            category.id !== editingCategory?.id
        );
    }

    /* SAVE OR UPDATE CATEGORY */

    form.addEventListener("submit", async event => {

        event.preventDefault();

        const name = nameInput.value.trim();

        if (!name) {
            showFormMessage("Please enter a category name.", true);
            return;
        }

        if (isDuplicateName(name)) {
            showFormMessage("This category already exists.", true);
            return;
        }

        try {

            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            const currentSession = await getUserSession();

            if (!currentSession) {
                window.location.href = "../auth/login.html";
                return;
            }

            const now = new Date().toISOString();

            if (editingCategory) {

                const products = await getProducts();

                const assignedProducts = products.filter(product =>
                    product.fields.category?.stringValue ===
                    editingCategory.categoryName
                );

                const writes = [];

                /* UPDATE THE CATEGORY DOCUMENT */

                writes.push({
                    update: {
                        name: editingCategory.name,
                        fields: {
                            name: { stringValue: name },
                            updatedAt: { timestampValue: now }
                        }
                    },
                    updateMask: {
                        fieldPaths: ["name", "updatedAt"]
                    },
                    currentDocument: {
                        updateTime: editingCategory.updateTime
                    }
                });

                /* UPDATE PRODUCTS USING THIS CATEGORY */

                assignedProducts.forEach(product => {

                    writes.push({
                        update: {
                            name: product.name,
                            fields: {
                                category: { stringValue: name },
                                updatedAt: { timestampValue: now }
                            }
                        },
                        updateMask: {
                            fieldPaths: ["category", "updatedAt"]
                        },
                        currentDocument: {
                            updateTime: product.updateTime
                        }
                    });

                });

                await firestoreRequest(":commit", {
                    method: "POST",
                    idToken: currentSession.idToken,
                    body: { writes }
                });

                showMessage(
                    `Category updated. ${assignedProducts.length} product(s) updated.`
                );

            } else {

                await firestoreRequest("categories", {
                    method: "POST",
                    idToken: currentSession.idToken,
                    body: {
                        fields: {
                            name: { stringValue: name },
                            createdAt: { timestampValue: now },
                            updatedAt: { timestampValue: now }
                        }
                    }
                });

                showMessage("Category added successfully.");
            }

            closeModal();
            await loadCategories();

        } catch (error) {

            console.error("Category saving failed:", error);

            showFormMessage(
                "Unable to save category: " + error.message,
                true
            );

        } finally {

            saveButton.disabled = false;
            saveButton.textContent = editingCategory
                ? "Update Category"
                : "Save Category";
        }

    });

    /* DELETE CATEGORY */

    async function deleteCategory(category, button) {

        const confirmed = confirm(
            `Delete "${category.categoryName}"? This action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        try {

            button.disabled = true;
            button.textContent = "Deleting...";

            const products = await getProducts();

            const assignedProducts = products.filter(product =>
                product.fields.category?.stringValue ===
                category.categoryName
            );

            if (assignedProducts.length > 0) {

                showMessage(
                    `Cannot delete "${category.categoryName}". ` +
                    `${assignedProducts.length} product(s) are using this category.`,
                    true
                );

                button.disabled = false;
                button.textContent = "Delete";

                return;
            }

            const currentSession = await getUserSession();

            if (!currentSession) {
                window.location.href = "../auth/login.html";
                return;
            }

            await firestoreRequest(
                `categories/${encodeURIComponent(category.id)}`,
                {
                    method: "DELETE",
                    idToken: currentSession.idToken
                }
            );

            showMessage("Category deleted successfully.");

            await loadCategories();

        } catch (error) {

            console.error("Category deletion failed:", error);

            showMessage(
                "Unable to delete category: " + error.message,
                true
            );

            button.disabled = false;
            button.textContent = "Delete";
        }
    }

    /* LOAD CATEGORIES */

    async function loadCategories() {

        try {

            showMessage("Loading categories...");

            categories = await getCategories();

            renderCategories();

            showMessage(`${categories.length} categories found.`);

        } catch (error) {

            console.error("Unable to load categories:", error);

            showMessage(
                "Unable to load categories. Please try again.",
                true
            );
        }
    }

    /* INITIALIZE */

    const session = await getUserSession();

    if (!session) {
        window.location.href = "../auth/login.html";
        return;
    }

    await loadCategories();

});
