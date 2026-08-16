import { PlanPicker } from "@/components/dashboard/plan-picker";
import { requireSeller } from "@/lib/session";

export default async function SubscriptionPage() {
  const seller = await requireSeller();
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Subscription</h1>
      <p className="mb-4 text-sm text-slate-500">
        Your plan sets the platform fee taken from each sale and your upload limits.
      </p>
      <PlanPicker current={seller.plan} />
    </div>
  );
}
