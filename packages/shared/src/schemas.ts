// Schémas de validation (formulaires côté client). Les mêmes contraintes sont
// imposées par la base (CHECK constraints) : ne jamais se fier au client seul.
import { z } from "zod";
import { ALLERGEN_IDS, CUISINE_IDS, DIET_IDS, FULFILLMENTS, REPORT_REASONS, TEMPERATURE_IDS } from "./constants";
import { MAX_QTY_PER_LINE } from "./pricing";

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

export const emailSchema = z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(254);

export const passwordSchema = z
  .string()
  .min(10, "10 caractères minimum")
  .max(128)
  .regex(/[a-z]/, "Au moins une minuscule")
  .regex(/[A-Z]/, "Au moins une majuscule")
  .regex(/[0-9]/, "Au moins un chiffre");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ]{8,20}$/, "Numéro de téléphone invalide");

export const signUpSchema = z.object({
  displayName: trimmed(2, 60),
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les CGU" }) }),
  marketingConsent: z.boolean().default(false),
});

export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });

export const addressSchema = z.object({
  label: trimmed(1, 40).default("Maison"),
  line1: trimmed(3, 200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  postalCode: z.string().trim().regex(/^[0-9A-Za-z -]{3,10}$/, "Code postal invalide"),
  city: trimmed(1, 100),
  country: z.string().length(2).default("FR"),
  instructions: z.string().trim().max(300).optional().or(z.literal("")),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const cookApplicationSchema = z.object({
  kitchenName: trimmed(2, 60),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  cuisines: z.array(z.enum(CUISINE_IDS)).min(1, "Choisissez au moins une cuisine").max(5),
  offersPickup: z.boolean(),
  offersDelivery: z.boolean(),
  deliveryRadiusKm: z.number().min(0).max(30),
  deliveryFeeCents: z.number().int().min(0).max(2000),
  hygieneTrainingDeclared: z.literal(true, {
    errorMap: () => ({ message: "La déclaration d'hygiène est obligatoire" }),
  }),
  siret: z
    .string()
    .trim()
    // SIRET (France), BCE (Belgique), IDE (Suisse)… : format libre, vérifié par l'équipe.
    .regex(/^[0-9A-Za-z .-]{4,40}$/, "Numéro d'entreprise invalide")
    .optional()
    .or(z.literal("")),
  address: addressSchema,
}).refine((v) => v.offersPickup || v.offersDelivery, {
  message: "Proposez au moins le retrait ou la livraison",
  path: ["offersPickup"],
});

export const dishSchema = z.object({
  title: trimmed(3, 80),
  description: z.string().trim().max(1500).optional().or(z.literal("")),
  cuisine: z.enum(CUISINE_IDS),
  course: z.enum(["main", "starter", "dessert", "pastry", "snack", "drink"]).default("main"),
  priceCents: z.number().int().min(100, "Prix minimum 1 €").max(20000, "Prix maximum 200 €"),
  temperature: z.enum(TEMPERATURE_IDS),
  allergens: z.array(z.enum(ALLERGEN_IDS)).max(14),
  diets: z.array(z.enum(DIET_IDS)).max(6),
  spiceLevel: z.number().int().min(0).max(3),
  portionGrams: z.number().int().min(50).max(3000).optional(),
  ingredients: z.string().trim().max(1500).optional().or(z.literal("")),
  extras: z
    .array(z.object({ name: trimmed(1, 40), emoji: z.string().max(8).optional(), priceCents: z.number().int().min(0).max(5000) }))
    .max(10)
    .default([]),
});

export const dropSchema = z
  .object({
    dishId: z.string().uuid(),
    availableOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    readyFrom: z.string().regex(/^\d{2}:\d{2}$/),
    readyUntil: z.string().regex(/^\d{2}:\d{2}$/),
    quantity: z.number().int().min(1).max(200),
  })
  .refine((d) => d.readyFrom < d.readyUntil, { message: "L'heure de fin doit suivre l'heure de début", path: ["readyUntil"] });

export const cartLineSchema = z.object({
  dropId: z.string().uuid(),
  quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE),
  extraIds: z.array(z.string().uuid()).max(10).default([]),
});

export const checkoutSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(30),
  fulfillment: z.enum(FULFILLMENTS),
  addressId: z.string().uuid().optional(),
  note: z.string().trim().max(500).optional(),
  promoCode: z.string().trim().toUpperCase().max(30).optional(),
  tipCents: z.number().int().min(0).max(5000).default(0),
});

export const reviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const reportSchema = z.object({
  targetType: z.enum(["cook", "dish", "review", "order", "message"]),
  targetId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS.map((r) => r.id) as [string, ...string[]]),
  details: z.string().trim().max(2000).optional(),
});

export const messageSchema = z.object({ orderId: z.string().uuid(), body: trimmed(1, 2000) });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CookApplicationInput = z.infer<typeof cookApplicationSchema>;
export type DishInput = z.infer<typeof dishSchema>;
export type DropInput = z.infer<typeof dropSchema>;
export type CartLine = z.infer<typeof cartLineSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
