
/* =====================================
   KARTO CUSTOMER DASHBOARD
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const session = await getUserSession();

    if (!session) {
        window.location.href = "../auth/login.html";
        return;
    }

    const customerName = document.getElementById("customer-name");
    const customerEmail = document.getElementById("customer-email");
    const customerPhone = document.getElementById("customer-phone");

    const creditLimitElement = document.getElementById("customer-credit-limit");
    const outstandingElement = document.getElementById("customer-outstanding-credit");
    const availableElement = document.getElementById("customer-available-credit");
    const creditMessage = document.getElementById("customer-credit-message");

    const formatCurrency = (amount) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(amount);

    try {

        const profile = await firestoreRequest(
            `users/${encodeURIComponent(session.uid)}`,
            {
                method: "GET",
                idToken: session.idToken
            }
        );

        const fields = profile.fields;

        customerName.textContent = fields.fullName.stringValue;
        customerEmail.textContent = fields.email.stringValue;
        customerPhone.textContent = fields.phone.stringValue;

    } catch (error) {

        console.error("Dashboard loading failed:", error);

        customerName.textContent = "Customer";
        customerEmail.textContent = "Unable to load";
        customerPhone.textContent = "Unable to load";

    }

    // Load customer credit details
    try {

        const [settings, credit] = await Promise.all([

            firestoreRequest("settings/store", {
                method: "GET",
                idToken: session.idToken
            }),

            firestoreRequest(
                `customerCredits/${encodeURIComponent(session.uid)}`,
                {
                    method: "GET",
                    idToken: session.idToken
                }
            )

        ]);

        const creditLimit = Number(
            settings.fields.creditLimit.doubleValue ??
            settings.fields.creditLimit.integerValue
        );

        const outstandingCredit = Number(
            credit.fields.outstandingCredit.doubleValue ??
            credit.fields.outstandingCredit.integerValue
        );

        const availableCredit = Math.max(
            0,
            creditLimit - outstandingCredit
        );

        creditLimitElement.textContent = formatCurrency(creditLimit);
        outstandingElement.textContent = formatCurrency(outstandingCredit);
        availableElement.textContent = formatCurrency(availableCredit);

        creditMessage.textContent = "Your credit information is up to date.";

    } catch (error) {

        console.error("Credit details loading failed:", error);

        creditLimitElement.textContent = "Unable to load";
        outstandingElement.textContent = "Unable to load";
        availableElement.textContent = "Unable to load";

        creditMessage.textContent =
            "Unable to retrieve your credit details. Please try again later.";

    }

});
