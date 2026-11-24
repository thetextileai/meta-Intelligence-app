export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white text-[#202223] px-6 py-12 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#202223] text-white flex items-center justify-center font-black">
          TT
        </div>
        <div>
          <h1 className="text-2xl font-bold">Terms of Service</h1>
          <p className="text-xs text-[#6d7175]">Tameta Decision Intelligence &bull; Last updated: November 2026</p>
        </div>
      </div>

      <div className="space-y-6 text-sm text-[#4a4f54] leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-[#202223] mb-2">1. Agreement to Terms</h2>
          <p>
            By installing or using the Tameta Decision Intelligence Shopify Application, you agree to be bound by these
            Terms of Service. If you do not agree to these terms, do not install or use the app.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#202223] mb-2">2. Description of Service</h2>
          <p>
            Tameta provides marketing analytics, ad spend calculations with GST adjustments, and rule-based
            decision support algorithms for Meta Ads campaigns connected to your Shopify store.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#202223] mb-2">3. Subscription & Billing</h2>
          <p>
            The application is offered with a 7-day free trial, followed by recurring monthly subscription plans
            billed directly through Shopify App Subscriptions. You may cancel your subscription at any time by
            uninstalling the app from your Shopify store admin.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#202223] mb-2">4. Disclaimers & Limitation of Liability</h2>
          <p>
            Our Decision Intelligence recommendations (such as budget adjustments and stop-loss notifications)
            are advisory in nature. While based on verified media buying algorithms, you remain responsible for final
            ad budget decisions and advertising outcomes on Meta.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#202223] mb-2">5. Contact Information</h2>
          <p>
            For support or business inquiries, contact{" "}
            <a href="mailto:support@tameta.tech" className="text-blue-600 underline">
              support@tameta.tech
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
