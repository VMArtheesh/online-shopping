
/* =====================================
   KARTO FIREBASE AUTHENTICATION SERVICE
===================================== */

/**
 * Creates a new Firebase Authentication account.
 *
 * @param {string} email - Customer email address
 * @param {string} password - Customer password
 * @returns {Promise<object>} Firebase authentication response
 */
async function signUpWithEmailAndPassword(email, password) {

    const endpoint =
        `${FIREBASE_AUTH_BASE_URL}/accounts:signUp?key=${firebaseConfig.apiKey}`;

    const response = await fetch(endpoint, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            email: email.trim(),
            password: password,
            returnSecureToken: true
        })
    });

    const data = await response.json();

    // Handle Firebase errors
    if (!response.ok) {

        const errorCode = data.error?.message;

        const errorMessages = {
            EMAIL_EXISTS: "This email address is already registered.",
            INVALID_EMAIL: "Please enter a valid email address.",
            WEAK_PASSWORD: "Password must contain at least 8 characters.",
            OPERATION_NOT_ALLOWED: "Email and password signups are disabled.",
            TOO_MANY_ATTEMPTS_TRY_LATER:
                "Too many attempts. Please try again later."
        };

        throw new Error(
            errorMessages[errorCode] ||
            "Unable to create your account. Please try again."
        );
    }

    return data;
}

/* =====================================
   FIREBASE CUSTOMER LOGIN
===================================== */

/**
 * Signs in a customer using Firebase Authentication.
 *
 * @param {string} email - Customer email address
 * @param {string} password - Customer password
 * @returns {Promise<object>} Firebase authentication response
 */

async function signInWithEmailAndPassword(email, password) {

    const endpoint =
        `${FIREBASE_AUTH_BASE_URL}/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`;

    const response = await fetch(endpoint, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            email: email.trim(),
            password: password,
            returnSecureToken: true
        })
    });

    const data = await response.json();

    // Handle Firebase errors
    if (!response.ok) {

        const errorCode = data.error?.message;

        const errorMessages = {
            INVALID_LOGIN_CREDENTIALS:
                "Incorrect email or password.",
            EMAIL_NOT_FOUND:
                "No account exists with this email address.",
            INVALID_PASSWORD:
                "Incorrect password.",
            USER_DISABLED:
                "This account has been disabled.",
            TOO_MANY_ATTEMPTS_TRY_LATER:
                "Too many attempts. Please try again later."
        };

        throw new Error(
            errorMessages[errorCode] ||
            "Unable to sign in. Please try again."
        );
    }

    return data;
}
/* =====================================
   FIREBASE PASSWORD RESET
===================================== */

/**
 * Sends a password reset email to the customer.
 *
 * @param {string} email - Registered customer email
 * @returns {Promise<object>} Firebase response
 */

async function sendPasswordResetEmail(email) {

    const endpoint =
        `${FIREBASE_AUTH_BASE_URL}/accounts:sendOobCode?key=${firebaseConfig.apiKey}`;

    const response = await fetch(endpoint, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            requestType: "PASSWORD_RESET",
            email: email.trim()
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            "Unable to send the password reset email. Please try again."
        );
    }

    return data;
}