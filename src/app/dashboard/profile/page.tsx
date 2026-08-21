import { ProfileForm } from "@/components/dashboard/profile-form";
import { requireSeller } from "@/lib/session";
import { appUrl } from "@/lib/utils";

export default async function ProfileSettingsPage() {
  const seller = await requireSeller();
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Profile</h1>
      <ProfileForm
        seller={{ name: seller.name, handle: seller.handle, bio: seller.bio }}
        baseUrl={appUrl()}
      />
    </div>
  );
}
