export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-[#202223] px-6 py-12 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#202223] text-white flex items-center justify-center font-black">
          TT
        </div>
        <div>
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
          <p className="text-xs text-[#6d7175]">Tameta Decision Intelligence &bull; Last updated: November 2026</p>
        </div>
      </div>

      <div className="space-y-6 text-sm text-[#4a4f54] leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-[#202223] mb-2">1. Introduction</h2>
          <p>
            Tameta Decision Intelligence (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides e-commerce analytics,
            ad spend tracking with 18% GST calculation, and campaign intelligence tools for Shopify merchants.
            This Privacy Policy explains how we collect, use, and protect your information when you install our application.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#202223] mb-2">2. Information We Collect</h2>
          <p>
            When you install the app, we request access to the following Shopify API scopes:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Store Information:</strong> Shop domain, store name, and currency to configure your dashboard.</li>
            <li><strong>Order Data:</strong> Order totals, timestamps, financial status (paid, partial, COD), and fulfillment status. We do NOT store credit card numbers or sensitive banking details.</li>
            <li><strong>Product Data:</strong> Product catalog titles and IDs to match ad creatives and campaign attribution.</li>
            <li><strong>Meta Ads Data:</strong> Ad spend, impressions, clicks, purchases, and campaign names via your connected Meta Ads Manager API.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#202223] mb-2">3. How We Use Your Information</h2>
          <p>
            We use the collected information exclusively to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Calculate blended Return on Ad Spend (ROAS) inclusive of 18% GST for Indian D2C brands.</li>
            <li>Provide real-time decision recommendations (Scale Up, Cut Budget, Stop-loss protection).</li>
            <li>Track daily budget burn and remaining headroom for your advertising campaigns.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#202223] mb-2">4. Data Retention & GDPR Compliance</h2>
          <p>
            We honor all mandatory Shopify GDPR compliance endpoints (Customer Data Request, Customer Redact, and Shop Redact).
            When you uninstall the application, all stored tokens are immediately invalidated and store data is permanently purged in accordance with Shopify partner requirements.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#202223] mb-2">5. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or your data, contact us at{" "}
            <a href="mailto:support@tameta.tech" className="text-blue-600 underline">
              support@tameta.tech
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
