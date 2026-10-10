/**
 * Formats integer minor units for display. The server sends the currency's
 * exponent and sign, so the client keeps no currency table of its own.
 * "usdt" is not an ISO 4217 code, so Intl cannot format it as a currency.
 */
export function formatMoney(
  amount: number,
  currency: { code: string; exponent: number; sign: string },
): string {
  const major = amount / 10 ** currency.exponent;
  const digits = { minimumFractionDigits: currency.exponent, maximumFractionDigits: currency.exponent };

  if (/^[a-z]{3}$/.test(currency.code)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency.code.toUpperCase(),
        ...digits,
      }).format(major);
    } catch {
      // Unknown to this browser: fall through to the sign from the server.
    }
  }

  return `${currency.sign}${new Intl.NumberFormat(undefined, digits).format(major)}`;
}
