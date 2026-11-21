
/* =====================================
   KARTO EMAIL SERVICE
===================================== */

const EMAILJS_CONFIG = {
    serviceId: "service_npn274o",
    orderTemplateId: "template_x1s3bpc",
    paymentTemplateId: "template_ndzit6m",
    publicKey: "kMe-uXUuBfpqFatWO"
};

async function sendKartoEmail(templateId, templateParams) {

    const response = await fetch(
        "https://api.emailjs.com/api/v1.0/email/send",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                service_id: EMAILJS_CONFIG.serviceId,
                template_id: templateId,
                user_id: EMAILJS_CONFIG.publicKey,
                template_params: templateParams
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Email could not be sent.");
    }

    return true;
}

async function sendKartoOrderEmail(templateParams) {
    return sendKartoEmail(
        EMAILJS_CONFIG.orderTemplateId,
        templateParams
    );
}

async function sendKartoPaymentEmail(templateParams) {
    return sendKartoEmail(
        EMAILJS_CONFIG.paymentTemplateId,
        templateParams
    );
}
