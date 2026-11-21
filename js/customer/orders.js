
/* =====================================
   KARTO CUSTOMER ORDER HISTORY
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const ordersContainer = document.getElementById("customer-orders-container");
    const messageElement = document.getElementById("customer-orders-message");

    const session = JSON.parse(
        sessionStorage.getItem("kartoUserSession") || "null"
    );

    if (!session?.uid || !session?.idToken) {
        window.location.href = "../../pages/login.html";
        return;
    }

    try {
        messageElement.textContent = "Loading your orders...";

        const response = await firestoreRequest(":runQuery", {
            method: "POST",
            idToken: session.idToken,
            body: {
                structuredQuery: {
                    from: [
                        { collectionId: "orders" }
                    ],
                    where: {
                        fieldFilter: {
                            field: {
                                fieldPath: "customerId"
                            },
                            op: "EQUAL",
                            value: {
                                stringValue: session.uid
                            }
                        }
                    }
                }
            }
        });

        const orders = response
            .filter(item => item.document)
            .map(item => ({
                ...decodeOrderFields(item.document.fields || {}),
                documentName: item.document.name
            }));

        orders.sort((a, b) =>
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );

        renderCustomerOrders(orders);

    } catch (error) {
        console.error("Customer order history error:", error);
        messageElement.textContent =
            error.message || "Unable to load your orders.";
    }

    /* =====================================
       DECODE FIRESTORE FIELDS
    ===================================== */

    function decodeOrderFields(fields) {

        const order = {};

        Object.entries(fields).forEach(([key, value]) => {

            if (value.stringValue !== undefined) {
                order[key] = value.stringValue;

            } else if (value.integerValue !== undefined) {
                order[key] = Number(value.integerValue);

            } else if (value.doubleValue !== undefined) {
                order[key] = Number(value.doubleValue);

            } else if (value.booleanValue !== undefined) {
                order[key] = value.booleanValue;

            } else if (value.timestampValue !== undefined) {
                order[key] = value.timestampValue;

            } else if (value.arrayValue !== undefined) {
                order[key] = (value.arrayValue.values || []).map(item =>
                    decodeFirestoreValue(item)
                );

            } else if (value.mapValue !== undefined) {
                order[key] = decodeOrderFields(
                    value.mapValue.fields || {}
                );
            }
        });

        return order;
    }

    function decodeFirestoreValue(value) {

        if (value.stringValue !== undefined) return value.stringValue;
        if (value.integerValue !== undefined) return Number(value.integerValue);
        if (value.doubleValue !== undefined) return Number(value.doubleValue);
        if (value.booleanValue !== undefined) return value.booleanValue;
        if (value.timestampValue !== undefined) return value.timestampValue;

        if (value.mapValue !== undefined) {
            return decodeOrderFields(value.mapValue.fields || {});
        }

        if (value.arrayValue !== undefined) {
            return (value.arrayValue.values || []).map(decodeFirestoreValue);
        }

        return null;
    }

    /* =====================================
       RENDER CUSTOMER ORDERS
    ===================================== */

    function renderCustomerOrders(orders) {

        ordersContainer.replaceChildren();

        if (orders.length === 0) {
            messageElement.textContent = "You haven't placed any orders yet.";
            return;
        }

        messageElement.textContent =
            `${orders.length} order(s) found.`;

        orders.forEach(order => {

            const card = document.createElement("article");
            card.className = "customer-order-card";

            const header = document.createElement("div");
            header.className = "customer-order-header";

            const orderInfo = document.createElement("div");

            const orderId = document.createElement("h3");
            orderId.textContent = `Order #${order.orderId || "N/A"}`;

            const orderDate = document.createElement("p");
            orderDate.textContent = order.createdAt
                ? new Date(order.createdAt).toLocaleString("en-IN")
                : "Date unavailable";

            orderInfo.append(orderId, orderDate);

            const total = document.createElement("strong");
            total.className = "customer-order-total";
            total.textContent = formatCurrency(order.totalAmount);

            header.append(orderInfo, total);

            const details = document.createElement("div");
            details.className = "customer-order-details";

            details.append(
                createDetail("Payment Method", order.paymentMethod),
                createDetail("Payment Status", order.paymentStatus),
                createDetail("Order Status", order.orderStatus)
            );

            const itemsHeading = document.createElement("h4");
            itemsHeading.textContent = "Items";

            const itemsContainer = document.createElement("div");
            itemsContainer.className = "customer-order-items";

            (order.items || []).forEach(item => {

                const itemElement = document.createElement("p");
                itemElement.className = "customer-order-item";

                const itemName = item.productName || item.name || "Product";
                const quantity = Number(item.quantity || 0);
                const price = Number(item.price || 0);

                itemElement.textContent =
                    `${itemName} × ${quantity} — ${formatCurrency(price * quantity)}`;

                itemsContainer.appendChild(itemElement);
            });

            card.append(
                header,
                details,
                itemsHeading,
                itemsContainer
            );

            ordersContainer.appendChild(card);
        });
    }

    /* =====================================
       CREATE ORDER DETAIL
    ===================================== */

    function createDetail(label, value) {

        const detail = document.createElement("p");
        detail.textContent =
            `${label}: ${value || "N/A"}`;

        return detail;
    }

    /* =====================================
       FORMAT CURRENCY
    ===================================== */

    function formatCurrency(amount) {

        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(Number(amount || 0));
    }

});
