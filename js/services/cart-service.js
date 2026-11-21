
/* =====================================
   KARTO CART SERVICE
===================================== */

/**
 * Gets the currently logged-in customer.
 */
function getCartSession() {

    const session = JSON.parse(
        sessionStorage.getItem("kartoUserSession") || "null"
    );

    if (!session?.uid || !session?.idToken) {
        throw new Error("Please log in to use your cart.");
    }

    return session;
}

/**
 * Validates cart quantity.
 */
function validateCartQuantity(quantity) {

    if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99
    ) {
        throw new Error("Quantity must be between 1 and 99.");
    }

}

/**
 * Gets all items in the customer's cart.
 */
async function getCartItems() {

    const session = getCartSession();

    const response = await firestoreRequest(
        `carts/${session.uid}/items`,
        {
            idToken: session.idToken
        }
    );

    return (response.documents || []).map(document => {

        const fields = document.fields || {};

        return {
            productId: fields.productId?.stringValue,
            quantity: Number(fields.quantity?.integerValue || 0),
            createdAt: fields.createdAt?.timestampValue,
            updatedAt: fields.updatedAt?.timestampValue
        };

    });

}

/**
 * Adds a product to the customer's cart.
 * If the product already exists, increases its quantity.
 */
async function addToCart(productId, quantity = 1) {

    const session = getCartSession();

    if (!productId) {
        throw new Error("Invalid product.");
    }

    validateCartQuantity(quantity);

    const cartItems = await getCartItems();

    const existingItem = cartItems.find(
        item => item.productId === productId
    );

    const newQuantity = existingItem
        ? existingItem.quantity + quantity
        : quantity;

    validateCartQuantity(newQuantity);

    const currentTime = new Date().toISOString();

    const cartItem = {
        productId,
        quantity: newQuantity,
        createdAt: existingItem?.createdAt || currentTime,
        updatedAt: currentTime
    };

    await firestoreRequest(
        `carts/${session.uid}/items/${productId}`,
        {
            method: "PATCH",
            idToken: session.idToken,
            body: {
                fields: {
                    productId: {
                        stringValue: cartItem.productId
                    },
                    quantity: {
                        integerValue: String(cartItem.quantity)
                    },
                    createdAt: {
                        timestampValue: cartItem.createdAt
                    },
                    updatedAt: {
                        timestampValue: cartItem.updatedAt
                    }
                }
            }
        }
    );

    return cartItem;

}

/**
 * Updates the quantity of an existing cart item.
 */
async function updateCartItemQuantity(productId, quantity) {

    validateCartQuantity(quantity);

    const session = getCartSession();

    const cartItems = await getCartItems();

    const existingItem = cartItems.find(
        item => item.productId === productId
    );

    if (!existingItem) {
        throw new Error("Product not found in your cart.");
    }

    const currentTime = new Date().toISOString();

    await firestoreRequest(
        `carts/${session.uid}/items/${productId}`,
        {
            method: "PATCH",
            idToken: session.idToken,
            body: {
                fields: {
                    productId: {
                        stringValue: productId
                    },
                    quantity: {
                        integerValue: String(quantity)
                    },
                    createdAt: {
                        timestampValue: existingItem.createdAt
                    },
                    updatedAt: {
                        timestampValue: currentTime
                    }
                }
            }
        }
    );

}

/**
 * Removes a product from the customer's cart.
 */
async function removeFromCart(productId) {

    const session = getCartSession();

    if (!productId) {
        throw new Error("Invalid product.");
    }

    await firestoreRequest(
        `carts/${session.uid}/items/${productId}`,
        {
            method: "DELETE",
            idToken: session.idToken
        }
    );

}
