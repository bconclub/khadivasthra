/**
 * Shown on the Terms & Conditions page while the Cancellation Policy box in
 * Admin → Settings is empty, and offered there as the starting text.
 * Same plain-text format as the admin boxes: short lines without a full stop
 * are headings, everything else is a bullet point.
 */
export const DEFAULT_CANCELLATION_POLICY = `Cancellation Policy
Orders can be cancelled any time before they are shipped.
To cancel, contact us on WhatsApp or email with your order number.
Once an order has been shipped it cannot be cancelled; please refer to our Return & Exchange Policy instead.
For cancelled prepaid orders, the full amount will be refunded to the original payment method within 5–7 business days.
Khadi Vasthra may cancel an order if a product is out of stock, the delivery address is not serviceable, or there is a pricing or payment error; any amount paid will be refunded in full.
Cash on Delivery orders that are refused at delivery are treated as cancelled.`;

/**
 * Governing law and dispute resolution, required by the payment gateway.
 * Jurisdiction matches the "Subject to Ernakulam jurisdiction" line on the
 * tax invoice.
 */
export const GOVERNING_LAW = `Governing Law and Dispute Resolution
These terms and conditions are governed by and construed in accordance with the laws of India and the State of Kerala.
Any dispute arising out of or in connection with these terms, or any purchase made on this website, shall be subject to the exclusive jurisdiction of the courts at Ernakulam, Kerala.
We encourage customers to contact us first so that we can try to resolve any concern amicably.`;
