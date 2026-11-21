
/* =====================================
   KARTO PRODUCT SERVICE
===================================== */

/**
 * Retrieves all active products from Firestore.
 *
 * @returns {Promise<Array>}
 */

async function getActiveProducts() {

    const response = await firestoreRequest(
        ":runQuery",
        {
            method: "POST",
            body: {
                structuredQuery: {
                    from: [
                        {
                            collectionId: "products"
                        }
                    ],
                    where: {
                        fieldFilter: {
                            field: {
                                fieldPath: "isActive"
                            },
                            op: "EQUAL",
                            value: {
                                booleanValue: true
                            }
                        }
                    }
                }
            }
        }
    );

    return response
        .filter(item => item.document)
        .map(item => item.document);
}
