import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const shop = typeof searchParams.shop === "string" ? searchParams.shop : "";

  if (shop) {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, val]) => {
      if (typeof val === "string") params.set(key, val);
    });
    redirect(`/embedded?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#e1e3e5] p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-[#202223] text-white rounded-2xl flex items-center justify-center mx-auto font-black text-xl tracking-tight">
            TT
          </div>
          <h1 className="text-xl font-bold text-[#202223]">
            Tameta Decision Intelligence
          </h1>
          <p className="text-xs text-[#6d7175] leading-relaxed">
            Real-time Meta Ads ROAS with 18% GST parity, COD vs Paid order tracking, and automated Media Buyer scaling SOPs for Shopify stores.
          </p>
        </div>

        <form action="/api/auth/shopify" method="GET" className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#202223] mb-1.5">
              Enter your Shopify Store Domain
            </label>
            <input
              type="text"
              name="shop"
              required
              placeholder="your-store.myshopify.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c9cccf] text-xs focus:outline-none focus:ring-2 focus:ring-[#202223]"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-[#202223] hover:bg-black text-white font-semibold text-xs transition-all shadow-sm"
          >
            Install / Open App
          </button>
        </form>

        <div className="pt-4 border-t border-[#ede8e8] flex items-center justify-center gap-4 text-[11px] text-[#6d7175]">
          <a href="/privacy" className="hover:underline">Privacy Policy</a>
          <span>&bull;</span>
          <a href="/terms" className="hover:underline">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}
