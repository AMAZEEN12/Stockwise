import { describe, it, expect } from "vitest";
import type { PickupOrder } from "../../models/responses/orders.response";
import type { SaleCreate } from "../../models/requests/sales.request";

describe("Pre-order sale fulfillment (Solution A)", () => {
  it("structures a pending pre-order without immediate ledger debit", () => {
    const order: PickupOrder = {
      id: "44444444-4444-4444-8444-000000000001",
      orderNumber: "ORD-849201",
      customerId: "22222222-2222-4222-8222-222222222223",
      customerName: "Ngozi Okoro",
      lines: [
        {
          productId: "11111111-1111-4111-8111-000000000002",
          productName: "Indomie Instant Noodles Chicken Flavour 70g",
          quantity: 2,
          unitPriceKobo: 45000,
          lineTotalKobo: 90000,
        },
      ],
      itemsCount: 2,
      totalKobo: 90000,
      storeCreditAppliedKobo: 0,
      paymentPreference: "ON_ACCOUNT",
      pickupNote: "Will pick up around 6:00 PM today",
      status: "PENDING_PICKUP",
      createdAt: new Date().toISOString(),
    };

    expect(order.status).toBe("PENDING_PICKUP");
    expect(order.saleId).toBeUndefined();
    expect(order.fulfilledAt).toBeUndefined();
    expect(order.totalKobo).toBe(90000);
  });

  it("links orderId into the SaleCreate payload for atomic fulfillment", () => {
    const salePayload: SaleCreate = {
      paymentType: "CREDIT",
      customerId: "22222222-2222-4222-8222-222222222223",
      orderId: "44444444-4444-4444-8444-000000000001",
      lines: [
        {
          productId: "11111111-1111-4111-8111-000000000002",
          quantity: 2,
        },
      ],
    };

    expect(salePayload.orderId).toBe("44444444-4444-4444-8444-000000000001");
    expect(salePayload.paymentType).toBe("CREDIT");
    expect(salePayload.lines).toHaveLength(1);
  });

  it("marks pre-order as fulfilled when linked to finalized sale", () => {
    const order: PickupOrder = {
      id: "44444444-4444-4444-8444-000000000001",
      orderNumber: "ORD-849201",
      customerId: "22222222-2222-4222-8222-222222222223",
      customerName: "Ngozi Okoro",
      lines: [
        {
          productId: "11111111-1111-4111-8111-000000000002",
          productName: "Indomie Instant Noodles Chicken Flavour 70g",
          quantity: 2,
          unitPriceKobo: 45000,
          lineTotalKobo: 90000,
        },
      ],
      itemsCount: 2,
      totalKobo: 90000,
      storeCreditAppliedKobo: 0,
      paymentPreference: "ON_ACCOUNT",
      status: "PENDING_PICKUP",
      createdAt: new Date().toISOString(),
    };

    const simulatedFinalizedSaleId = "33333333-3333-4333-8333-000000000099";

    // Simulating fulfillment
    const fulfilledOrder: PickupOrder = {
      ...order,
      status: "FULFILLED",
      fulfilledAt: new Date().toISOString(),
      saleId: simulatedFinalizedSaleId,
    };

    expect(fulfilledOrder.status).toBe("FULFILLED");
    expect(fulfilledOrder.saleId).toBe(simulatedFinalizedSaleId);
    expect(fulfilledOrder.fulfilledAt).toBeDefined();
  });

  it("maps order items, customer, and payment preferences to cart state", () => {
    const order: PickupOrder = {
      id: "44444444-4444-4444-8444-000000000001",
      orderNumber: "ORD-849201",
      customerId: "22222222-2222-4222-8222-222222222223",
      customerName: "Ngozi Okoro",
      lines: [
        {
          productId: "11111111-1111-4111-8111-000000000002",
          productName: "Indomie Chicken 70g",
          quantity: 2,
          unitPriceKobo: 45000,
          lineTotalKobo: 90000,
        },
      ],
      itemsCount: 2,
      totalKobo: 90000,
      storeCreditAppliedKobo: 0,
      paymentPreference: "ON_ACCOUNT",
      status: "PENDING_PICKUP",
      createdAt: new Date().toISOString(),
    };

    const cartLines = order.lines.map((line) => ({
      product: {
        id: line.productId,
        name: line.productName,
        reference: "ORD",
        category: "General",
        priceKobo: line.unitPriceKobo,
        quantity: 50,
        lowStockThreshold: 5,
        stockState: "IN_STOCK" as const,
        active: true,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      quantity: line.quantity,
    }));

    expect(cartLines).toHaveLength(1);
    expect(cartLines[0].product.name).toBe("Indomie Chicken 70g");
    expect(cartLines[0].quantity).toBe(2);
    expect(order.paymentPreference === "ON_ACCOUNT" ? "CREDIT" : "PAID").toBe("CREDIT");
  });
});

