export type TravelPackageType = "basic" | "medium" | "premium";

export type ItineraryDay = {
  day: number;
  title: string;
  description: string;
};

export type BookingLinks = {
  hotel?: string;
  flight?: string;
  activities?: string;
};

export type TravelPackage = {
  id: string;
  type: TravelPackageType;
  title: string;
  destination: string;
  price: number;
  requestedBudget?: number;
  currency: string;
  rating: number;
  reviews: number;
  matchScore: number;
  duration: string;
  hotel: string;
  flight: string;
  mealPlan?: string;
  summary: string;
  whyItFits?: string;
  badges: string[];
  activities: string[];
  itinerary: ItineraryDay[];
  bookingLinks?: BookingLinks;
};

export type PackagesPayload = {
  status: "packages_ready";
  tripRequestId?: string;
  packages: TravelPackage[];
};
