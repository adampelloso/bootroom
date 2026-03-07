import { requireActiveSubscription } from "@/lib/auth-guard";
import { RadarClient } from "./radar-client";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  await requireActiveSubscription();
  return <RadarClient />;
}
