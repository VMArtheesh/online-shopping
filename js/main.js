
/* =====================================
   KARTO HOMEPAGE
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const productsContainer = document.querySelector(
        ".products-container"
    );

    try {

        productsContainer.textContent = "Loading products...";

        const products = await getActiveProducts();

        productsContainer.innerHTML = "";

        if (products.length === 0) {
            productsContainer.textContent =
                "No products available at the moment.";

            return;
        }

        products.forEach(product => {

            const fields = product.fields;

            const productCard = document.createElement("article");
            productCard.className = "product-card";

            // Product image
            const imageContainer = document.createElement("div");
            imageContainer.className = "product-image";

            const productImage = document.createElement("img");
            productImage.src = fields.imageUrl?.stringValue || "";
            productImage.alt = fields.name?.stringValue || "Product";
            productImage.loading = "lazy";

            imageContainer.appendChild(productImage);

            // Product category
            const productCategory = document.createElement("span");
            productCategory.className = "product-category";
            productCategory.textContent =
                fields.category?.stringValue || "General";

            // Product name
            const productName = document.createElement("h3");
            productName.textContent =
                fields.name?.stringValue || "Unnamed Product";

            // Product price
            const productPrice = document.createElement("p");
            const priceValue =
                fields.price?.doubleValue ??
                fields.price?.integerValue ??
                0;

            productPrice.className = "product-price";
            productPrice.textContent =
                `₹${Number(priceValue).toFixed(2)}`;

            // Assemble product card
            productCard.appendChild(imageContainer);
            productCard.appendChild(productCategory);
            productCard.appendChild(productName);
            productCard.appendChild(productPrice);

            productsContainer.appendChild(productCard);

        });

    } catch (error) {

        console.error("Product loading failed:", error);

        productsContainer.textContent =
            "Unable to load products. Please try again later.";

    }

});
