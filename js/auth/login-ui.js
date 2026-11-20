
/* =====================================
   KARTO CUSTOMER LOGIN UI
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const loginForm = document.getElementById("login-form");

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const loginButton = document.getElementById("login-button");
    const loginMessage = document.getElementById("login-message");
    // Redirect customers who already have an active session
    if (await getUserSession()) {
        window.location.href = "../customer/dashboard.html";
        return;
    }

    // Handle customer login
    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        loginMessage.textContent = "";
        loginMessage.style.color = "#c0392b";

        // Prevent repeated submissions
        loginButton.disabled = true;
        loginButton.textContent = "Signing In...";

        try {

            // Authenticate customer with Firebase
            const authData = await signInWithEmailAndPassword(
                emailInput.value,
                passwordInput.value
            );

            // Save the customer session
            saveUserSession(authData);

            loginMessage.style.color = "#287a45";
            loginMessage.textContent =
                "Login successful!";

            console.log("Customer login successful.");
            // Redirect to customer dashboard
            window.location.href = "../customer/dashboard.html";

        } catch (error) {

            loginMessage.style.color = "#c0392b";
            loginMessage.textContent = error.message;

        } finally {

            loginButton.disabled = false;
            loginButton.textContent = "Sign In";

        }

    });

});
