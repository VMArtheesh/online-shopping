
/* =====================================
   KARTO ADMIN REPORTS
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const inventoryContainer = document.querySelector(
        "#inventory-report-container"
    );

    const salesContainer = document.querySelector(
        "#sales-report-container"
    );

    /* =====================================
       SHARED HELPERS
    ===================================== */

    function getFieldValue(field) {

        if (!field) return "";

        return field.stringValue ??
               field.integerValue ??
               field.doubleValue ??
               field.booleanValue ??
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

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;

    }

    function createSummaryCards(container, items, className) {

        const summary = createElement("div", className);

        items.forEach(([label, value]) => {

            const card = createElement("div", className + "-card");

            const heading = createElement("p", "", label);

            const number = createElement("h3", "", value);

            card.append(heading, number);

            summary.appendChild(card);

        });

        return summary;

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

        if (rows.length === 0) {

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

    /* =====================================
       LOAD ADMIN ORDERS
    ===================================== */

    async function getAllOrders(idToken) {

        const response = await firestoreRequest(
            ":runQuery",
            {
                method: "POST",
                idToken: idToken,
                body: {
                    structuredQuery: {
                        from: [
                            {
                                collectionId: "orders"
                            }
                        ]
                    }
                }
            }
        );

        return response
            .filter(item => item.document)
            .map(item => item.document);

    }

    /* =====================================
       DECODE ORDER DOCUMENTS
    ===================================== */

    function decodeOrder(document) {

        const fields = document.fields || {};

        const itemValues =
            fields.items?.arrayValue?.values || [];

        const items = itemValues.map(item => {

            const itemFields = item.mapValue?.fields || {};

            return {

                productId: getFieldValue(itemFields.productId),

                productName: getFieldValue(itemFields.productName),

                category: getFieldValue(itemFields.category),

                quantity: Number(
                    getFieldValue(itemFields.quantity) || 0
                ),

                lineTotal: Number(
                    getFieldValue(itemFields.lineTotal) || 0
                )

            };

        });

        return {

            orderId: getFieldValue(fields.orderId),

            customerId: getFieldValue(fields.customerId),

            customerName: getFieldValue(fields.customerName),

            totalAmount: Number(
                getFieldValue(fields.totalAmount) || 0
            ),

            paymentMethod: getFieldValue(fields.paymentMethod),

            paymentStatus: getFieldValue(fields.paymentStatus),

            orderStatus: getFieldValue(fields.orderStatus),

            createdAt: getFieldValue(fields.createdAt),

            items: items

        };

    }

    /* =====================================
       SALES REPORT
    ===================================== */

    async function loadSalesReport(orders) {

        try {

            salesContainer.replaceChildren();

            const confirmedOrders = orders.filter(order =>
                order.orderStatus.toLowerCase() === "confirmed"
            );

            /* DATE FILTER */

            const filterSection = createElement(
                "div",
                "sales-report-filters"
            );

            const fromLabel = createElement(
                "label",
                "",
                "From Date"
            );

            const fromDate = createElement("input");

            fromDate.type = "date";
            fromDate.id = "sales-from-date";

            const toLabel = createElement(
                "label",
                "",
                "To Date"
            );

            const toDate = createElement("input");

            toDate.type = "date";
            toDate.id = "sales-to-date";

            const filterButton = createElement(
                "button",
                "sales-filter-button",
                "Apply Filter"
            );

            const resetButton = createElement(
                "button",
                "sales-reset-button",
                "Reset"
            );

            filterSection.append(
                fromLabel,
                fromDate,
                toLabel,
                toDate,
                filterButton,
                resetButton
            );

            const reportContent = createElement(
                "div",
                "sales-report-content"
            );

            salesContainer.append(filterSection, reportContent);

            /* =====================================
               RENDER SALES DATA
            ===================================== */

            function renderSalesReport() {

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

                const filteredOrders = confirmedOrders.filter(order => {

                    if (!order.createdAt) return false;

                    const orderDate = new Date(order.createdAt);

                    if (from && orderDate < from) return false;

                    if (to && orderDate > to) return false;

                    return true;

                });

                const totalOrders = filteredOrders.length;

                const totalRevenue = filteredOrders.reduce(
                    (total, order) => total + order.totalAmount,
                    0
                );

                const cashOrders = filteredOrders.filter(
                    order => order.paymentMethod === "cash"
                );

                const creditOrders = filteredOrders.filter(
                    order => order.paymentMethod === "credit"
                );

                const cashRevenue = cashOrders.reduce(
                    (total, order) => total + order.totalAmount,
                    0
                );

                const creditRevenue = creditOrders.reduce(
                    (total, order) => total + order.totalAmount,
                    0
                );

                const paidRevenue = filteredOrders
                    .filter(order => order.paymentStatus === "paid")
                    .reduce(
                        (total, order) => total + order.totalAmount,
                        0
                    );

                const pendingRevenue = filteredOrders
                    .filter(order =>
                        ["pending", "unpaid"].includes(order.paymentStatus)
                    )
                    .reduce(
                        (total, order) => total + order.totalAmount,
                        0
                    );

                /* SUMMARY CARDS */

                const summary = createSummaryCards(
                    reportContent,
                    [
                        ["Total Orders", totalOrders.toLocaleString("en-IN")],
                        ["Total Sales", formatPrice(totalRevenue)],
                        ["Cash Sales", formatPrice(cashRevenue)],
                        ["Credit Sales", formatPrice(creditRevenue)],
                        ["Paid Revenue", formatPrice(paidRevenue)],
                        ["Pending / Unpaid", formatPrice(pendingRevenue)]
                    ],
                    "sales-report-summary"
                );

                /* DAILY SALES */

                const dailySales = {};

                filteredOrders.forEach(order => {

                    const date = order.createdAt
                        ? order.createdAt.slice(0, 10)
                        : "Unknown";

                    if (!dailySales[date]) {
                        dailySales[date] = {
                            orders: 0,
                            revenue: 0
                        };
                    }

                    dailySales[date].orders++;

                    dailySales[date].revenue += order.totalAmount;

                });

                const dailyHeading = createElement(
                    "h3",
                    "inventory-report-heading",
                    "Daily Sales"
                );

                const dailyRows = Object.entries(dailySales)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([date, data]) => [
                        formatDate(date),
                        data.orders.toString(),
                        formatPrice(data.revenue)
                    ]);

                const dailyTable = createTable(
                    ["Date", "Orders", "Sales Revenue"],
                    dailyRows
                );

                /* PAYMENT METHOD BREAKDOWN */

                const paymentHeading = createElement(
                    "h3",
                    "inventory-report-heading",
                    "Payment Method Breakdown"
                );

                const paymentRows = [
                    [
                        "Cash",
                        cashOrders.length.toString(),
                        formatPrice(cashRevenue)
                    ],
                    [
                        "Credit",
                        creditOrders.length.toString(),
                        formatPrice(creditRevenue)
                    ]
                ];

                const paymentTable = createTable(
                    ["Payment Method", "Orders", "Revenue"],
                    paymentRows
                );

                /* PAYMENT STATUS BREAKDOWN */

                const statusHeading = createElement(
                    "h3",
                    "inventory-report-heading",
                    "Payment Status Breakdown"
                );

                const statuses = ["paid", "pending", "unpaid"];

                const statusRows = statuses.map(status => {

                    const statusOrders = filteredOrders.filter(
                        order => order.paymentStatus === status
                    );

                    const revenue = statusOrders.reduce(
                        (total, order) => total + order.totalAmount,
                        0
                    );

                    return [
                        status.charAt(0).toUpperCase() + status.slice(1),
                        statusOrders.length.toString(),
                        formatPrice(revenue)
                    ];

                });

                const statusTable = createTable(
                    ["Payment Status", "Orders", "Order Value"],
                    statusRows
                );

                /* PRODUCT PERFORMANCE */

                const productSales = {};

                filteredOrders.forEach(order => {

                    order.items.forEach(item => {

                        const productName =
                            item.productName || "Unknown Product";

                        if (!productSales[productName]) {

                            productSales[productName] = {
                                quantity: 0,
                                revenue: 0
                            };

                        }

                        productSales[productName].quantity +=
                            item.quantity;

                        productSales[productName].revenue +=
                            item.lineTotal;

                    });

                });

                const productEntries = Object.entries(productSales);

                const bestSelling = [...productEntries]
                    .sort((a, b) =>
                        b[1].quantity - a[1].quantity
                    )
                    .slice(0, 5);

                const lowestSelling = [...productEntries]
                    .sort((a, b) =>
                        a[1].quantity - b[1].quantity
                    )
                    .slice(0, 5);

                const productHeading = createElement(
                    "h3",
                    "inventory-report-heading",
                    "Best-Selling Products"
                );

                const bestRows = bestSelling.map(([name, data]) => [
                    name,
                    data.quantity.toLocaleString("en-IN"),
                    formatPrice(data.revenue)
                ]);

                const bestTable = createTable(
                    ["Product", "Units Sold", "Revenue"],
                    bestRows
                );

                const lowestHeading = createElement(
                    "h3",
                    "inventory-report-heading",
                    "Lowest-Selling Products"
                );

                const lowestRows = lowestSelling.map(([name, data]) => [
                    name,
                    data.quantity.toLocaleString("en-IN"),
                    formatPrice(data.revenue)
                ]);

                const lowestTable = createTable(
                    ["Product", "Units Sold", "Revenue"],
                    lowestRows
                );

                reportContent.replaceChildren(
                    summary,
                    dailyHeading,
                    dailyTable,
                    paymentHeading,
                    paymentTable,
                    statusHeading,
                    statusTable,
                    productHeading,
                    bestTable,
                    lowestHeading,
                    lowestTable
                );

            }

            filterButton.addEventListener(
                "click",
                renderSalesReport
            );

            resetButton.addEventListener("click", () => {

                fromDate.value = "";
                toDate.value = "";

                renderSalesReport();

            });

            renderSalesReport();

        } catch (error) {

            console.error("Sales report error:", error);

            salesContainer.textContent =
                "Unable to generate sales report.";

        }

    }

    /* =====================================
       INVENTORY REPORT
    ===================================== */

    async function loadInventoryReport(session) {

        try {

            inventoryContainer.textContent =
                "Loading inventory report...";

            const documents = await getAllProducts(session.idToken);

            const products = documents.map(document => {

                const fields = document.fields || {};

                return {

                    name: fields.name?.stringValue || "Unnamed Product",

                    category: fields.category?.stringValue || "Uncategorized",

                    stockQuantity: Number(
                        fields.stockQuantity?.integerValue || 0
                    )

                };

            });

            const totalProducts = products.length;

            const totalStock = products.reduce(
                (total, product) => total + product.stockQuantity,
                0
            );

            const lowStock = products.filter(
                product =>
                    product.stockQuantity > 0 &&
                    product.stockQuantity < 15
            );

            const outOfStock = products.filter(
                product => product.stockQuantity === 0
            );

            const highStock = products.filter(
                product => product.stockQuantity > 100
            );

            /* CATEGORY-WISE SUMMARY */

            const categorySummary = {};

            products.forEach(product => {

                const category = product.category;

                if (!categorySummary[category]) {

                    categorySummary[category] = {
                        productCount: 0,
                        stockUnits: 0
                    };

                }

                categorySummary[category].productCount++;

                categorySummary[category].stockUnits +=
                    product.stockQuantity;

            });

            /* SUMMARY CARDS */

            const summary = createElement(
                "div",
                "inventory-report-summary"
            );

            const summaryItems = [
                ["Total Products", totalProducts],
                ["Total Stock Units", totalStock],
                ["Low Stock", lowStock.length],
                ["Out of Stock", outOfStock.length],
                ["High Stock", highStock.length]
            ];

            summaryItems.forEach(([label, value]) => {

                const card = createElement(
                    "div",
                    "inventory-report-card"
                );

                const heading = createElement("p", "", label);

                const number = createElement(
                    "h3",
                    "",
                    value.toLocaleString("en-IN")
                );

                card.append(heading, number);

                summary.appendChild(card);

            });

            /* CATEGORY TABLE */

            const heading = createElement(
                "h3",
                "inventory-report-heading",
                "Category-wise Inventory"
            );

            const categoryRows = Object.entries(categorySummary)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, data]) => [
                    category,
                    data.productCount.toString(),
                    data.stockUnits.toLocaleString("en-IN")
                ]);

            const categoryTable = createTable(
                ["Category", "Total Products", "Total Stock Units"],
                categoryRows
            );

            /* PRODUCT STOCK DETAILS */

            function createProductSection(title, productList) {

                const section = createElement(
                    "div",
                    "inventory-product-section"
                );

                const sectionHeading = createElement(
                    "h3",
                    "",
                    `${title} (${productList.length})`
                );

                const rows = productList.map(product => [
                    product.name,
                    product.category,
                    product.stockQuantity.toString()
                ]);

                const table = createTable(
                    ["Product Name", "Category", "Stock Quantity"],
                    rows
                );

                section.append(sectionHeading, table);

                return section;

            }

            const allProductsSection =
                createProductSection("All Products", products);

            const lowStockSection =
                createProductSection("Low Stock Products", lowStock);

            const outOfStockSection =
                createProductSection("Out of Stock Products", outOfStock);

            const highStockSection =
                createProductSection("High Stock Products", highStock);

            inventoryContainer.replaceChildren(
                summary,
                heading,
                categoryTable,
                allProductsSection,
                lowStockSection,
                outOfStockSection,
                highStockSection
            );

        } catch (error) {

            console.error("Inventory report error:", error);

            inventoryContainer.textContent =
                "Unable to load inventory report. Please try again.";

        }

    }

    /* =====================================
       INITIALIZE REPORTS
    ===================================== */

    try {

        const session = await getUserSession();

        if (!session) {

            window.location.href = "../auth/login.html";

            return;

        }

        const orderDocuments = await getAllOrders(session.idToken);

        const orders = orderDocuments.map(decodeOrder);

        await Promise.all([

            loadSalesReport(orders),

            loadInventoryReport(session)

        ]);

    } catch (error) {

        console.error("Reports initialization error:", error);

        salesContainer.textContent =
            "Unable to load sales report.";

        inventoryContainer.textContent =
            "Unable to load inventory report.";

    }

});
