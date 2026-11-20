
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

function getUserSession() {

    const sessionData = sessionStorage.getItem("kartoUserSession");

    if (!sessionData) {
        return null;
    }

    const session = JSON.parse(sessionData);

    // Check whether the ID token has expired
    if (Date.now() >= session.expiresAt) {
        clearUserSession();
        return null;
    }

    return session;
}


/**
 * Clears the current customer session.
 */

function clearUserSession() {

    sessionStorage.removeItem("kartoUserSession");
}
