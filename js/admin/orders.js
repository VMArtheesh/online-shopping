
/* =====================================
   KARTO ADMIN ORDERS
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    const ordersContainer = document.querySelector("#orders-container");
    const ordersMessage = document.querySelector("#orders-message");
    const searchInput = document.querySelector("#orders-search");
    const statusFilter = document.querySelector("#orders-status-filter");

    let allOrders = [];

    const session = JSON.parse(
        sessionStorage.getItem("kartoUserSession") || "null"
    );

    /* =====================================
       FIRESTORE VALUE CONVERSION
    ===================================== */

    function getValue(value) {

        if (!value) return null;

        if (value.stringValue !== undefined) return value.stringValue;
        if (value.integerValue !== undefined) return Number(value.integerValue);
        if (value.doubleValue !== undefined) return Number(value.doubleValue);
        if (value.booleanValue !== undefined) return value.booleanValue;
        if (value.timestampValue !== undefined) return value.timestampValue;
        if (value.nullValue !== undefined) return null;

        if (value.mapValue) {
            return Object.fromEntries(
                Object.entries(value.mapValue.fields || {}).map(
                    ([key, field]) => [key, getValue(field)]
                )
            );
        }

        if (value.arrayValue) {
            return (value.arrayValue.values || []).map(getValue);
        }

        return null;
    }

    /* =====================================
       CONVERT ORDER DOCUMENT
    ===================================== */

    function getOrderData(document) {

        const fields = document.fields || {};
        const order = {};

        Object.entries(fields).forEach(([key, value]) => {
            order[key] = getValue(value);
        });

        order.documentName = document.name;
        order.orderId = order.orderId || document.name.split("/").pop();

        return order;
    }

    /* =====================================
       CREATE HTML ELEMENT
    ===================================== */

    function createElement(tag, className, text) {

        const element = document.createElement(tag);

        if (className) element.className = className;

        if (text !== undefined) element.textContent = text;

        return element;
    }

    /* =====================================
       FORMAT CURRENCY
    ===================================== */

    function formatCurrency(amount) {

        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(Number(amount) || 0);
    }

    /* =====================================
       FORMAT DATE
    ===================================== */

    function formatDate(dateValue) {

        if (!dateValue) return "Date unavailable";

        return new Date(dateValue).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    /* =====================================
       UPDATE ORDER SUMMARY
    ===================================== */

    function updateSummary() {

        document.querySelector("#total-orders").textContent =
            allOrders.length;

        document.querySelector("#pending-orders").textContent =
            allOrders.filter(order =>
                ["pending", "confirmed"].includes(order.orderStatus)
            ).length;

        document.querySelector("#processing-orders").textContent =
            allOrders.filter(order =>
                order.orderStatus === "processing"
            ).length;

        document.querySelector("#completed-orders").textContent =
            allOrders.filter(order =>
                order.orderStatus === "completed"
            ).length;
    }

    /* =====================================
       LOAD ORDERS FROM FIRESTORE
    ===================================== */

    async function loadOrders() {

        try {

            if (!session?.uid || !session?.idToken) {
                throw new Error("Please log in again.");
            }

            ordersMessage.textContent = "Loading orders...";
            ordersContainer.replaceChildren();

            const response = await firestoreRequest(":runQuery", {
                method: "POST",
                idToken: session.idToken,
                body: {
                    structuredQuery: {
                        from: [
                            {
                                collectionId: "orders"
                            }
                        ]
                    }
                }
            });

            allOrders = response
                .filter(item => item.document)
                .map(item => getOrderData(item.document))
                .sort((a, b) =>
                    new Date(b.createdAt || 0) -
                    new Date(a.createdAt || 0)
                );

            updateSummary();
            renderOrders();

        } catch (error) {

            console.error("Orders loading error:", error);
            ordersMessage.textContent = error.message;
        }
    }

    /* =====================================
       CREATE STATUS DROPDOWN
    ===================================== */

    function createStatusSelect(currentValue, options, className) {

        const select = createElement("select", className);

        options.forEach(option => {

            const optionElement = createElement(
                "option",
                "",
                option.label
            );

            optionElement.value = option.value;
            optionElement.selected = option.value === currentValue;

            select.appendChild(optionElement);
        });

        return select;
    }

    /* =====================================
       UPDATE ORDER FIELD
    ===================================== */

    async function updateOrderField(order, field, value) {

        try {

            const documentPath = order.documentName
                .split("/documents/")
                .pop();

            await firestoreRequest(
                `${documentPath}?updateMask.fieldPaths=${field}&updateMask.fieldPaths=updatedAt`,
                {
                    method: "PATCH",
                    idToken: session.idToken,
                    body: {
                        fields: {
                            [field]: {
                                stringValue: value
                            },
                            updatedAt: {
                                timestampValue: new Date().toISOString()
                            }
                        }
                    }
                }
            );

            order[field] = value;
            order.updatedAt = new Date().toISOString();

            updateSummary();

            ordersMessage.textContent = "Order updated successfully.";

            return true;

        } catch (error) {

            console.error("Order update error:", error);

            alert(`Unable to update order: ${error.message}`);

            return false;
        }
    }

    /* =====================================
       SEND PAYMENT CONFIRMATION EMAIL
    ===================================== */

    async function sendPaymentConfirmationEmail(order, amountPaid) {

        // Retrieve the customer's registered email address.
        const customerResponse = await firestoreRequest(
            `users/${encodeURIComponent(order.customerId)}`,
            {
                idToken: session.idToken
            }
        );

        const customerFields = customerResponse.fields || {};

        const customerEmail =
            customerFields.email?.stringValue || "";

        if (!customerEmail) {
            throw new Error(
                "Customer email address is unavailable."
            );
        }

        const paymentDate = new Date().toISOString();

        await sendKartoPaymentEmail({

            email: customerEmail,

            customer_name: order.customerName || "Customer",

            order_id: order.orderId,

            payment_method:
                (order.paymentMethod || "N/A").toUpperCase(),

            amount_paid: formatCurrency(amountPaid),

            payment_status: "Paid",

            payment_date: formatDate(paymentDate)

        });

        console.log(
            `Payment confirmation email sent for Order #${order.orderId}.`
        );
    }

    /* =====================================
       MARK CASH PAYMENT AS PAID
    ===================================== */

    async function markCashPaymentAsPaid(order, button) {

        if (
            order.paymentMethod !== "cash" ||
            order.paymentStatus !== "pending"
        ) {
            return;
        }

        const confirmed = window.confirm(
            `Have you received the cash payment for Order #${order.orderId}?\n\n` +
            `Amount: ${formatCurrency(order.totalAmount)}\n\n` +
            `Only confirm after receiving the payment.`
        );

        if (!confirmed) return;

        button.disabled = true;
        button.textContent = "Updating...";

        const success = await updateOrderField(
            order,
            "paymentStatus",
            "paid"
        );

        if (success) {

            // Payment is already saved in Firestore.
            // Email failure must not reverse the payment update.

            try {

                await sendPaymentConfirmationEmail(
                    order,
                    order.totalAmount
                );

                ordersMessage.textContent =
                    "Payment updated successfully. Confirmation email sent!";

            } catch (emailError) {

                console.error(
                    "Payment saved, but confirmation email failed:",
                    emailError
                );

                ordersMessage.textContent =
                    "Payment updated successfully, but the confirmation email could not be sent.";

            }

            renderOrders();

        } else {

            button.disabled = false;
            button.textContent = "Mark as Paid";

        }
    }

    /* =====================================
       CREATE ORDER CARD
    ===================================== */

    function createOrderCard(order) {

        const card = createElement("article", "order-card");

        // Header

        const header = createElement("div", "order-card-header");
        const orderInfo = createElement("div");

        orderInfo.append(
            createElement("h3", "", `Order #${order.orderId}`),
            createElement("p", "", formatDate(order.createdAt))
        );

        const total = createElement(
            "strong",
            "order-card-total",
            formatCurrency(order.totalAmount)
        );

        header.append(orderInfo, total);

        // Customer details

        const customer = createElement("div", "order-card-details");

        customer.append(
            createElement(
                "p",
                "",
                `Customer: ${order.customerName || "N/A"}`
            ),
            createElement(
                "p",
                "",
                `Phone: ${order.customerPhone || "N/A"}`
            ),
            createElement(
                "p",
                "",
                `Address: ${order.deliveryAddress || "N/A"}`
            ),
            createElement(
                "p",
                "",
                `Payment Method: ${(order.paymentMethod || "N/A").toUpperCase()}`
            ),
            createElement(
                "p",
                "",
                `Payment Status: ${(order.paymentStatus || "N/A").toUpperCase()}`
            )
        );

        // Cash payment action

        if (
            order.paymentMethod === "cash" &&
            order.paymentStatus === "pending" &&
            order.orderStatus !== "cancelled"
        ) {

            const paymentActions = createElement(
                "div",
                "order-payment-actions"
            );

            const paymentButton = createElement(
                "button",
                "mark-paid-button",
                "Mark as Paid"
            );

            paymentButton.type = "button";

            paymentButton.addEventListener("click", () => {
                markCashPaymentAsPaid(order, paymentButton);
            });

            paymentActions.appendChild(paymentButton);
            customer.appendChild(paymentActions);
        }

        // Order items

        const itemsHeading = createElement("h4", "", "Order Items");
        const itemsList = createElement("div", "order-card-items");

        (order.items || []).forEach(item => {

            const itemRow = createElement("p", "order-card-item");

            const lineTotal = item.lineTotal !== undefined
                ? item.lineTotal
                : (Number(item.unitPrice) || 0) *
                  (Number(item.quantity) || 0);

            itemRow.textContent =
                `${item.productName || "Product"} × ${item.quantity || 0} — ` +
                formatCurrency(lineTotal);

            itemsList.appendChild(itemRow);
        });

        // Order status

        const statusRow = createElement("div", "order-card-controls");

        statusRow.appendChild(
            createElement("label", "", "Order Status")
        );

        const statusOptions = [
            { value: "confirmed", label: "Confirmed" },
            { value: "processing", label: "Processing" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" }
        ];

        if (
            order.orderStatus &&
            !statusOptions.some(option =>
                option.value === order.orderStatus
            )
        ) {
            statusOptions.unshift({
                value: order.orderStatus,
                label: order.orderStatus
            });
        }

        const orderStatusSelect = createStatusSelect(
            order.orderStatus,
            statusOptions,
            "order-status-select"
        );

        orderStatusSelect.addEventListener("change", () => {

            updateOrderField(
                order,
                "orderStatus",
                orderStatusSelect.value
            );
        });

        statusRow.appendChild(orderStatusSelect);

        // Assemble card

        card.append(
            header,
            customer,
            itemsHeading,
            itemsList,
            statusRow
        );

        return card;
    }

    /* =====================================
       RENDER ORDERS
    ===================================== */

    function renderOrders() {

        const searchText = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;

        const filteredOrders = allOrders.filter(order => {

            const matchesSearch =
                (order.orderId || "").toLowerCase().includes(searchText) ||
                (order.customerName || "").toLowerCase().includes(searchText) ||
                (order.customerPhone || "").toLowerCase().includes(searchText);

            const matchesStatus =
                !selectedStatus ||
                order.orderStatus === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        ordersContainer.replaceChildren();

        if (filteredOrders.length === 0) {

            ordersMessage.textContent = "No matching orders found.";
            return;
        }

        ordersMessage.textContent =
            `Showing ${filteredOrders.length} of ${allOrders.length} orders.`;

        filteredOrders.forEach(order => {
            ordersContainer.appendChild(createOrderCard(order));
        });
    }

    /* =====================================
       EVENT LISTENERS
    ===================================== */

    searchInput.addEventListener("input", renderOrders);

    statusFilter.addEventListener("change", renderOrders);

    /* =====================================
       INITIALIZE
    ===================================== */

    loadOrders();

});
