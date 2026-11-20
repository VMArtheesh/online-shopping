
/* =====================================
   KARTO FORGOT PASSWORD UI
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    const resetForm = document.getElementById("forgot-password-form");
    const emailInput = document.getElementById("email");
    const resetButton = document.getElementById("reset-button");
    const resetMessage = document.getElementById("reset-message");

    resetForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        resetMessage.textContent = "";
        resetMessage.style.color = "#c0392b";

        resetButton.disabled = true;
        resetButton.textContent = "Sending...";

        try {

            await sendPasswordResetEmail(emailInput.value);

            resetMessage.style.color = "#287a45";
            resetMessage.textContent =
                "If an account exists for this email, a password reset email will be sent.";

            resetForm.reset();

        } catch (error) {

            resetMessage.textContent = error.message;

        } finally {

            resetButton.disabled = false;
            resetButton.textContent = "Send Reset Link";

        }

    });

});
