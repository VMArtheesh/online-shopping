
/* =====================================
   KARTO ADMIN CUSTOMER MANAGEMENT
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const customersContainer = document.getElementById("customers-container");
    const customersMessage = document.getElementById("customers-message");
    const customersSearch = document.getElementById("customers-search");
    const repaymentMessage = document.getElementById("repayment-message");

    const session = JSON.parse(
        sessionStorage.getItem("kartoUserSession") || "null"
    );

    if (!session?.uid || !session?.idToken) {
        window.location.href = "../../pages/login.html";
        return;
    }

    let customers = [];
    let customerCredits = [];
    let orders = [];
    let selectedCustomer = null;

    /* =====================================
       CREATE REPAYMENT MODAL
    ===================================== */

    const modal = document.createElement("div");
    modal.className = "repayment-modal-overlay";
    modal.id = "repayment-modal";

    modal.innerHTML = `
        <div class="repayment-modal" role="dialog"
             aria-modal="true" aria-labelledby="repayment-modal-title">

            <div class="repayment-modal-header">
                <div>
                    <p class="admin-eyebrow">CUSTOMER PAYMENT</p>
                    <h2 id="repayment-modal-title">Record Repayment</h2>
                </div>

                <button type="button"
                        class="repayment-modal-close"
                        id="repayment-close"
                        aria-label="Close">
                    &times;
                </button>
            </div>

            <div class="repayment-customer-info">
                <p>Customer</p>
                <h3 id="repayment-customer-name">Customer Name</h3>
            </div>

            <div class="repayment-balance">
                <p>Outstanding Credit</p>
                <h2 id="repayment-outstanding">₹0</h2>
            </div>

            <form id="repayment-form">

                <div class="repayment-form-group">
                    <label for="repayment-amount">
                        Amount Received (₹)
                    </label>

                    <input
                        type="number"
                        id="repayment-amount"
                        min="0.01"
                        step="0.01"
                        placeholder="Enter repayment amount"
                        required
                    >

                    <p id="repayment-validation"></p>
                </div>

                <div class="repayment-balance-preview">
                    <span>Remaining Credit</span>
                    <strong id="repayment-remaining">₹0</strong>
                </div>

                <div class="repayment-modal-actions">

                    <button type="button"
                            class="repayment-cancel-button"
                            id="repayment-cancel">
                        Cancel
                    </button>

                    <button type="submit"
                            class="repayment-confirm-button"
                            id="repayment-confirm"
                            disabled>
                        Confirm Repayment
                    </button>

                </div>

            </form>

        </div>
    `;

    document.body.appendChild(modal);

    const repaymentForm = document.getElementById("repayment-form");
    const repaymentInput = document.getElementById("repayment-amount");
    const repaymentValidation = document.getElementById("repayment-validation");
    const repaymentConfirm = document.getElementById("repayment-confirm");

    const closeModalButton = document.getElementById("repayment-close");
    const cancelModalButton = document.getElementById("repayment-cancel");

    /* =====================================
       LOAD CUSTOMER DATA
    ===================================== */

    try {

        customersMessage.textContent = "Loading customer records...";

        const [usersResponse, creditsResponse, ordersResponse] =
            await Promise.all([

                firestoreRequest(":runQuery", {
                    method: "POST",
                    idToken: session.idToken,
                    body: {
                        structuredQuery: {
                            from: [{ collectionId: "users" }]
                        }
                    }
                }),

                firestoreRequest(":runQuery", {
                    method: "POST",
                    idToken: session.idToken,
                    body: {
                        structuredQuery: {
                            from: [{ collectionId: "customerCredits" }]
                        }
                    }
                }),

                firestoreRequest(":runQuery", {
                    method: "POST",
                    idToken: session.idToken,
                    body: {
                        structuredQuery: {
                            from: [{ collectionId: "orders" }]
                        }
                    }
                })

            ]);

        customers = usersResponse
            .filter(item => item.document)
            .map(item => ({
                ...decodeFields(item.document.fields || {}),
                documentName: item.document.name
            }))
            .filter(customer => customer.role === "customer");

        customerCredits = creditsResponse
            .filter(item => item.document)
            .map(item => ({
                ...decodeFields(item.document.fields || {}),
                documentName: item.document.name
            }));

        orders = ordersResponse
            .filter(item => item.document)
            .map(item => ({
                ...decodeFields(item.document.fields || {}),
                documentName: item.document.name
            }));

        updateCustomerSummary();
        renderCustomers(customers);

    } catch (error) {

        console.error("Customer loading error:", error);

        customersMessage.textContent =
            error.message || "Unable to load customer records.";
    }

    /* =====================================
       DECODE FIRESTORE FIELDS
    ===================================== */

    function decodeFields(fields) {

        const result = {};

        Object.entries(fields).forEach(([key, value]) => {
            result[key] = decodeValue(value);
        });

        return result;
    }

    function decodeValue(value) {

        if (value.stringValue !== undefined) return value.stringValue;
        if (value.integerValue !== undefined) return Number(value.integerValue);
        if (value.doubleValue !== undefined) return Number(value.doubleValue);
        if (value.booleanValue !== undefined) return value.booleanValue;
        if (value.timestampValue !== undefined) return value.timestampValue;
        if (value.nullValue !== undefined) return null;

        if (value.mapValue !== undefined) {
            return decodeFields(value.mapValue.fields || {});
        }

        if (value.arrayValue !== undefined) {
            return (value.arrayValue.values || []).map(decodeValue);
        }

        return null;
    }

    /* =====================================
       CUSTOMER CREDIT HELPERS
    ===================================== */

    function getCustomerCredit(customerId) {

        return customerCredits.find(
            credit => credit.customerId === customerId
        );
    }

    function getCustomerOrders(customerId) {

        return orders.filter(
            order => order.customerId === customerId
        );
    }

    function getUnpaidCreditOrders(customerId) {

        return getCustomerOrders(customerId)
            .filter(order =>
                order.paymentMethod === "credit" &&
                order.paymentStatus === "unpaid"
            )
            .sort((a, b) =>
                new Date(a.createdAt || 0) -
                new Date(b.createdAt || 0)
            );
    }

    function getOrderRemainingAmount(order) {

        const total = Number(order.totalAmount || 0);
        const paid = Number(order.amountPaid || 0);

        return Math.max(0, roundMoney(total - paid));
    }

    function roundMoney(amount) {
        return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
    }

    /* =====================================
       UPDATE CUSTOMER SUMMARY
    ===================================== */

    function updateCustomerSummary() {

        const totalPurchases = orders.length;

        const totalOutstanding = customerCredits.reduce(
            (sum, credit) =>
                sum + Number(credit.outstandingCredit || 0),
            0
        );

        document.getElementById("total-customers").textContent =
            customers.length;

        document.getElementById("active-customers").textContent =
            customers.filter(customer =>
                getCustomerOrders(customer.uid).length > 0
            ).length;

        document.getElementById("total-customer-purchases").textContent =
            totalPurchases;

        document.getElementById("total-outstanding-credit").textContent =
            formatCurrency(totalOutstanding);
    }

    /* =====================================
       RENDER CUSTOMER LIST
    ===================================== */

    function renderCustomers(customerList) {

        customersContainer.replaceChildren();

        customersMessage.textContent =
            `${customerList.length} customer(s) found.`;

        if (customerList.length === 0) {
            customersMessage.textContent = "No customers found.";
            return;
        }

        customerList.forEach(customer => {

            const customerId = customer.uid;
            const credit = getCustomerCredit(customerId);

            const outstanding = Number(
                credit?.outstandingCredit || 0
            );

            const customerOrders = getCustomerOrders(customerId);
            const unpaidOrders = getUnpaidCreditOrders(customerId);

            const card = document.createElement("article");
            card.className = "customer-card";

            const header = document.createElement("div");
            header.className = "customer-card-header";

            const name = document.createElement("h3");
            name.textContent = customer.fullName || "Unnamed Customer";

            const purchaseCount = document.createElement("span");
            purchaseCount.textContent =
                `${customerOrders.length} purchase(s)`;

            header.append(name, purchaseCount);

            const details = document.createElement("div");
            details.className = "customer-card-details";

            details.append(
                createDetail("Email", customer.email),
                createDetail("Phone", customer.phone),
                createDetail("Outstanding Credit", formatCurrency(outstanding))
            );

            const creditOrdersHeading = document.createElement("h4");
            creditOrdersHeading.textContent = "Unpaid Credit Orders";

            const creditOrdersContainer = document.createElement("div");
            creditOrdersContainer.className = "customer-credit-orders";

            if (unpaidOrders.length === 0) {

                const emptyMessage = document.createElement("p");
                emptyMessage.textContent = "No unpaid credit orders.";

                creditOrdersContainer.appendChild(emptyMessage);

            } else {

                unpaidOrders.forEach(order => {

                    const orderItem = document.createElement("p");
                    orderItem.className = "customer-credit-order";

                    const orderRemaining = getOrderRemainingAmount(order);

                    orderItem.textContent =
                        `Order #${order.orderId || "N/A"} — ` +
                        `${formatCurrency(orderRemaining)} remaining`;

                    creditOrdersContainer.appendChild(orderItem);
                });
            }

            const actions = document.createElement("div");
            actions.className = "customer-credit-actions";

            const repaymentButton = document.createElement("button");
            repaymentButton.type = "button";
            repaymentButton.className = "customer-repayment-button";
            repaymentButton.textContent = "Record Repayment";
            repaymentButton.disabled = outstanding <= 0;

            repaymentButton.addEventListener("click", () => {
                openRepaymentModal(customer);
            });

            actions.appendChild(repaymentButton);

            card.append(
                header,
                details,
                creditOrdersHeading,
                creditOrdersContainer,
                actions
            );

            customersContainer.appendChild(card);
        });
    }

    function createDetail(label, value) {

        const detail = document.createElement("p");
        detail.textContent = `${label}: ${value || "N/A"}`;

        return detail;
    }

    /* =====================================
       OPEN REPAYMENT MODAL
    ===================================== */

    function openRepaymentModal(customer) {

        const credit = getCustomerCredit(customer.uid);

        if (!credit) {
            showRepaymentMessage(
                "Customer credit record was not found.",
                true
            );
            return;
        }

        const outstanding = roundMoney(
            Number(credit.outstandingCredit || 0)
        );

        if (outstanding <= 0) {
            showRepaymentMessage(
                "This customer has no outstanding credit.",
                true
            );
            return;
        }

        const unpaidOrders = getUnpaidCreditOrders(customer.uid);

        if (unpaidOrders.length === 0) {
            showRepaymentMessage(
                "No unpaid credit orders were found. Please check the credit records.",
                true
            );
            return;
        }

        const unpaidTotal = roundMoney(
            unpaidOrders.reduce(
                (sum, order) =>
                    sum + getOrderRemainingAmount(order),
                0
            )
        );

        if (Math.abs(unpaidTotal - outstanding) > 0.01) {
            showRepaymentMessage(
                "The outstanding credit and unpaid order balances do not match. Repayment was not recorded.",
                true
            );
            return;
        }

        selectedCustomer = customer;

        document.getElementById("repayment-customer-name").textContent =
            customer.fullName || "Unnamed Customer";

        document.getElementById("repayment-outstanding").textContent =
            formatCurrency(outstanding);

        repaymentInput.value = "";
        repaymentInput.max = outstanding;

        document.getElementById("repayment-remaining").textContent =
            formatCurrency(outstanding);

        repaymentValidation.textContent = "";
        repaymentValidation.className = "";

        repaymentConfirm.disabled = true;
        repaymentConfirm.textContent = "Confirm Repayment";

        modal.classList.add("active");
        document.body.classList.add("repayment-modal-open");

        repaymentInput.focus();
    }

    /* =====================================
       CLOSE REPAYMENT MODAL
    ===================================== */

    function closeRepaymentModal() {

        modal.classList.remove("active");
        document.body.classList.remove("repayment-modal-open");

        selectedCustomer = null;
        repaymentForm.reset();

        repaymentValidation.textContent = "";
        repaymentConfirm.disabled = true;
    }

    closeModalButton.addEventListener("click", closeRepaymentModal);
    cancelModalButton.addEventListener("click", closeRepaymentModal);

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeRepaymentModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            modal.classList.contains("active")
        ) {
            closeRepaymentModal();
        }
    });

    /* =====================================
       VALIDATE REPAYMENT AMOUNT
    ===================================== */

    function validateRepaymentAmount() {

        if (!selectedCustomer) return false;

        const credit = getCustomerCredit(selectedCustomer.uid);

        const outstanding = roundMoney(
            Number(credit?.outstandingCredit || 0)
        );

        const enteredAmount = repaymentInput.value.trim();

        if (enteredAmount === "") {
            repaymentValidation.textContent =
                "Please enter the amount received.";

            repaymentValidation.className = "repayment-input-error";
            repaymentConfirm.disabled = true;

            document.getElementById("repayment-remaining").textContent =
                formatCurrency(outstanding);

            return false;
        }

        const amount = Number(enteredAmount);

        if (!Number.isFinite(amount) || amount <= 0) {
            repaymentValidation.textContent =
                "Enter an amount greater than ₹0.";

            repaymentValidation.className = "repayment-input-error";
            repaymentConfirm.disabled = true;
            return false;
        }

        if (roundMoney(amount) > outstanding) {
            repaymentValidation.textContent =
                `Amount exceeds the outstanding credit of ${formatCurrency(outstanding)}.`;

            repaymentValidation.className = "repayment-input-error";
            repaymentConfirm.disabled = true;

            document.getElementById("repayment-remaining").textContent =
                "Invalid amount";

            return false;
        }

        const remaining = roundMoney(outstanding - amount);

        repaymentValidation.textContent = "Valid repayment amount.";
        repaymentValidation.className = "repayment-input-success";

        document.getElementById("repayment-remaining").textContent =
            formatCurrency(remaining);

        repaymentConfirm.disabled = false;

        return true;
    }

    repaymentInput.addEventListener("input", validateRepaymentAmount);

    /* =====================================
       SUBMIT REPAYMENT
    ===================================== */

    repaymentForm.addEventListener("submit", async event => {

        event.preventDefault();

        if (!selectedCustomer || !validateRepaymentAmount()) {
            return;
        }

        const repaymentAmount = roundMoney(
            Number(repaymentInput.value)
        );

        const confirmed = window.confirm(
            `Record repayment of ${formatCurrency(repaymentAmount)} ` +
            `for ${selectedCustomer.fullName}?`
        );

        if (!confirmed) return;

        repaymentConfirm.disabled = true;
        repaymentConfirm.textContent = "Processing...";

        try {

            await recordRepayment(
                selectedCustomer,
                repaymentAmount
            );

            closeRepaymentModal();

            showRepaymentMessage(
                `Repayment of ${formatCurrency(repaymentAmount)} recorded successfully.`
            );

        } catch (error) {

            console.error("Repayment error:", error);

            repaymentConfirm.disabled = false;
            repaymentConfirm.textContent = "Confirm Repayment";

            showRepaymentMessage(
                error.message || "Unable to record repayment.",
                true
            );
        }
    });

    /* =====================================
       PROCESS REPAYMENT
    ===================================== */

    async function recordRepayment(customer, repaymentAmount) {

        const customerId = customer.uid;
        const credit = getCustomerCredit(customerId);

        if (!credit) {
            throw new Error("Customer credit record was not found.");
        }

        const outstanding = roundMoney(
            Number(credit.outstandingCredit || 0)
        );

        if (
            repaymentAmount <= 0 ||
            repaymentAmount > outstanding
        ) {
            throw new Error("Invalid repayment amount.");
        }

        const unpaidOrders = getUnpaidCreditOrders(customerId);

        const unpaidTotal = roundMoney(
            unpaidOrders.reduce(
                (sum, order) =>
                    sum + getOrderRemainingAmount(order),
                0
            )
        );

        if (Math.abs(unpaidTotal - outstanding) > 0.01) {
            throw new Error(
                "The outstanding credit and unpaid order balances do not match."
            );
        }

        const remainingCredit = roundMoney(
            outstanding - repaymentAmount
        );

        let amountToAllocate = repaymentAmount;
        const orderUpdates = [];

        for (const order of unpaidOrders) {

            if (amountToAllocate <= 0) break;

            const orderRemaining = getOrderRemainingAmount(order);

            if (orderRemaining <= 0) continue;

            const allocatedAmount = roundMoney(
                Math.min(amountToAllocate, orderRemaining)
            );

            const newAmountPaid = roundMoney(
                Number(order.amountPaid || 0) + allocatedAmount
            );

            const fullyPaid =
                newAmountPaid >= Number(order.totalAmount || 0) - 0.01;

            orderUpdates.push({
                order,
                amountPaid: fullyPaid
                    ? Number(order.totalAmount)
                    : newAmountPaid,
                paymentStatus: fullyPaid ? "paid" : "unpaid"
            });

            amountToAllocate = roundMoney(
                amountToAllocate - allocatedAmount
            );
        }

        if (amountToAllocate > 0.01) {
            throw new Error(
                "Unable to allocate the complete repayment to unpaid orders."
            );
        }

        const now = new Date().toISOString();

        const writes = [];

        // Update customer outstanding credit.

        writes.push({
            update: {
                name: credit.documentName,
                fields: {
                    outstandingCredit: {
                        doubleValue: remainingCredit
                    },
                    updatedAt: {
                        timestampValue: now
                    }
                }
            },
            updateMask: {
                fieldPaths: [
                    "outstandingCredit",
                    "updatedAt"
                ]
            }
        });

        // Update affected credit orders.

        orderUpdates.forEach(update => {

            writes.push({
                update: {
                    name: update.order.documentName,
                    fields: {
                        amountPaid: {
                            doubleValue: update.amountPaid
                        },
                        paymentStatus: {
                            stringValue: update.paymentStatus
                        },
                        updatedAt: {
                            timestampValue: now
                        }
                    }
                },
                updateMask: {
                    fieldPaths: [
                        "amountPaid",
                        "paymentStatus",
                        "updatedAt"
                    ]
                }
            });
        });

        // Commit all repayment changes together.

        await firestoreRequest(":commit", {
            method: "POST",
            idToken: session.idToken,
            body: {
                writes: writes
            }
        });

        // Update local data after successful commit.

        credit.outstandingCredit = remainingCredit;

        orderUpdates.forEach(update => {
            update.order.amountPaid = update.amountPaid;
            update.order.paymentStatus = update.paymentStatus;
        });

        updateCustomerSummary();
        renderCustomers(getFilteredCustomers());
    }

    /* =====================================
       SEARCH CUSTOMERS
    ===================================== */

    function getFilteredCustomers() {

        const searchText = customersSearch.value
            .trim()
            .toLowerCase();

        if (!searchText) return customers;

        return customers.filter(customer =>

            (customer.fullName || "").toLowerCase().includes(searchText) ||
            (customer.email || "").toLowerCase().includes(searchText) ||
            (customer.phone || "").toLowerCase().includes(searchText)

        );
    }

    customersSearch.addEventListener("input", () => {
        renderCustomers(getFilteredCustomers());
    });

    /* =====================================
       REPAYMENT MESSAGE
    ===================================== */

    function showRepaymentMessage(message, isError = false) {

        repaymentMessage.textContent = message;

        repaymentMessage.className = isError
            ? "repayment-error"
            : "repayment-success";
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
