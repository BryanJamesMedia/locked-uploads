import { SettingsForm } from "@/components/dashboard/settings-form";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { Card, CardTitle } from "@/components/ui/card";
import { requireSeller } from "@/lib/session";

export default async function SettingsPage() {
  const seller = await requireSeller();
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Settings</h1>
      <SettingsForm
        settings={{
          publicProfileEnabled: seller.publicProfileEnabled,
          emailOnSale: seller.emailOnSale,
          emailOnPayout: seller.emailOnPayout,
        }}
      />
      <Card className="mt-6">
        <CardTitle>Account</CardTitle>
        <p className="mt-1 text-sm text-slate-500">{seller.email}</p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </Card>
    </div>
  );
}
