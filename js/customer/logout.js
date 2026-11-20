
/* =====================================
   KARTO CUSTOMER LOGOUT
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    const logoutButton = document.getElementById("logout-button");

    logoutButton.addEventListener("click", () => {

        // Clear the customer session
        clearUserSession();

        // Redirect to login page
        window.location.href = "../auth/login.html";

    });

});
