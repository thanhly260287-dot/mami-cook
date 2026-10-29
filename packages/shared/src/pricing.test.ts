import { describe, expect, it } from "vitest";
import { computeOrderPrice, customerPrice, volumeDiscountRate } from "./pricing";

describe("pricing", () => {
  it("applique la majoration de 20 %", () => {
    expect(customerPrice(1050)).toBe(1260);
    expect(customerPrice(999)).toBe(1199);
  });

  it("remises volume", () => {
    expect(volumeDiscountRate(4)).toBe(0);
    expect(volumeDiscountRate(5)).toBe(0.1);
    expect(volumeDiscountRate(10)).toBe(0.15);
  });

  it("commande simple sans remise", () => {
    const p = computeOrderPrice([{ unitCookPriceCents: 1000, extrasCookPriceCents: 150, quantity: 2 }], { deliveryFeeCents: 300 });
    expect(p.subtotalCents).toBe(2760);
    expect(p.discountCents).toBe(0);
    expect(p.totalCents).toBe(3060);
    expect(p.cookPayoutCents).toBe(2300 + 300);
    expect(p.platformFeeCents).toBe(460);
  });

  it("remise 10 % à partir de 5 plats, partagée au prorata", () => {
    const p = computeOrderPrice([{ unitCookPriceCents: 1000, extrasCookPriceCents: 0, quantity: 5 }]);
    expect(p.subtotalCents).toBe(6000);
    expect(p.discountCents).toBe(600);
    expect(p.totalCents).toBe(5400);
    expect(p.cookPayoutCents).toBe(4500);
    expect(p.platformFeeCents).toBe(900);
    expect(p.cookPayoutCents + p.platformFeeCents).toBe(p.totalCents);
  });

  it("le code promo est à la charge de la plateforme et plafonné", () => {
    const p = computeOrderPrice([{ unitCookPriceCents: 500, extrasCookPriceCents: 0, quantity: 1 }], { promoCents: 10000 });
    expect(p.totalCents).toBe(0);
    expect(p.cookPayoutCents).toBe(500);
    expect(p.platformFeeCents).toBe(-500);
  });

  it("refuse une quantité invalide", () => {
    expect(() => computeOrderPrice([{ unitCookPriceCents: 500, extrasCookPriceCents: 0, quantity: 0 }])).toThrow();
  });
});
