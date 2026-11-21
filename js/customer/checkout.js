
/* =====================================
   KARTO CHECKOUT
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const itemsContainer = document.querySelector("#checkout-items");
    const subtotalElement = document.querySelector("#checkout-subtotal");
    const deliveryElement = document.querySelector("#checkout-delivery");
    const totalElement = document.querySelector("#checkout-total");
    const placeOrderButton = document.querySelector("#place-order-button");
    const messageElement = document.querySelector("#checkout-message");
    const checkoutForm = document.querySelector("#checkout-form");

    const creditSummary = document.querySelector("#credit-summary");
    const creditLimitElement = document.querySelector("#credit-limit");
    const outstandingCreditElement = document.querySelector("#outstanding-credit");
    const availableCreditElement = document.querySelector("#available-credit");

    const creditRadio = document.querySelector(
        'input[name="paymentMethod"][value="credit"]'
    );

    let checkoutItems = [];
    let subtotal = 0;
    let cartIsValid = false;
    let creditDataLoaded = false;
    let isSubmitting = false;

    let creditData = {
        limit: 0,
        outstanding: 0,
        available: 0
    };

    const deliveryFee = 0;

    const currencyFormatter = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    });

    function formatPrice(price) {
        return currencyFormatter.format(price);
    }

    function getFieldValue(field) {

        if (!field) return "";

        return field.stringValue ??
               field.integerValue ??
               field.doubleValue ??
               field.booleanValue ??
               "";

    }

    function getCheckoutSession() {

        const session = JSON.parse(
            sessionStorage.getItem("kartoUserSession") || "null"
        );

        if (!session?.uid || !session?.idToken) {
            throw new Error("Please log in to continue.");
        }

        return session;
    }

    function getDocumentId(document) {
        return document.name.split("/").pop();
    }

    /* =====================================
       FIRESTORE RESOURCE NAME
    ===================================== */

    function getFirestoreDocumentName(path) {

        return `projects/${firebaseConfig.projectId}/databases/(default)/documents/${path}`;

    }

    /* =====================================
       FIRESTORE VALUE HELPERS
    ===================================== */

    function stringValue(value) {
        return { stringValue: String(value) };
    }

    function integerValue(value) {
        return { integerValue: String(value) };
    }

    function doubleValue(value) {
        return { doubleValue: Number(value) };
    }

    function timestampValue(value) {
        return { timestampValue: value };
    }

    function mapValue(fields) {

        return {
            mapValue: {
                fields: fields
            }
        };

    }

    /* =====================================
       LOAD CUSTOMER DETAILS
    ===================================== */

    async function loadCustomerDetails() {

        const session = getCheckoutSession();

        const response = await firestoreRequest(
            `users/${encodeURIComponent(session.uid)}`,
            {
                method: "GET",
                idToken: session.idToken
            }
        );

        const fields = response.fields || {};

        document.querySelector("#delivery-name").value =
            fields.fullName?.stringValue || "";

        document.querySelector("#delivery-phone").value =
            fields.phone?.stringValue || "";

    }

    /* =====================================
       GET OR CREATE CUSTOMER CREDIT
    ===================================== */

    async function getOrCreateCustomerCredit(session) {

        try {

            return await firestoreRequest(
                `customerCredits/${encodeURIComponent(session.uid)}`,
                {
                    idToken: session.idToken
                }
            );

        } catch (error) {

            const errorMessage = error.message.toLowerCase();

            if (
                !errorMessage.includes("not_found") &&
                !errorMessage.includes("not found")
            ) {
                throw error;
            }

            const now = new Date().toISOString();

            await firestoreRequest(
                ":commit",
                {
                    method: "POST",
                    idToken: session.idToken,
                    body: {
                        writes: [
                            {
                                update: {
                                    name: getFirestoreDocumentName(
                                        `customerCredits/${session.uid}`
                                    ),
                                    fields: {
                                        customerId: stringValue(session.uid),
                                        outstandingCredit: doubleValue(0),
                                        updatedAt: timestampValue(now)
                                    }
                                },
                                currentDocument: {
                                    exists: false
                                }
                            }
                        ]
                    }
                }
            );

            return await firestoreRequest(
                `customerCredits/${encodeURIComponent(session.uid)}`,
                {
                    idToken: session.idToken
                }
            );

        }

    }

    /* =====================================
       LOAD CUSTOMER CREDIT DETAILS
    ===================================== */

    async function loadCreditDetails() {

        try {

            const session = getCheckoutSession();

            const [settingsResponse, creditResponse] = await Promise.all([

                firestoreRequest(
                    "settings/store",
                    {
                        idToken: session.idToken
                    }
                ),

                getOrCreateCustomerCredit(session)

            ]);

            const settingsFields = settingsResponse.fields || {};
            const creditFields = creditResponse.fields || {};

            creditData.limit = Number(
                getFieldValue(settingsFields.creditLimit)
            );

            creditData.outstanding = Number(
                getFieldValue(creditFields.outstandingCredit)
            );

            if (
                !Number.isFinite(creditData.limit) ||
                !Number.isFinite(creditData.outstanding) ||
                creditData.limit < 0 ||
                creditData.outstanding < 0
            ) {
                throw new Error("Invalid credit information.");
            }

            creditData.available =
                creditData.limit - creditData.outstanding;

            creditDataLoaded = true;

            displayCreditDetails();

            creditRadio.disabled = false;

            updatePlaceOrderButton();

        } catch (error) {

            console.error("Credit loading error:", error);

            creditRadio.disabled = true;

            messageElement.textContent =
                "Unable to load credit information. Credit payment is unavailable.";

        }

    }

    /* =====================================
       DISPLAY CREDIT DETAILS
    ===================================== */

    function displayCreditDetails() {

        creditLimitElement.textContent =
            formatPrice(creditData.limit);

        outstandingCreditElement.textContent =
            formatPrice(creditData.outstanding);

        availableCreditElement.textContent =
            formatPrice(creditData.available);

    }

    /* =====================================
       PAYMENT METHOD
    ===================================== */

    function updateCreditSummary() {

        const selectedPayment = document.querySelector(
            'input[name="paymentMethod"]:checked'
        );

        const isCreditSelected =
            selectedPayment?.value === "credit";

        creditSummary.hidden = !isCreditSelected;

        messageElement.textContent = "";

        updatePlaceOrderButton();

        if (
            isCreditSelected &&
            creditDataLoaded &&
            subtotal > creditData.available
        ) {

            messageElement.textContent =
                "Insufficient available credit for this order.";

        }

    }

    document.querySelectorAll(
        'input[name="paymentMethod"]'
    ).forEach(radio => {

        radio.addEventListener("change", updateCreditSummary);

    });

    /* =====================================
       LOAD CART ITEMS
    ===================================== */

    async function loadCheckoutItems() {

        try {

            const cartItems = await getCartItems();

            if (cartItems.length === 0) {

                itemsContainer.textContent = "Your cart is empty.";

                placeOrderButton.disabled = true;

                return;

            }

            const products = await getActiveProducts();

            checkoutItems = cartItems.map(cartItem => {

                const productDocument = products.find(product =>
                    getDocumentId(product) === cartItem.productId
                );

                if (!productDocument) {

                    return {
                        ...cartItem,
                        unavailable: true
                    };

                }

                const fields = productDocument.fields || {};

                return {
                    productId: cartItem.productId,
                    name: getFieldValue(fields.name),
                    category: getFieldValue(fields.category),
                    price: Number(getFieldValue(fields.price)),
                    imageUrl: getFieldValue(fields.imageUrl),
                    quantity: cartItem.quantity,
                    stockQuantity: Number(
                        getFieldValue(fields.stockQuantity)
                    )
                };

            });

            displayCheckoutItems();

        } catch (error) {

            console.error("Checkout loading error:", error);

            itemsContainer.textContent =
                error.message || "Unable to load your cart.";

            placeOrderButton.disabled = true;

        }

    }

    /* =====================================
       DISPLAY CART ITEMS
    ===================================== */

    function displayCheckoutItems() {

        itemsContainer.replaceChildren();

        subtotal = 0;
        cartIsValid = checkoutItems.length > 0;

        checkoutItems.forEach(item => {

            const itemElement = document.createElement("div");
            itemElement.className = "checkout-item";

            if (item.unavailable) {

                cartIsValid = false;

                itemElement.textContent =
                    "A product in your cart is no longer available.";

                itemsContainer.appendChild(itemElement);

                return;

            }

            if (
                !Number.isFinite(item.price) ||
                item.price <= 0 ||
                !Number.isInteger(item.stockQuantity) ||
                item.stockQuantity < 0 ||
                !Number.isInteger(item.quantity) ||
                item.quantity < 1 ||
                item.quantity > item.stockQuantity
            ) {

                cartIsValid = false;

            }

            const itemTotal = item.price * item.quantity;

            subtotal += itemTotal;

            const name = document.createElement("h3");
            name.textContent = item.name;

            const quantity = document.createElement("p");
            quantity.textContent = `Quantity: ${item.quantity}`;

            const price = document.createElement("p");
            price.textContent = formatPrice(itemTotal);

            if (item.imageUrl) {

                const image = document.createElement("img");

                image.src = item.imageUrl;
                image.alt = item.name;
                image.width = 75;
                image.height = 75;
                image.loading = "lazy";

                itemElement.appendChild(image);

            }

            itemElement.append(name, quantity, price);

            if (item.quantity > item.stockQuantity) {

                const warning = document.createElement("p");

                warning.textContent = "Insufficient stock available.";

                itemElement.appendChild(warning);

            }

            itemsContainer.appendChild(itemElement);

        });

        subtotalElement.textContent = formatPrice(subtotal);

        deliveryElement.textContent = formatPrice(deliveryFee);

        totalElement.textContent =
            formatPrice(subtotal + deliveryFee);

        updatePlaceOrderButton();

        updateCreditSummary();

    }

    /* =====================================
       CHECKOUT VALIDATION
    ===================================== */

    function updatePlaceOrderButton() {

        const selectedPayment = document.querySelector(
            'input[name="paymentMethod"]:checked'
        );

        const paymentMethod = selectedPayment?.value;

        let isValid = cartIsValid && checkoutItems.length > 0;

        if (!paymentMethod) {
            isValid = false;
        }

        if (paymentMethod === "credit") {

            if (
                !creditDataLoaded ||
                subtotal > creditData.available
            ) {
                isValid = false;
            }

        }

        placeOrderButton.disabled = !isValid || isSubmitting;

    }

    /* =====================================
       BUILD ORDER ITEM SNAPSHOTS
    ===================================== */

    function buildOrderItems(items) {

        return items.map(item => {

            const lineTotal = item.price * item.quantity;

            return mapValue({

                productId: stringValue(item.productId),

                productName: stringValue(item.name),

                category: stringValue(item.category),

                imageUrl: stringValue(item.imageUrl),

                unitPrice: doubleValue(item.price),

                quantity: integerValue(item.quantity),

                lineTotal: doubleValue(lineTotal)

            });

        });

    }

    /* =====================================
       PLACE ORDER
    ===================================== */

    async function placeOrder(event) {

        event.preventDefault();

        if (isSubmitting) return;

        messageElement.textContent = "";

        if (!checkoutForm.reportValidity()) {
            return;
        }

        let session;

        try {
            session = getCheckoutSession();
        } catch (error) {
            messageElement.textContent = error.message;
            return;
        }

        const paymentMethod = document.querySelector(
            'input[name="paymentMethod"]:checked'
        )?.value;

        if (!paymentMethod) {

            messageElement.textContent =
                "Please select a payment method.";

            return;

        }

        isSubmitting = true;

        placeOrderButton.disabled = true;
        placeOrderButton.textContent = "Placing Order...";

        try {

            // Reload cart and products before placing the order.
            const [latestCart, latestProducts] = await Promise.all([

                getCartItems(),

                getActiveProducts()

            ]);

            if (latestCart.length === 0) {
                throw new Error("Your cart is empty.");
            }

            const latestItems = latestCart.map(cartItem => {

                const productDocument = latestProducts.find(product =>
                    getDocumentId(product) === cartItem.productId
                );

                if (!productDocument) {

                    throw new Error(
                        "A product is no longer available. Please review your cart."
                    );

                }

                const fields = productDocument.fields || {};

                const item = {

                    productId: cartItem.productId,

                    name: getFieldValue(fields.name),

                    category: getFieldValue(fields.category),

                    imageUrl: getFieldValue(fields.imageUrl),

                    price: Number(getFieldValue(fields.price)),

                    quantity: cartItem.quantity,

                    stockQuantity: Number(
                        getFieldValue(fields.stockQuantity)
                    ),

                    updateTime: productDocument.updateTime

                };

                if (
                    !Number.isFinite(item.price) ||
                    item.price <= 0 ||
                    !Number.isInteger(item.quantity) ||
                    item.quantity < 1 ||
                    !Number.isInteger(item.stockQuantity) ||
                    item.stockQuantity < item.quantity ||
                    !item.updateTime
                ) {

                    throw new Error(
                        `Insufficient stock or invalid product information: ${item.name}`
                    );

                }

                return item;

            });

            const latestSubtotal = latestItems.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            );

            const totalAmount = latestSubtotal + deliveryFee;

            // Recheck credit before accepting a credit order.
            let latestCredit = null;

            if (paymentMethod === "credit") {

                const [settingsResponse, creditResponse] =
                    await Promise.all([

                        firestoreRequest(
                            "settings/store",
                            {
                                idToken: session.idToken
                            }
                        ),

                        getOrCreateCustomerCredit(session)

                    ]);

                const settingsFields = settingsResponse.fields || {};
                const creditFields = creditResponse.fields || {};

                const limit = Number(
                    getFieldValue(settingsFields.creditLimit)
                );

                const outstanding = Number(
                    getFieldValue(creditFields.outstandingCredit)
                );

                if (
                    !Number.isFinite(limit) ||
                    !Number.isFinite(outstanding) ||
                    limit < 0 ||
                    outstanding < 0
                ) {

                    throw new Error("Invalid credit information.");

                }

                const available = limit - outstanding;

                if (totalAmount > available) {

                    throw new Error(
                        "Insufficient available credit. Please choose Cash or reduce your cart total."
                    );

                }

                if (!creditResponse.updateTime) {

                    throw new Error(
                        "Credit record could not be verified."
                    );

                }

                latestCredit = {
                    outstanding,
                    updateTime: creditResponse.updateTime
                };

            }

            const fullName = document.querySelector(
                "#delivery-name"
            ).value.trim();

            const phone = document.querySelector(
                "#delivery-phone"
            ).value.trim();

            const address = document.querySelector(
                "#delivery-address"
            ).value.trim();

            if (!fullName || !phone || !address) {

                throw new Error(
                    "Please complete your delivery details."
                );

            }

            const orderId = crypto.randomUUID()
                .replace(/-/g, "")
                .toUpperCase();

            const now = new Date().toISOString();

            // Prepare order document.
            const orderFields = {

                orderId: stringValue(orderId),

                customerId: stringValue(session.uid),

                customerName: stringValue(fullName),

                customerPhone: stringValue(phone),

                deliveryAddress: stringValue(address),

                items: {
                    arrayValue: {
                        values: buildOrderItems(latestItems)
                    }
                },

                subtotal: doubleValue(latestSubtotal),

                deliveryFee: doubleValue(deliveryFee),

                totalAmount: doubleValue(totalAmount),

                paymentMethod: stringValue(paymentMethod),

                paymentStatus: stringValue(
                    paymentMethod === "cash" ? "pending" : "unpaid"
                ),

                orderStatus: stringValue("confirmed"),

                createdAt: timestampValue(now),

                updatedAt: timestampValue(now)

            };

            const writes = [];

            // Create the order document.
            writes.push({

                update: {

                    name: getFirestoreDocumentName(
                        `orders/${orderId}`
                    ),

                    fields: orderFields

                },

                currentDocument: {
                    exists: false
                }

            });

            // Decrease product stock.
            latestItems.forEach(item => {

                writes.push({

                    update: {

                        name: getFirestoreDocumentName(
                            `products/${item.productId}`
                        ),

                        fields: {

                            stockQuantity: integerValue(
                                item.stockQuantity - item.quantity
                            ),

                            updatedAt: timestampValue(now)

                        }

                    },

                    updateMask: {

                        fieldPaths: [
                            "stockQuantity",
                            "updatedAt"
                        ]

                    },

                    currentDocument: {
                        updateTime: item.updateTime
                    }

                });

            });

            // Update outstanding credit for credit purchases.
            if (paymentMethod === "credit") {

                writes.push({

                    update: {

                        name: getFirestoreDocumentName(
                            `customerCredits/${session.uid}`
                        ),

                        fields: {

                            outstandingCredit: doubleValue(
                                latestCredit.outstanding + totalAmount
                            ),

                            updatedAt: timestampValue(now)

                        }

                    },

                    updateMask: {

                        fieldPaths: [
                            "outstandingCredit",
                            "updatedAt"
                        ]

                    },

                    currentDocument: {
                        updateTime: latestCredit.updateTime
                    }

                });

            }

            // Delete purchased cart items.
            latestCart.forEach(item => {

                writes.push({

                    delete: getFirestoreDocumentName(
                        `carts/${session.uid}/items/${item.productId}`
                    )

                });

            });

            // Commit all changes together.
            await firestoreRequest(
                ":commit",
                {
                    method: "POST",
                    idToken: session.idToken,
                    body: {
                        writes: writes
                    }
                }
            );

            // Display order confirmation.
            checkoutItems = [];
            cartIsValid = false;
            subtotal = 0;

            itemsContainer.replaceChildren();

            const confirmation = document.createElement("div");
            confirmation.className = "checkout-success";

            const heading = document.createElement("h3");
            heading.textContent = "Order placed successfully!";

            const orderNumber = document.createElement("p");
            orderNumber.textContent = `Order ID: ${orderId}`;

            const total = document.createElement("p");
            total.textContent =
                `Order Total: ${formatPrice(totalAmount)}`;

            const payment = document.createElement("p");
            payment.textContent =
                `Payment Method: ${paymentMethod.toUpperCase()}`;

            confirmation.append(
                heading,
                orderNumber,
                total,
                payment
            );

            itemsContainer.appendChild(confirmation);

            subtotalElement.textContent = formatPrice(0);
            deliveryElement.textContent = formatPrice(0);
            totalElement.textContent = formatPrice(0);

            checkoutForm.reset();

            creditSummary.hidden = true;

            messageElement.textContent =
                "Your order has been saved successfully.";

            placeOrderButton.textContent = "Order Placed";
            placeOrderButton.disabled = true;

            // Refresh displayed credit information.
            if (paymentMethod === "credit") {

                creditData.outstanding += totalAmount;

                creditData.available =
                    creditData.limit - creditData.outstanding;

                displayCreditDetails();

            }

            // Prevent editing the completed checkout.
            checkoutForm.querySelectorAll(
                "input, textarea"
            ).forEach(field => {
                field.disabled = true;
            });

        } catch (error) {

            console.error("Order placement error:", error);

            messageElement.textContent =
                error.message ||
                "Unable to place your order. Please try again.";

            isSubmitting = false;

            placeOrderButton.textContent = "Place Order";

            updatePlaceOrderButton();

            return;

        }

        isSubmitting = false;

    }

    checkoutForm.addEventListener("submit", placeOrder);

    /* =====================================
       INITIALIZE CHECKOUT
    ===================================== */

    try {

        getCheckoutSession();

        await Promise.all([

            loadCheckoutItems(),

            loadCustomerDetails(),

            loadCreditDetails()

        ]);

    } catch (error) {

        console.error("Checkout initialization error:", error);

        itemsContainer.textContent =
            "Please log in to continue.";

        placeOrderButton.disabled = true;

    }

});
