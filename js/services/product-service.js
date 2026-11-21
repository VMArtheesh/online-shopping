
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
/* =====================================
   GET ALL PRODUCTS (ADMIN)
===================================== */

/* =====================================
   GET ALL PRODUCTS (ADMIN)
===================================== */

async function getAllProducts(idToken) {

    const response = await firestoreRequest(":runQuery", {
        method: "POST",
        idToken: idToken,
        body: {
            structuredQuery: {
                from: [
                    { collectionId: "products" }
                ]
            }
        }
    });

    return response
        .filter(item => item.document)
        .map(item => item.document);
}
/* =====================================
   UPDATE PRODUCT (ADMIN)
===================================== */

async function updateProduct(productId, productData, idToken) {

    const now = new Date().toISOString();

    const document = {
        fields: {
            name: {
                stringValue: productData.name
            },
            category: {
                stringValue: productData.category
            },
            description: {
                stringValue: productData.description
            },
            price: {
                doubleValue: Number(productData.price)
            },
            stockQuantity: {
                integerValue: String(productData.stockQuantity)
            },
            imageUrl: {
                stringValue: productData.imageUrl
            },
            updatedAt: {
                timestampValue: now
            }
        }
    };

    const updateFields = [
        "name",
        "category",
        "description",
        "price",
        "stockQuantity",
        "imageUrl",
        "updatedAt"
    ];

    const updateMask = updateFields
        .map(field => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
        .join("&");

    return await firestoreRequest(
        `products/${encodeURIComponent(productId)}?${updateMask}`,
        {
            method: "PATCH",
            idToken: idToken,
            body: document
        }
    );
}

/* =====================================
   UPDATE PRODUCT STATUS (ADMIN)
===================================== */

async function updateProductStatus(productId, isActive, idToken) {

    const document = {
        fields: {
            isActive: {
                booleanValue: isActive
            },
            updatedAt: {
                timestampValue: new Date().toISOString()
            }
        }
    };

    return await firestoreRequest(
        `products/${encodeURIComponent(productId)}?updateMask.fieldPaths=isActive&updateMask.fieldPaths=updatedAt`,
        {
            method: "PATCH",
            idToken: idToken,
            body: document
        }
    );
}

/* =====================================
   UPDATE PRODUCT STOCK (ADMIN)
===================================== */

async function updateProductStock(productId, stockQuantity, idToken) {

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
        throw new Error("Stock quantity must be a non-negative integer.");
    }

    const document = {
        fields: {
            stockQuantity: {
                integerValue: String(stockQuantity)
            },
            updatedAt: {
                timestampValue: new Date().toISOString()
            }
        }
    };

    return await firestoreRequest(
        `products/${encodeURIComponent(productId)}?updateMask.fieldPaths=stockQuantity&updateMask.fieldPaths=updatedAt`,
        {
            method: "PATCH",
            idToken: idToken,
            body: document
        }
    );
}
