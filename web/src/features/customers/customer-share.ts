/**
 * Customer portal link generation and WhatsApp sharing helpers.
 */

export function buildCustomerPortalUrl(origin: string, customerId: string): string {
  return `${origin}/c/${customerId}`;
}

export function buildCustomerWhatsAppShareUrl(
  origin: string,
  customer: { id: string; displayName: string; contactPlaceholder?: string }
): string {
  const url = buildCustomerPortalUrl(origin, customer.id);
  const message = `Hello ${customer.displayName}, here is your Stockwise customer portal link to view your statement and place orders: ${url}`;
  const rawPhone = customer.contactPlaceholder?.replace(/[^0-9]/g, '') || '';
  return rawPhone
    ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

