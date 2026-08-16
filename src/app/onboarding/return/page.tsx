import { redirect } from "next/navigation";
import { syncStripeStatus } from "../actions";

export default async function StripeReturnPage() {
  await syncStripeStatus();
  redirect("/dashboard");
}
