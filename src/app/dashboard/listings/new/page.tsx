import { ListingWizard } from "@/components/dashboard/listing-wizard";
import { requireSeller } from "@/lib/session";
import { appUrl } from "@/lib/utils";

export default async function NewListingPage() {
  const seller = await requireSeller();
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">New listing</h1>
      <ListingWizard plan={seller.plan} appUrl={appUrl()} />
    </div>
  );
}
