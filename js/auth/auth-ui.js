
document.addEventListener("DOMContentLoaded", () => {
    // Redirect customers who already have an active session
    if (getUserSession()) {
        window.location.href = "../customer/dashboard.html";
        return;
    }

    const signupForm = document.getElementById("signup-form");

    const step1 = document.getElementById("signup-step-1");
    const step2 = document.getElementById("signup-step-2");

    const nextButton = document.getElementById("next-button");
    const backButton = document.getElementById("back-button");
    const signupButton = document.getElementById("signup-button");

    const progressStep1 = document.getElementById("progress-step-1");
    const progressStep2 = document.getElementById("progress-step-2");
    const progressLine = document.getElementById("progress-line");

    const fullNameInput = document.getElementById("full-name");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");

    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirm-password");

    const signupMessage = document.getElementById("signup-message");

    // Step 1: Continue to account security
    nextButton.addEventListener("click", () => {

        const personalDetails = [
            fullNameInput,
            emailInput,
            phoneInput
        ];

        const isValid = personalDetails.every(input => {
            return input.reportValidity();
        });

        if (!isValid) {
            return;
        }

        step1.hidden = true;
        step2.hidden = false;

        progressStep1.classList.add("completed");
        progressStep2.classList.add("active");
        progressLine.classList.add("completed");

        passwordInput.focus();
    });

    // Return to personal details
    backButton.addEventListener("click", () => {

        step2.hidden = true;
        step1.hidden = false;

        progressStep1.classList.remove("completed");
        progressStep2.classList.remove("active");
        progressLine.classList.remove("completed");

        signupMessage.textContent = "";

    });

    // Step 2: Create Firebase account
    
    // Step 2: Create Firebase account and customer profile
    signupForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        signupMessage.textContent = "";
        signupMessage.style.color = "#c0392b";

        // Check password length
        if (passwordInput.value.length < 8) {
            signupMessage.textContent =
                "Password must contain at least 8 characters.";
            passwordInput.focus();
            return;
        }

        // Check password confirmation
        if (passwordInput.value !== confirmPasswordInput.value) {
            signupMessage.textContent = "Passwords do not match.";
            confirmPasswordInput.focus();
            return;
        }

        // Prevent repeated submissions
        signupButton.disabled = true;
        signupButton.textContent = "Creating Account...";

        try {

            // 1. Create Firebase Authentication account
            const authData = await signUpWithEmailAndPassword(
                emailInput.value,
                passwordInput.value
            );

            // 2. Save customer details in Firestore
            await createCustomerProfile(authData, {
                fullName: fullNameInput.value,
                phone: phoneInput.value
            });

            //3. Save the customer session
            saveUserSession(authData);

            // 4. Redirect customer to dashboard
            console.log("Customer account and profile created successfully.");

            window.location.href = "../customer/dashboard.html";

        } catch (error) {

            signupMessage.style.color = "#c0392b";
            signupMessage.textContent = error.message;

        } finally {

            signupButton.disabled = false;
            signupButton.textContent = "Create Account";

        }

    });
});