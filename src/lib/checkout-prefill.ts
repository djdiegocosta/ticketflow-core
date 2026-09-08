export type CheckoutPrefillCustomer = {
  full_name?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

export type CheckoutPrefill = {
  buyerName?: string;
  buyerWhatsApp?: string;
  buyerEmail?: string;
};

/**
 * Builds checkout defaults for an authenticated customer without making
 * account data a requirement for guest checkout.
 */
export function buildCheckoutPrefill(
  customer: CheckoutPrefillCustomer | null | undefined,
  authEmail?: string | null,
): CheckoutPrefill {
  const buyerEmail = customer?.email?.trim() || authEmail?.trim() || undefined;

  return {
    buyerName: customer?.full_name?.trim() || undefined,
    buyerWhatsApp: customer?.whatsapp?.trim() || undefined,
    buyerEmail,
  };
}
