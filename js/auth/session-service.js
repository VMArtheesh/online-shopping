
/* =====================================
   KARTO AUTHENTICATION SESSION SERVICE
===================================== */

/**
 * Stores the authenticated customer's session.
 *
 * @param {object} authData - Firebase authentication response
 */

function saveUserSession(authData) {

    const session = {
        uid: authData.localId,
        email: authData.email,
        idToken: authData.idToken,
        refreshToken: authData.refreshToken,
        expiresAt: Date.now() + (Number(authData.expiresIn) * 1000)
    };

    sessionStorage.setItem(
        "kartoUserSession",
        JSON.stringify(session)
    );
}


/**
 * Retrieves the current customer session.
 *
 * @returns {object|null}
 */


/**
 * Retrieves and validates the current customer session.
 * Automatically refreshes the Firebase ID token when needed.
 *
 * @returns {Promise<object|null>}
 */

async function getUserSession() {

    const sessionData = sessionStorage.getItem("kartoUserSession");

    if (!sessionData) {
        return null;
    }

    try {

        const session = JSON.parse(sessionData);

        // Refresh the token if it expires within 5 minutes
        if (Date.now() >= session.expiresAt - (5 * 60 * 1000)) {

            const tokenData = await refreshFirebaseToken(
                session.refreshToken
            );

            session.idToken = tokenData.id_token;
            session.refreshToken = tokenData.refresh_token;
            session.expiresAt =
                Date.now() + (Number(tokenData.expires_in) * 1000);

            // Save the refreshed session
            sessionStorage.setItem(
                "kartoUserSession",
                JSON.stringify(session)
            );
        }

        return session;

    } catch (error) {

        console.error("Session validation failed:", error);

        clearUserSession();
        return null;

    }
}



/**
 * Clears the current customer session.
 */

function clearUserSession() {

    sessionStorage.removeItem("kartoUserSession");
}
