
/* =====================================
   KARTO ADMIN ACCESS GUARD
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const adminName = document.querySelector("#admin-name");
    const logoutButton = document.querySelector("#admin-logout");

    try {

        // Check the current login session
        const session = await getUserSession();

        if (!session) {
            window.location.href = "../auth/login.html";
            return;
        }

        // Retrieve the user's Firestore profile
        const response = await firestoreRequest(
            `users/${encodeURIComponent(session.uid)}`,
            {
                idToken: session.idToken
            }
        );

        const fields = response.fields || {};

        const role = fields.role?.stringValue;
        const fullName = fields.fullName?.stringValue || "Administrator";

        // Allow only authorized administrators
        if (role !== "primaryAdmin" && role !== "admin") {
            window.location.href = "../customer/dashboard.html";
            return;
        }

        // Display administrator name
        adminName.textContent = fullName;

        console.log("Admin access verified:", role);

    } catch (error) {

        console.error("Admin verification failed:", error);

        alert("Unable to verify administrator access.");

        clearUserSession();

        window.location.href = "../auth/login.html";

        return;
    }

    // Admin logout
    logoutButton.addEventListener("click", () => {

        clearUserSession();

        window.location.href = "../auth/login.html";

    });

});
