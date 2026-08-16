import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSeller } from "@/lib/session";
import { isStripeConfigured } from "@/lib/stripe";
import { startStripeOnboarding } from "./actions";

export default async function OnboardingPage() {
  const seller = await requireSeller();
  if (seller.stripeConnected) redirect("/dashboard");

  async function connect() {
    "use server";
    await startStripeOnboarding();
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-slate-900">Connect your Stripe account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Payments go straight to you. Locked Uploads takes a platform fee per sale based on your
          plan. You can create listings before connecting, but buyers cannot check out until this is
          done.
        </p>
        <form action={connect} className="mt-6">
          <Button type="submit" className="w-full" disabled={!isStripeConfigured()}>
            Connect Stripe
          </Button>
        </form>
        {isStripeConfigured() ? null : (
          <p className="mt-2 text-xs text-amber-700">
            Stripe keys are not configured on this deployment yet.
          </p>
        )}
        <Link
          href="/dashboard"
          className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-900"
        >
          Skip for now
        </Link>
      </Card>
    </div>
  );
}
