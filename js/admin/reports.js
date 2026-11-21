
/* =====================================
   KARTO INVENTORY REPORTS
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const container = document.querySelector("#inventory-report-container");

    async function loadInventoryReport() {

        try {
            container.textContent = "Loading inventory report...";

            const session = await getUserSession();

            if (!session) {
                window.location.href = "../auth/login.html";
                return;
            }

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

            const summary = document.createElement("div");
            summary.className = "inventory-report-summary";

            const summaryItems = [
                ["Total Products", totalProducts],
                ["Total Stock Units", totalStock],
                ["Low Stock", lowStock.length],
                ["Out of Stock", outOfStock.length],
                ["High Stock", highStock.length]
            ];

            summaryItems.forEach(([label, value]) => {

                const card = document.createElement("div");
                card.className = "inventory-report-card";

                const heading = document.createElement("p");
                heading.textContent = label;

                const number = document.createElement("h3");
                number.textContent = value.toLocaleString("en-IN");

                card.append(heading, number);
                summary.appendChild(card);
            });

            /* CATEGORY TABLE */

            const heading = document.createElement("h3");
            heading.className = "inventory-report-heading";
            heading.textContent = "Category-wise Inventory";

            const tableWrapper = document.createElement("div");
            tableWrapper.className = "inventory-report-table-wrapper";

            const table = document.createElement("table");
            table.className = "inventory-report-table";

            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Total Products</th>
                        <th>Total Stock Units</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const tbody = table.querySelector("tbody");

            Object.entries(categorySummary)
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([category, data]) => {

                    const row = document.createElement("tr");

                    const categoryCell = document.createElement("td");
                    categoryCell.textContent = category;

                    const productCell = document.createElement("td");
                    productCell.textContent = data.productCount;

                    const stockCell = document.createElement("td");
                    stockCell.textContent =
                        data.stockUnits.toLocaleString("en-IN");

                    row.append(
                        categoryCell,
                        productCell,
                        stockCell
                    );

                    tbody.appendChild(row);
                });

            if (products.length === 0) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 3;
                cell.textContent = "No products found.";

                row.appendChild(cell);
                tbody.appendChild(row);
            }

            tableWrapper.appendChild(table);


            /* PRODUCT STOCK DETAILS */

            function createProductSection(title, productList) {

                const section = document.createElement("div");
                section.className = "inventory-product-section";

                const sectionHeading = document.createElement("h3");
                sectionHeading.textContent =
                    `${title} (${productList.length})`;

                const wrapper = document.createElement("div");
                wrapper.className = "inventory-report-table-wrapper";

                const productTable = document.createElement("table");
                productTable.className = "inventory-report-table";

                productTable.innerHTML = `
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Stock Quantity</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;

                const productBody = productTable.querySelector("tbody");

                if (productList.length === 0) {
                    const row = document.createElement("tr");
                    const cell = document.createElement("td");

                    cell.colSpan = 3;
                    cell.textContent = "No products found.";

                    row.appendChild(cell);
                    productBody.appendChild(row);
                } else {
                    productList.forEach(product => {

                        const row = document.createElement("tr");

                        const nameCell = document.createElement("td");
                        nameCell.textContent = product.name;

                        const categoryCell = document.createElement("td");
                        categoryCell.textContent = product.category;

                        const stockCell = document.createElement("td");
                        stockCell.textContent = product.stockQuantity;

                        row.append(
                            nameCell,
                            categoryCell,
                            stockCell
                        );

                        productBody.appendChild(row);
                    });
                }

                wrapper.appendChild(productTable);
                section.append(sectionHeading, wrapper);

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

            container.replaceChildren(
                summary,
                heading,
                tableWrapper,
                allProductsSection,
                lowStockSection,
                outOfStockSection,
                highStockSection
            );


        } catch (error) {

            console.error("Inventory report error:", error);

            container.textContent =
                "Unable to load inventory report. Please try again.";
        }
    }

    await loadInventoryReport();

});
