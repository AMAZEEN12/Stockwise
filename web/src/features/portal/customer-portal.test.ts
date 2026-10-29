import { describe, it, expect } from "vitest";
import { formatMoney, sumKobo } from "../../lib/money";
import type { CreatePortalOrderRequest } from "../../models/requests/portal.request";

describe("Customer Portal Financial Calculations", () => {
  it("computes net customer position accurately", () => {
    // Scenario 1: Customer has store credit and owes nothing
    const creditCustomer = { balanceKobo: 0, storeCreditKobo: 600000 };
    expect(creditCustomer.storeCreditKobo > creditCustomer.balanceKobo).toBe(true);
    const netCredit = creditCustomer.storeCreditKobo - creditCustomer.balanceKobo;
    expect(formatMoney(netCredit)).toBe("₦6,000.00");

    // Scenario 2: Customer owes money and has no store credit
    const debtCustomer = { balanceKobo: 450000, storeCreditKobo: 0 };
    expect(debtCustomer.balanceKobo > debtCustomer.storeCreditKobo).toBe(true);
    const netDue = debtCustomer.balanceKobo - debtCustomer.storeCreditKobo;
    expect(formatMoney(netDue)).toBe("₦4,500.00");

    // Scenario 3: Customer has ₦3,000 credit but owes ₦1,500
    const mixedCustomer = { balanceKobo: 150000, storeCreditKobo: 300000 };
    const netMixedCredit = mixedCustomer.storeCreditKobo - mixedCustomer.balanceKobo;
    expect(formatMoney(netMixedCredit)).toBe("₦1,500.00");
  });

  it("calculates cart subtotals and store credit deductions using integer kobo", () => {
    const items = [
      { priceKobo: 40000, quantity: 2 }, // Coca-Cola ₦400 x 2 = ₦800 (80,000 kobo)
      { priceKobo: 330000, quantity: 1 }, // Ariel Detergent ₦3,300 x 1 = ₦3,300 (330,000 kobo)
    ];

    const subtotal = sumKobo(items);
    expect(subtotal).toBe(410000);
    expect(formatMoney(subtotal)).toBe("₦4,100.00");

    // When customer has ₦6,000 store credit, all ₦4,100 is covered
    const customerCreditKobo = 600000;
    const appliedCredit = Math.min(customerCreditKobo, subtotal);
    const amountDue = subtotal - appliedCredit;

    expect(appliedCredit).toBe(410000);
    expect(amountDue).toBe(0);
    expect(formatMoney(amountDue)).toBe("₦0.00");
  });

  it("partially covers order when store credit is less than order total", () => {
    const items = [{ priceKobo: 500000, quantity: 1 }]; // ₦5,000
    const subtotal = sumKobo(items);

    const customerCreditKobo = 200000; // ₦2,000
    const appliedCredit = Math.min(customerCreditKobo, subtotal);
    const amountDue = subtotal - appliedCredit;

    expect(appliedCredit).toBe(200000);
    expect(amountDue).toBe(300000);
    expect(formatMoney(amountDue)).toBe("₦3,000.00");
  });
});

describe("Customer Portal Order Request Payload Validation", () => {
  it("structures valid pre-order payloads with preferences and notes", () => {
    const orderPayload: CreatePortalOrderRequest = {
      lines: [
        { productId: "prod-1", quantity: 3 },
        { productId: "prod-2", quantity: 1 },
      ],
      paymentPreference: "USE_STORE_CREDIT",
      pickupNote: "Will pick up around 5:30 PM today",
    };

    expect(orderPayload.lines.length).toBe(2);
    expect(orderPayload.paymentPreference).toBe("USE_STORE_CREDIT");
    expect(orderPayload.pickupNote).toContain("5:30 PM");
  });

  it("supports cash on pickup and on-account payment preferences", () => {
    const pickupOrder: CreatePortalOrderRequest = {
      lines: [{ productId: "prod-1", quantity: 1 }],
      paymentPreference: "PAY_ON_PICKUP",
    };
    expect(pickupOrder.paymentPreference).toBe("PAY_ON_PICKUP");

    const tabOrder: CreatePortalOrderRequest = {
      lines: [{ productId: "prod-1", quantity: 1 }],
      paymentPreference: "ON_ACCOUNT",
    };
    expect(tabOrder.paymentPreference).toBe("ON_ACCOUNT");
  });
});
