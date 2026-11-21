
/* =====================================
   KARTO ADMIN MANAGEMENT
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const totalAdminsElement = document.querySelector("#total-admins");
    const primaryAdminsElement = document.querySelector("#primary-admins");
    const secondaryAdminsElement = document.querySelector("#secondary-admins");

    const messageElement = document.querySelector("#admin-management-message");
    const container = document.querySelector("#admin-management-container");
    const searchInput = document.querySelector("#admin-management-search");
    const addAdminButton = document.querySelector("#add-admin-button");

    const modal = document.querySelector("#add-admin-modal");
    const addAdminForm = document.querySelector("#add-admin-form");
    const emailInput = document.querySelector("#new-admin-email");
    const modalMessage = document.querySelector("#add-admin-message");
    const confirmButton = document.querySelector("#confirm-add-admin");

    const closeButton = document.querySelector("#close-add-admin-modal");
    const cancelButton = document.querySelector("#cancel-add-admin");

    let adminAccounts = [];
    let currentRole = "";

    /* =====================================
       DISPLAY ADMINISTRATOR ACCOUNTS
    ===================================== */


function displayAdmins(accounts) {

    container.innerHTML = "";

    if (accounts.length === 0) {
        container.textContent = "No administrator accounts found.";
        return;
    }

    accounts.forEach(account => {

        const row = document.createElement("div");
        row.className = "admin-account-row";

        const info = document.createElement("div");
        info.className = "admin-account-info";

        const name = document.createElement("h3");
        name.textContent = account.fullName || "Unnamed Administrator";

        const email = document.createElement("p");
        email.textContent = account.email || "No email available";

        const phone = document.createElement("p");
        phone.textContent = account.phone || "No phone available";

        const role = document.createElement("span");
        role.className = "admin-account-role";
        role.textContent = account.role === "primaryAdmin"
            ? "Primary Admin"
            : "Secondary Admin";

        info.append(name, email, phone);
        row.append(info, role);

        if (
            currentRole === "primaryAdmin" &&
            account.role === "admin"
        ) {

            const demoteButton = document.createElement("button");

            demoteButton.type = "button";
            demoteButton.className = "demote-admin-button";
            demoteButton.textContent = "Demote";
            demoteButton.dataset.userId = account.uid;

            row.appendChild(demoteButton);

        }

        container.appendChild(row);

    });

}


    /* =====================================
       FILTER ADMINISTRATORS
    ===================================== */

    function filterAdmins() {

        const searchTerm = searchInput.value.trim().toLowerCase();

        const filteredAccounts = adminAccounts.filter(account => {

            return (
                (account.fullName || "").toLowerCase().includes(searchTerm) ||
                (account.email || "").toLowerCase().includes(searchTerm) ||
                (account.phone || "").toLowerCase().includes(searchTerm)
            );

        });

        displayAdmins(filteredAccounts);

        messageElement.textContent =
            `Showing ${filteredAccounts.length} of ${adminAccounts.length} administrators.`;

    }

    /* =====================================
       GET ALL USER PROFILES
    ===================================== */

    async function getAllUserProfiles(session) {

        const response = await firestoreRequest(
            ":runQuery",
            {
                method: "POST",
                idToken: session.idToken,
                body: {
                    structuredQuery: {
                        from: [
                            {
                                collectionId: "users"
                            }
                        ]
                    }
                }
            }
        );

        return response
            .filter(item => item.document)
            .map(item => {

                const fields = item.document.fields || {};

                return {
                    uid: fields.uid?.stringValue || "",
                    fullName: fields.fullName?.stringValue || "",
                    email: fields.email?.stringValue || "",
                    phone: fields.phone?.stringValue || "",
                    role: fields.role?.stringValue || ""
                };

            });

    }

    /* =====================================
       LOAD ADMINISTRATOR ACCOUNTS
    ===================================== */

    async function loadAdmins() {

        try {

            messageElement.textContent = "Loading administrators...";

            const session = await getUserSession();

            if (!session) {
                window.location.href = "../auth/login.html";
                return;
            }

            const currentUserResponse = await firestoreRequest(
                `users/${encodeURIComponent(session.uid)}`,
                {
                    idToken: session.idToken
                }
            );

            currentRole =
                currentUserResponse.fields?.role?.stringValue;

            if (
                currentRole !== "primaryAdmin" &&
                currentRole !== "admin"
            ) {
                window.location.href = "../customer/dashboard.html";
                return;
            }

            // Only Primary Admin can add administrators.
            if (currentRole === "primaryAdmin") {

                addAdminButton.disabled = false;
                addAdminButton.style.display = "inline-block";
                addAdminButton.title = "Promote an existing customer.";

            } else {

                addAdminButton.style.display = "none";

            }

            const users = await getAllUserProfiles(session);

            adminAccounts = users.filter(user =>
                user.role === "primaryAdmin" ||
                user.role === "admin"
            );

            const primaryCount = adminAccounts.filter(
                user => user.role === "primaryAdmin"
            ).length;

            const secondaryCount = adminAccounts.filter(
                user => user.role === "admin"
            ).length;

            totalAdminsElement.textContent = adminAccounts.length;
            primaryAdminsElement.textContent = primaryCount;
            secondaryAdminsElement.textContent = secondaryCount;

            filterAdmins();

        } catch (error) {

            console.error("Admin management error:", error);

            messageElement.textContent =
                "Unable to load administrator accounts.";

            container.textContent = "";

        }

    }

    /* =====================================
       OPEN AND CLOSE MODAL
    ===================================== */

    function openModal() {

        modal.classList.add("active");
        modalMessage.textContent = "";
        emailInput.value = "";
        emailInput.focus();

    }

    function closeModal() {

        modal.classList.remove("active");
        addAdminForm.reset();
        modalMessage.textContent = "";

    }

    addAdminButton.addEventListener("click", () => {

        if (currentRole !== "primaryAdmin") {
            return;
        }

        openModal();

    });

    closeButton.addEventListener("click", closeModal);
    cancelButton.addEventListener("click", closeModal);

    modal.addEventListener("click", event => {

        if (event.target === modal) {
            closeModal();
        }

    });

    /* =====================================
       PROMOTE CUSTOMER TO ADMIN
    ===================================== */

    addAdminForm.addEventListener("submit", async event => {

        event.preventDefault();

        if (currentRole !== "primaryAdmin") {
            modalMessage.textContent =
                "Only the Primary Admin can add administrators.";
            return;
        }

        const email = emailInput.value.trim().toLowerCase();

        if (!email) {
            modalMessage.textContent = "Enter a customer email address.";
            return;
        }

        try {

            confirmButton.disabled = true;
            confirmButton.textContent = "Promoting...";

            modalMessage.textContent = "Verifying customer account...";

            const session = await getUserSession();

            if (!session) {
                window.location.href = "../auth/login.html";
                return;
            }

            // Verify Primary Admin permission again.
            const currentUserResponse = await firestoreRequest(
                `users/${encodeURIComponent(session.uid)}`,
                {
                    idToken: session.idToken
                }
            );

            const verifiedRole =
                currentUserResponse.fields?.role?.stringValue;

            if (verifiedRole !== "primaryAdmin") {
                throw new Error("Primary Admin permission is required.");
            }

            // Find the registered customer.
            const users = await getAllUserProfiles(session);

            const customer = users.find(user =>
                user.email.toLowerCase() === email &&
                user.role === "customer"
            );

            if (!customer) {

                const existingAdmin = users.some(user =>
                    user.email.toLowerCase() === email &&
                    (user.role === "admin" || user.role === "primaryAdmin")
                );

                if (existingAdmin) {
                    throw new Error("This user is already an administrator.");
                }

                throw new Error(
                    "Customer not found. They must register through KARTO first."
                );

            }

            if (!customer.uid) {
                throw new Error("Customer account UID is missing.");
            }

            modalMessage.textContent = "Promoting customer to administrator...";

            // Update only the role field.
            await firestoreRequest(
                `users/${encodeURIComponent(customer.uid)}?updateMask.fieldPaths=role`,
                {
                    method: "PATCH",
                    idToken: session.idToken,
                    body: {
                        fields: {
                            role: {
                                stringValue: "admin"
                            }
                        }
                    }
                }
            );

            closeModal();

            messageElement.textContent =
                `${customer.fullName || customer.email} is now a Secondary Admin.`;

            await loadAdmins();

        } catch (error) {

            console.error("Add administrator error:", error);

            modalMessage.textContent =
                error.message || "Unable to promote this customer.";

        } finally {

            confirmButton.disabled = false;
            confirmButton.textContent = "Promote to Admin";

        }

    });

/* =====================================
   DEMOTE SECONDARY ADMINISTRATOR
===================================== */

container.addEventListener("click", async event => {

    const button = event.target.closest(".demote-admin-button");

    if (!button) {
        return;
    }

    if (currentRole !== "primaryAdmin") {
        return;
    }

    const userId = button.dataset.userId;

    const confirmed = window.confirm(
        "Are you sure you want to demote this administrator to a Customer?"
    );

    if (!confirmed) {
        return;
    }

    try {

        button.disabled = true;
        button.textContent = "Demoting...";

        const session = await getUserSession();

        if (!session) {
            window.location.href = "../auth/login.html";
            return;
        }

        // Verify Primary Admin permission again.
        const currentUserResponse = await firestoreRequest(
            `users/${encodeURIComponent(session.uid)}`,
            {
                idToken: session.idToken
            }
        );

        const verifiedRole =
            currentUserResponse.fields?.role?.stringValue;

        if (verifiedRole !== "primaryAdmin") {
            throw new Error("Only the Primary Admin can demote administrators.");
        }

        // Verify the target is still a Secondary Admin.
        const users = await getAllUserProfiles(session);

        const targetAdmin = users.find(user =>
            user.uid === userId &&
            user.role === "admin"
        );

        if (!targetAdmin) {
            throw new Error("Secondary Admin account not found.");
        }

        // Change only the role field.
        await firestoreRequest(
            `users/${encodeURIComponent(userId)}?updateMask.fieldPaths=role`,
            {
                method: "PATCH",
                idToken: session.idToken,
                body: {
                    fields: {
                        role: {
                            stringValue: "customer"
                        }
                    }
                }
            }
        );

        messageElement.textContent =
            `${targetAdmin.fullName || targetAdmin.email} has been demoted to Customer.`;

        await loadAdmins();

    } catch (error) {

        console.error("Admin demotion error:", error);

        messageElement.textContent =
            error.message || "Unable to demote administrator.";

        button.disabled = false;
        button.textContent = "Demote";

    }

});


    /* =====================================
       SEARCH EVENT
    ===================================== */

    searchInput.addEventListener("input", filterAdmins);

    /* =====================================
       INITIALIZE PAGE
    ===================================== */

    await loadAdmins();

});
