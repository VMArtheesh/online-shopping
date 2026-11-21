
/* =====================================
   KARTO ADMIN CUSTOMER REPORTS
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const container = document.querySelector(
        "#customer-report-container"
    );

    try {

        const session = await getUserSession();

        if (!session) {
            window.location.href = "../auth/login.html";
            return;
        }

        container.textContent = "Loading customer reports...";

        /* =====================================
           FIRESTORE DATA
        ===================================== */

        async function runQuery(collectionId) {

            const response = await firestoreRequest(
                ":runQuery",
                {
                    method: "POST",
                    idToken: session.idToken,
                    body: {
                        structuredQuery: {
                            from: [{ collectionId }]
                        }
                    }
                }
            );

            return response
                .filter(item => item.document)
                .map(item => item.document);

        }

        function getValue(field) {

            if (!field) return "";

            return field.stringValue ??
                   field.integerValue ??
                   field.doubleValue ??
                   field.timestampValue ??
                   "";

        }

        function formatPrice(value) {

            return new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR"
            }).format(value);

        }

        function formatDate(value) {

            if (!value) return "Unknown";

            return new Date(value).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });

        }

        function createElement(tag, className, text) {

            const element = document.createElement(tag);

            if (className) element.className = className;

            if (text !== undefined) {
                element.textContent = text;
            }

            return element;

        }

        function createTable(headers, rows) {

            const wrapper = createElement(
                "div",
                "inventory-report-table-wrapper"
            );

            const table = createElement(
                "table",
                "inventory-report-table"
            );

            const thead = document.createElement("thead");
            const headerRow = document.createElement("tr");

            headers.forEach(header => {
                headerRow.appendChild(
                    createElement("th", "", header)
                );
            });

            thead.appendChild(headerRow);

            const tbody = document.createElement("tbody");

            if (!rows.length) {

                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = headers.length;
                cell.textContent = "No records found.";

                row.appendChild(cell);
                tbody.appendChild(row);

            } else {

                rows.forEach(rowData => {

                    const row = document.createElement("tr");

                    rowData.forEach(value => {
                        row.appendChild(
                            createElement("td", "", value)
                        );
                    });

                    tbody.appendChild(row);

                });

            }

            table.append(thead, tbody);
            wrapper.appendChild(table);

            return wrapper;

        }

        function createSummary(items) {

            const summary = createElement(
                "div",
                "customer-report-summary"
            );

            items.forEach(([label, value]) => {

                const card = createElement(
                    "div",
                    "customer-report-summary-card"
                );

                card.append(
                    createElement("p", "", label),
                    createElement("h3", "", value)
                );

                summary.appendChild(card);

            });

            return summary;

        }

        /* =====================================
           LOAD CUSTOMERS AND ORDERS
        ===================================== */

        const [userDocuments, orderDocuments] = await Promise.all([
            runQuery("users"),
            runQuery("orders")
        ]);

        const customers = userDocuments
            .map(document => {

                const fields = document.fields || {};

                return {
                    uid: getValue(fields.uid),
                    name: getValue(fields.fullName) || "Unnamed Customer",
                    email: getValue(fields.email),
                    phone: getValue(fields.phone),
                    role: getValue(fields.role)
                };

            })
            .filter(customer => customer.role === "customer");

        const orders = orderDocuments.map(document => {

            const fields = document.fields || {};

            return {
                customerId: getValue(fields.customerId),
                customerName: getValue(fields.customerName),
                totalAmount: Number(
                    getValue(fields.totalAmount) || 0
                ),
                paymentMethod: getValue(fields.paymentMethod),
                orderStatus: getValue(fields.orderStatus),
                createdAt: getValue(fields.createdAt)
            };

        });

        /* =====================================
           DATE FILTER
        ===================================== */

        const filterSection = createElement(
            "div",
            "customer-report-filters"
        );

        const fromLabel = createElement("label", "", "From Date");
        const fromDate = createElement("input");

        fromDate.type = "date";

        const toLabel = createElement("label", "", "To Date");
        const toDate = createElement("input");

        toDate.type = "date";

        const applyButton = createElement(
            "button",
            "customer-filter-button",
            "Apply Filter"
        );

        const resetButton = createElement(
            "button",
            "customer-reset-button",
            "Reset"
        );

        filterSection.append(
            fromLabel,
            fromDate,
            toLabel,
            toDate,
            applyButton,
            resetButton
        );

        const reportContent = createElement(
            "div",
            "customer-report-content"
        );

        container.replaceChildren(filterSection, reportContent);

        /* =====================================
           RENDER CUSTOMER REPORT
        ===================================== */

        function renderReport() {

            const from = fromDate.value
                ? new Date(fromDate.value + "T00:00:00")
                : null;

            const to = toDate.value
                ? new Date(toDate.value + "T23:59:59.999")
                : null;

            if (from && to && from > to) {

                reportContent.textContent =
                    "From date cannot be later than To date.";

                return;

            }

            const filteredOrders = orders.filter(order => {

                if (
                    order.orderStatus.toLowerCase() !== "confirmed"
                ) return false;

                if (!order.createdAt) return false;

                const date = new Date(order.createdAt);

                if (from && date < from) return false;
                if (to && date > to) return false;

                return true;

            });

            const customerStats = {};

            customers.forEach(customer => {

                customerStats[customer.uid] = {
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    orderCount: 0,
                    totalPurchases: 0,
                    cashPurchases: 0,
                    creditPurchases: 0
                };

            });

            filteredOrders.forEach(order => {

                const customer = customerStats[order.customerId];

                if (!customer) return;

                customer.orderCount++;
                customer.totalPurchases += order.totalAmount;

                if (order.paymentMethod === "cash") {
                    customer.cashPurchases += order.totalAmount;
                }

                if (order.paymentMethod === "credit") {
                    customer.creditPurchases += order.totalAmount;
                }

            });

            const activeCustomers = Object.values(customerStats)
                .filter(customer => customer.orderCount > 0);

            const totalPurchases = filteredOrders.reduce(
                (total, order) => total + order.totalAmount,
                0
            );

            const totalOrders = filteredOrders.length;

            const summary = createSummary([
                ["Total Customers", customers.length.toString()],
                ["Customers with Orders", activeCustomers.length.toString()],
                ["Total Orders", totalOrders.toString()],
                ["Total Purchases", formatPrice(totalPurchases)]
            ]);

            /* TOP CUSTOMERS */

            const sortedCustomers = [...activeCustomers].sort(
                (a, b) => b.totalPurchases - a.totalPurchases
            );

            const topCustomers = sortedCustomers.slice(0, 5);

            const topHeading = createElement(
                "h3",
                "inventory-report-heading",
                "Top 5 Customers"
            );

            const topRows = topCustomers.map((customer, index) => [
                (index + 1).toString(),
                customer.name,
                customer.orderCount.toString(),
                formatPrice(customer.totalPurchases)
            ]);

            const topTable = createTable(
                ["Rank", "Customer", "Orders", "Purchase Value"],
                topRows
            );

            /* ALL CUSTOMER PURCHASES */

            const allHeading = createElement(
                "h3",
                "inventory-report-heading",
                "Customer Purchase Details"
            );

            const allRows = sortedCustomers.map(customer => [
                customer.name,
                customer.email || "-",
                customer.orderCount.toString(),
                formatPrice(customer.totalPurchases),
                formatPrice(customer.cashPurchases),
                formatPrice(customer.creditPurchases)
            ]);

            const allTable = createTable(
                [
                    "Customer",
                    "Email",
                    "Orders",
                    "Total Purchases",
                    "Cash Purchases",
                    "Credit Purchases"
                ],
                allRows
            );

            /* CUSTOMERS WITHOUT ORDERS */

            const inactiveCustomers = Object.values(customerStats)
                .filter(customer => customer.orderCount === 0);

            const inactiveHeading = createElement(
                "h3",
                "inventory-report-heading",
                "Customers Without Orders"
            );

            const inactiveRows = inactiveCustomers.map(customer => [
                customer.name,
                customer.email || "-",
                customer.phone || "-"
            ]);

            const inactiveTable = createTable(
                ["Customer", "Email", "Phone"],
                inactiveRows
            );

            reportContent.replaceChildren(
                summary,
                topHeading,
                topTable,
                allHeading,
                allTable,
                inactiveHeading,
                inactiveTable
            );

        }

        applyButton.addEventListener("click", renderReport);

        resetButton.addEventListener("click", () => {

            fromDate.value = "";
            toDate.value = "";

            renderReport();

        });

        renderReport();

    } catch (error) {

        console.error("Customer report error:", error);

        container.textContent =
            "Unable to load customer reports. Please try again.";

    }

});
