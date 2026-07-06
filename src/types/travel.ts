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

export type PackageRating = {
  source: string;
  value: number | string;
  scale?: number; // e.g. 5 or 10
  url: string;   // mandatory: ohne Link wird das Rating nicht angezeigt
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
  durationDays?: number;
  hotel: string;
  hotelName?: string;
  flight: string;
  mealPlan?: string;
  summary: string;
  whyItFits?: string;
  badges: string[];
  activities: string[];
  itinerary: ItineraryDay[];
  bookingLinks?: BookingLinks;
  ratings?: PackageRating[];
  // Brief context for deep links (Skyscanner, Booking …)
  origin?: string;
  travelers?: number;
  travelMonth?: string;
  travelStartDate?: string;
};

export type PackagesPayload = {
  status: "packages_ready";
  tripRequestId?: string;
  packages: TravelPackage[];
};
