
document.addEventListener("DOMContentLoaded", async () => {

    // Check customer session
    const session = await getUserSession();

    if (!session) {
        window.location.href = "../auth/login.html";
        return;
    }

    // Get form elements
    const profileForm = document.getElementById("profile-form");
    const fullNameInput = document.getElementById("full-name");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const message = document.getElementById("profile-message");
    const saveButton = document.getElementById("save-profile-button");

    let originalProfile = null;

    // Load customer profile
    try {

        const profile = await firestoreRequest(
            `users/${encodeURIComponent(session.uid)}`,
            {
                method: "GET",
                idToken: session.idToken
            }
        );

        const fields = profile.fields;

        originalProfile = fields;

        fullNameInput.value = fields.fullName.stringValue;
        emailInput.value = fields.email.stringValue;
        phoneInput.value = fields.phone.stringValue;

    } catch (error) {

        console.error("Profile loading failed:", error);
        message.textContent = "Unable to load your profile. Please try again.";
        saveButton.disabled = true;
        return;
    }

    // Save profile changes
    profileForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const fullName = fullNameInput.value.trim();
        const phone = phoneInput.value.trim();

        if (!fullName || !phone) {
            message.textContent = "Please complete all required fields.";
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
        message.textContent = "";

        try {

            await updateCustomerProfile(
                session.uid,
                session.idToken,
                {
                    fullName,
                    phone
                }
            );

            message.textContent = "Profile updated successfully!";

            originalProfile = {
                ...originalProfile,
                fullName: { stringValue: fullName },
                phone: { stringValue: phone }
            };

        } catch (error) {

            console.error("Profile update failed:", error);
            message.textContent = "Unable to update your profile. Please try again.";

        } finally {

            saveButton.disabled = false;
            saveButton.textContent = "Save Changes";

        }

    });

});
