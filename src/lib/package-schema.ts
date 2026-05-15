import { z } from "zod";

export const itineraryDaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string(),
  description: z.string(),
});

export const bookingLinksSchema = z.object({
  hotel: z.string().url().optional(),
  flight: z.string().url().optional(),
  activities: z.string().url().optional(),
});

export const packageSchema = z.object({
  type: z.enum(["basic", "medium", "premium"]).optional(),
  title: z.string(),
  destination: z.string(),
  price: z.number(),
  currency: z.string().optional(),
  rating: z.number().min(0).max(5),
  reviews: z.number().int().min(0),
  matchScore: z.number().min(0).max(100),
  duration: z.string(),
  hotel: z.string(),
  flight: z.string(),
  mealPlan: z.string().optional(),
  summary: z.string(),
  whyItFits: z.string().optional(),
  badges: z.array(z.string()).min(1),
  activities: z.array(z.string()).min(1),
  itinerary: z.array(itineraryDaySchema).min(1),
});

export type ParsedPackage = z.infer<typeof packageSchema>;
