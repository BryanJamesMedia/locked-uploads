import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { sellers } from "@/db/schema";
import { previewUrl } from "@/components/file-tile";
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
      pageBackgroundImagePathname: sellers.pageBackgroundImagePathname,
      pageTextTone: sellers.pageTextTone,
      publicProfileEnabled: sellers.publicProfileEnabled,
    })
    .from(sellers)
    .where(
      or(
        eq(sellers.publicId, sellerRef),
        sql`lower(${sellers.handle}) = lower(${sellerRef})`,
      ),
    )
    .limit(1);
  if (!seller) return props.children;

  const background = seller.pageBackground ?? DEFAULT_PAGE_BACKGROUND;
  const backgroundImage = seller.pageBackgroundImagePathname;
  // The seller's choice wins; otherwise light text goes over a dark colour.
  const textTone =
    seller.pageTextTone ?? (isDarkColor(background) ? "light" : "dark");

  return (
    <>
      <SellerBar
        name={seller.name}
        handle={seller.handle}
        profileImagePathname={seller.profileImagePathname}
        linkToProfile={seller.publicProfileEnabled}
      />
      <div
        className="flex-1 bg-cover bg-fixed bg-center"
        style={{
          backgroundColor: background,
          backgroundImage: backgroundImage
            ? `url(${previewUrl(backgroundImage)})`
            : undefined,
        }}
        data-surface={textTone === "light" ? "dark" : "light"}
      >
        {props.children}
      </div>
    </>
  );
}
