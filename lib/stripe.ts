import Stripe from "stripe";
import { getEnvVar } from "@/lib/env";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(getEnvVar("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}
