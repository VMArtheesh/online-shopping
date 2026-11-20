
/* =====================================
   KARTO CUSTOMER DASHBOARD
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    // Get the current customer session
    const session = await getUserSession();
    // Redirect customers who are not logged in
    if (!session) {
        window.location.href = "../auth/login.html";
        return;
    }

    // Dashboard elements
    const customerName = document.getElementById("customer-name");
    const customerEmail = document.getElementById("customer-email");
    const customerPhone = document.getElementById("customer-phone");

    try {

        // Retrieve customer profile from Firestore
        const profile = await firestoreRequest(
            `users/${encodeURIComponent(session.uid)}`,
            {
                method: "GET",
                idToken: session.idToken
            }
        );

        // Display customer information
        const fields = profile.fields;

        customerName.textContent =
            fields.fullName.stringValue;

        customerEmail.textContent =
            fields.email.stringValue;

        customerPhone.textContent =
            fields.phone.stringValue;

    } catch (error) {

        console.error("Dashboard loading failed:", error);

        customerName.textContent = "Customer";
        customerEmail.textContent = "Unable to load";
        customerPhone.textContent = "Unable to load";

    }

});
