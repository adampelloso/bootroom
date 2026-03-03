import { getEnvVar } from "@/lib/env";
import { SubscribeForm } from "./subscribe-form";

export default function SubscribePage() {
  const monthlyPrice = getEnvVar("NEXT_PUBLIC_STRIPE_PRICE_MONTHLY") ?? "";
  const yearlyPrice = getEnvVar("NEXT_PUBLIC_STRIPE_PRICE_YEARLY") ?? "";

  return <SubscribeForm monthlyPriceId={monthlyPrice} yearlyPriceId={yearlyPrice} />;
}
