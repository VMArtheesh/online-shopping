
/* =====================================
   KARTO CUSTOMER PROFILE SERVICE
===================================== */

/**
 * Saves a customer's profile in Firestore.
 *
 * @param {object} authData - Firebase authentication response
 * @param {object} profileData - Customer personal details
 */

async function createCustomerProfile(authData, profileData) {

    const endpoint =
        `users?documentId=${encodeURIComponent(authData.localId)}`;

    const profile = {
        fields: {
            uid: {
                stringValue: authData.localId
            },
            fullName: {
                stringValue: profileData.fullName.trim()
            },
            email: {
                stringValue: authData.email
            },
            phone: {
                stringValue: profileData.phone.trim()
            },
            role: {
                stringValue: "customer"
            },
            createdAt: {
                timestampValue: new Date().toISOString()
            }
        }
    };

    return await firestoreRequest(endpoint, {
        method: "POST",
        idToken: authData.idToken,
        body: profile
    });
}

/**
 * Updates a customer's personal profile.
 *
 * @param {string} uid - Customer's Firebase UID
 * @param {string} idToken - Customer's Firebase ID token
 * @param {object} profileData - Updated profile information
 */


async function updateCustomerProfile(uid, idToken, profileData) {

    const document = {
        fields: {
            fullName: {
                stringValue: profileData.fullName
            },
            phone: {
                stringValue: profileData.phone
            }
        }
    };

    return await firestoreRequest(
        `users/${encodeURIComponent(uid)}?updateMask.fieldPaths=fullName&updateMask.fieldPaths=phone`,
        {
            method: "PATCH",
            idToken,
            body: document
        }
    );
}
