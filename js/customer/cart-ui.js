
/* =====================================
   KARTO CUSTOMER CART
===================================== */

document.addEventListener("DOMContentLoaded", async () => {

    const cartContainer = document.querySelector("#cart-container");

    const currencyFormatter = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    });

    function getProductDetails(documentData) {
        const fields = documentData.fields || {};

        return {
            productId: documentData.name.split("/").pop(),
            name: fields.name?.stringValue || "Unnamed Product",
            description: fields.description?.stringValue || "",
            category: fields.category?.stringValue || "",
            stockQuantity: Number(fields.stockQuantity?.integerValue || 0),
            price: Number(
                fields.price?.doubleValue ??
                fields.price?.integerValue ??
                0
            ),
            imageUrl: fields.imageUrl?.stringValue || ""
        };
    }

    function createElement(tag, className, text = "") {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text) {
            element.textContent = text;
        }

        return element;
    }

    async function loadCart() {

        cartContainer.textContent = "Loading your cart...";

        try {

            const cartItems = await getCartItems();
            const products = await getActiveProducts();

            const productMap = new Map(
                products.map(documentData => {
                    const product = getProductDetails(documentData);

                    return [product.productId, product];
                })
            );

            renderCart(cartItems, productMap);

        } catch (error) {

            console.error("Cart loading error:", error);

            cartContainer.textContent =
                "Unable to load your cart. Please try again.";

        }
    }

    function renderCart(cartItems, productMap) {

        cartContainer.replaceChildren();

        if (cartItems.length === 0) {

            const emptyMessage = createElement(
                "p",
                "cart-empty-message",
                "Your cart is currently empty."
            );

            const shopLink = createElement(
                "a",
                "profile-edit-link",
                "Continue Shopping"
            );

            shopLink.href = "../../index.html";

            cartContainer.append(emptyMessage, shopLink);

            return;
        }

        const itemsContainer = createElement(
            "div",
            "cart-items-list"
        );

        let subtotal = 0;

        cartItems.forEach(item => {

            const product = productMap.get(item.productId);

            const itemContainer = createElement(
                "div",
                "cart-item"
            );

            const detailsContainer = createElement(
                "div",
                "cart-item-details"
            );

            const name = createElement(
                "h3",
                "cart-item-name",
                product?.name || "Product Unavailable"
            );

            const price = product
                ? product.price
                : 0;

            const priceText = createElement(
                "p",
                "cart-item-price",
                product
                    ? currencyFormatter.format(price)
                    : "Currently unavailable"
            );

            const stockText = createElement(
                "p",
                "cart-item-stock",
                product
                    ? `${product.stockQuantity} units available`
                    : "Product currently unavailable"
            );

            const image = createElement(
                "img",
                "cart-item-image"
            );

            image.src = product?.imageUrl ||
                "https://placehold.co/120x120?text=KARTO";

            image.alt = product?.name || "Unavailable product";
            image.loading = "lazy";

            const quantityControl = createElement(
                "div",
                "quantity-control"
            );

            const decreaseButton = createElement(
                "button",
                "quantity-btn",
                "−"
            );

            decreaseButton.type = "button";
            decreaseButton.setAttribute(
                "aria-label",
                "Decrease quantity"
            );

            const quantityValue = createElement(
                "span",
                "quantity-value",
                String(item.quantity)
            );

            const increaseButton = createElement(
                "button",
                "quantity-btn",
                "+"
            );

            increaseButton.type = "button";
            increaseButton.setAttribute(
                "aria-label",
                "Increase quantity"
            );

            increaseButton.disabled = !product || item.quantity >= 99 ||
            item.quantity >= product.stockQuantity;
            if (product && item.quantity >= product.stockQuantity) {
                const stockLimitMessage = createElement(
                    "p",
                    "cart-stock-limit-message",
                    "Maximum available quantity reached"
                );

                quantityControl.after(stockLimitMessage);

            }

            const removeButton = createElement(
                "button",
                "cart-remove-button",
                "Remove"
            );

            removeButton.type = "button";

            const lineTotal = createElement(
                "p",
                "cart-item-total",
                currencyFormatter.format(price * item.quantity)
            );

            subtotal += price * item.quantity;

            quantityControl.append(
                decreaseButton,
                quantityValue,
                increaseButton
            );

            detailsContainer.append(
                name,
                priceText,
                stockText,
                quantityControl,
                removeButton
            );

            itemContainer.append(
                image,
                detailsContainer,
                lineTotal
            );

            itemsContainer.append(itemContainer);

            decreaseButton.addEventListener("click", async () => {

                decreaseButton.disabled = true;
                increaseButton.disabled = true;

                try {

                    if (item.quantity === 1) {
                        await removeFromCart(item.productId);
                    } else {
                        await updateCartItemQuantity(
                            item.productId,
                            item.quantity - 1
                        );
                    }

                    await loadCart();

                } catch (error) {

                    alert(error.message);
                    decreaseButton.disabled = false;
                    increaseButton.disabled = false;

                }

            });

            increaseButton.addEventListener("click", async () => {

                decreaseButton.disabled = true;
                increaseButton.disabled = true;

                try {

                    await updateCartItemQuantity(
                        item.productId,
                        item.quantity + 1
                    );

                    await loadCart();

                } catch (error) {

                    alert(error.message);
                    decreaseButton.disabled = false;
                    increaseButton.disabled = false;

                }

            });

            removeButton.addEventListener("click", async () => {

                removeButton.disabled = true;

                try {

                    await removeFromCart(item.productId);

                    await loadCart();

                } catch (error) {

                    alert(error.message);
                    removeButton.disabled = false;

                }

            });

        });

        const summary = createElement(
            "div",
            "cart-summary"
        );

        const subtotalLabel = createElement(
            "span",
            "cart-subtotal-label",
            "Subtotal"
        );

        const subtotalValue = createElement(
            "strong",
            "cart-subtotal-value",
            currencyFormatter.format(subtotal)
        );

        summary.append(subtotalLabel, subtotalValue);

        const checkoutLink = createElement(
            "a",
            "profile-edit-link cart-checkout-link",
            "Proceed to Checkout"
        );

        checkoutLink.href = "checkout.html";

        cartContainer.append(
            itemsContainer,
            summary,
            checkoutLink
        );

    }

    try {

        getCartSession();

        await loadCart();

    } catch (error) {

        alert("Please log in to view your cart.");

        window.location.href = "../auth/login.html";

    }

});
