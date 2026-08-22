import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { sellers } from "@/db/schema";
import { SellerBar } from "@/components/seller-bar";
import { DEFAULT_PAGE_BACKGROUND, isDarkColor } from "@/lib/colors";

/**
 * Wraps both the profile page and its listings: the grey identity bar stays
 * fixed while the seller chooses the colour of everything below it.
 */
export default async function SellerLayout(props: LayoutProps<"/[seller]">) {
  const { seller: sellerRef } = await props.params;

  const [seller] = await db
    .select({
      name: sellers.name,
      handle: sellers.handle,
      profileImagePathname: sellers.profileImagePathname,
      pageBackground: sellers.pageBackground,
      publicProfileEnabled: sellers.publicProfileEnabled,
    })
    .from(sellers)
    .where(
      or(eq(sellers.publicId, sellerRef), sql`lower(${sellers.handle}) = lower(${sellerRef})`),
    )
    .limit(1);
  if (!seller) return props.children;

  const background = seller.pageBackground ?? DEFAULT_PAGE_BACKGROUND;

  return (
    <>
      <SellerBar
        name={seller.name}
        handle={seller.handle}
        profileImagePathname={seller.profileImagePathname}
        linkToProfile={seller.publicProfileEnabled}
      />
      <div
        className="flex-1"
        style={{ backgroundColor: background }}
        data-surface={isDarkColor(background) ? "dark" : "light"}
      >
        {props.children}
      </div>
    </>
  );
}
