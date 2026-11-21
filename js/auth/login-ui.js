
/* =====================================
   KARTO CUSTOMER & ADMIN LOGIN UI
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const loginForm = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("login-button");
    const loginMessage = document.getElementById("login-message");

    // Retrieve the user's role from Firestore
    async function getDashboardPath(session) {

        const response = await firestoreRequest(
            `users/${encodeURIComponent(session.uid)}`,
            {
                idToken: session.idToken
            }
        );

        const role = response.fields?.role?.stringValue;

        if (role === "primaryAdmin" || role === "admin") {
            return "../admin/dashboard.html";
        }

        if (role === "customer") {
            return "../customer/dashboard.html";
        }

        throw new Error("Your account does not have a valid role.");
    }

    // Redirect users who already have an active session
    try {

        const existingSession = await getUserSession();

        if (existingSession) {

            const dashboardPath = await getDashboardPath(existingSession);

            window.location.href = dashboardPath;
            return;
        }

    } catch (error) {

        console.error("Existing session check failed:", error);
        clearUserSession();

    }

    // Handle login
    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        loginMessage.textContent = "";
        loginMessage.style.color = "#c0392b";

        loginButton.disabled = true;
        loginButton.textContent = "Signing In...";

        try {

            // Authenticate with Firebase
            const authData = await signInWithEmailAndPassword(
                emailInput.value,
                passwordInput.value
            );

            // Save authenticated session
            saveUserSession(authData);

            // Retrieve the saved session
            const session = await getUserSession();

            if (!session) {
                throw new Error("Unable to establish your login session.");
            }

            // Determine the correct dashboard
            const dashboardPath = await getDashboardPath(session);

            loginMessage.style.color = "#287a45";
            loginMessage.textContent = "Login successful!";

            console.log("Login successful. Redirecting to:", dashboardPath);

            window.location.href = dashboardPath;

        } catch (error) {

            console.error("Login error:", error);

            clearUserSession();

            loginMessage.style.color = "#c0392b";
            loginMessage.textContent = error.message;

        } finally {

            loginButton.disabled = false;
            loginButton.textContent = "Sign In";

        }

    });

});
