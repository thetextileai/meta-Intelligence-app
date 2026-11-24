"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Zap,
  ShoppingBag,
  ShieldCheck,
  Check,
  Settings,
  X,
  CreditCard,
  Activity,
  ChevronRight,
  LayoutGrid,
  Layers,
  Image as ImageIcon,
  Search,
  Eye,
  ArrowUpDown,
  Store,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

export default function ShopifyAppClient({
  brand,
  host,
  shop,
  range,
  billingSuccess,
  stats,
  campaigns,
  recentOrders,
}: {
  brand: any;
  host: string;
  shop: string;
  range: string;
  billingSuccess?: boolean;
  stats: any;
  campaigns: any[];
  recentOrders: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"overview" | "meta-ads" | "settings">("overview");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Meta Ads tab states
  const [campaignSearch, setCampaignSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Settings form
  const [storeName, setStoreName] = useState(brand.name || "");
  const [metaAccountId, setMetaAccountId] = useState(brand.metaAccountId || "");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [targetCpa, setTargetCpa] = useState(brand.targetCpa ?? 250);
  const [breakEvenCpa, setBreakEvenCpa] = useState(brand.breakEvenCpa ?? 450);
  const [targetRoas, setTargetRoas] = useState(brand.targetRoas ?? 3.0);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const isMetaConnected = brand.metaStatus === "connected" && brand.metaAccountId;

  const handleRangeChange = (newRange: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", newRange);
    router.push(`/embedded?${params.toString()}`);
  };

  const handleSubscribe = (planId: "starter" | "pro") => {
    window.top!.location.href = `/api/billing/subscribe?shop=${encodeURIComponent(shop)}&plan=${planId}${
      host ? `&host=${encodeURIComponent(host)}` : ""
    }`;
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(campaignSearch.toLowerCase());
      const isAct = (c.status || "").toLowerCase() === "active";
      if (statusFilter === "active") return matchesSearch && isAct;
      if (statusFilter === "paused") return matchesSearch && !isAct;
      return matchesSearch;
    });
  }, [campaigns, campaignSearch, statusFilter]);

  const activeCount = useMemo(
    () => campaigns.filter((c) => (c.status || "").toLowerCase() === "active").length,
    [campaigns]
  );
  const pausedCount = campaigns.length - activeCount;

  const datePresets = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "this_week", label: "This Week" },
    { id: "last_7_days", label: "Last 7 Days" },
    { id: "this_month", label: "This Month" },
    { id: "last_30_days", label: "Last 30 Days" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* 1. Header Bar */}
      <div className="bg-white rounded-2xl border border-[#e1e3e5] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#202223] text-white flex items-center justify-center font-black text-lg tracking-tight shadow-sm">
            TT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#202223]">{brand.name || "My Store"}</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </span>
            </div>
            <p className="text-xs text-[#6d7175] flex items-center gap-2 mt-0.5">
              <span>{shop}</span>
              <span>&bull;</span>
              <span className="capitalize">{brand.planName || "Trial"} Plan</span>
            </p>
          </div>
        </div>

        {/* Date presets & Sync */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-[#f6f6f7] p-1 border border-[#e1e3e5]">
            {datePresets.map((p) => {
              const active = range === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleRangeChange(p.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    active ? "bg-white text-[#202223] shadow-sm font-bold" : "text-[#6d7175] hover:text-[#202223]"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Billing Banner (Shopify App Subscriptions) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-[#202223]">
              {brand.planStatus === "active" ? (
                <span>Subscribed: {brand.planName?.toUpperCase()} Plan</span>
              ) : (
                <span>7-Day Free Trial Active</span>
              )}
            </div>
            <p className="text-[#6d7175]">
              Unlock automated Media Buyer Decision SOPs and GST ad spend parity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubscribe("starter")}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#faf9f9] text-[#202223] font-bold border border-[#c9cccf] transition-all shadow-sm"
          >
            Starter ($5.99/mo)
          </button>
          <button
            onClick={() => handleSubscribe("pro")}
            className="px-3.5 py-1.5 rounded-xl bg-[#202223] hover:bg-black text-white font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Pro Intelligence ($8.99/mo)</span>
          </button>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e1e3e5] pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "overview" ? "bg-[#202223] text-white shadow-sm" : "text-[#6d7175] hover:text-[#202223] hover:bg-white"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("meta-ads")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "meta-ads" ? "bg-[#202223] text-white shadow-sm" : "text-[#6d7175] hover:text-[#202223] hover:bg-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Meta Ads Intelligence</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "meta-ads" ? "bg-white/20 text-white" : "bg-[#ede8e8] text-[#202223]"}`}>
            {campaigns.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "settings" ? "bg-[#202223] text-white shadow-sm" : "text-[#6d7175] hover:text-[#202223] hover:bg-white"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configuration & Settings</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* 4 Column Core Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#e1e3e5] p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#6d7175] mb-2 font-medium">
                <span>TOTAL AD SPEND</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[11px] border border-amber-200">
                  w/ 18% GST
                </span>
              </div>
              <div className="text-2xl font-black text-[#202223]">₹{stats.spendWithGst.toLocaleString("en-IN")}</div>
              <p className="text-xs text-[#6d7175] mt-1.5">
                Base: ₹{stats.baseSpend.toLocaleString("en-IN")} + 18% GST
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#e1e3e5] p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#6d7175] mb-2 font-medium">
                <span>SHOPIFY NET SALES</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
                  Live
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-600">₹{stats.totalSales.toLocaleString("en-IN")}</div>
              <p className="text-xs text-[#6d7175] mt-1.5">{stats.totalOrders} total verified orders</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#e1e3e5] p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#6d7175] mb-2 font-medium">
                <span>OVERALL ROAS</span>
                <span className="text-[11px] text-[#8c9196]">Blended</span>
              </div>
              <div className="text-2xl font-black text-[#202223]">{stats.blendedRoas}x</div>
              <p className="text-xs text-[#6d7175] mt-1.5">Net Sales &divide; Ad Spend w/GST</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#e1e3e5] p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#6d7175] mb-2 font-medium">
                <span>TOTAL ORDERS</span>
                <span className="text-[11px] text-[#8c9196]">{stats.activeCampaignsCount} Active Ads</span>
              </div>
              <div className="text-2xl font-black text-[#202223]">{stats.totalOrders}</div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                  Paid: {stats.paidOrders}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                  Partial: {stats.partialPaidOrders}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
                  COD: {stats.codOrders}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl border border-[#e1e3e5] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#e1e3e5] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#202223]">Recent Shopify Orders</h3>
                <p className="text-xs text-[#6d7175]">Real-time webhook sync</p>
              </div>
              <span className="text-xs font-semibold text-[#6d7175]">{recentOrders.length} orders</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f6f6f7] text-[#6d7175] font-semibold border-b border-[#e1e3e5]">
                  <tr>
                    <th className="py-2.5 px-4">Order</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">City</th>
                    <th className="py-2.5 px-4">Payment</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                    <th className="py-2.5 px-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ede8e8]">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#faf9f9]">
                      <td className="py-2.5 px-4 font-bold text-[#202223]">{o.orderNumber}</td>
                      <td className="py-2.5 px-4 text-[#202223]">{o.customer}</td>
                      <td className="py-2.5 px-4 text-[#6d7175]">{o.city}</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold capitalize bg-emerald-50 text-emerald-700">
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#202223]">
                        ₹{o.total.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#8c9196]">{o.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: META ADS INTELLIGENCE */}
      {/* ========================================================================= */}
      {activeTab === "meta-ads" && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="bg-white rounded-2xl border border-[#e1e3e5] p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-[#f6f6f7] p-1 border border-[#e1e3e5] text-xs">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 font-semibold rounded-lg transition-all ${
                    statusFilter === "all" ? "bg-white text-[#202223] shadow-sm font-bold" : "text-[#6d7175]"
                  }`}
                >
                  All ({campaigns.length})
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`px-3 py-1.5 font-semibold rounded-lg transition-all ${
                    statusFilter === "active" ? "bg-white text-emerald-700 shadow-sm font-bold" : "text-[#6d7175]"
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  onClick={() => setStatusFilter("paused")}
                  className={`px-3 py-1.5 font-semibold rounded-lg transition-all ${
                    statusFilter === "paused" ? "bg-white text-[#202223] shadow-sm font-bold" : "text-[#6d7175]"
                  }`}
                >
                  Paused ({pausedCount})
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8c9196] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-[#c9cccf] text-xs focus:outline-none focus:ring-2 focus:ring-[#202223] w-48 sm:w-64"
                />
              </div>
            </div>

            <div className="inline-flex rounded-xl bg-[#f6f6f7] p-1 border border-[#e1e3e5] text-xs">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === "table" ? "bg-white text-[#202223] shadow-sm font-bold" : "text-[#6d7175]"
                }`}
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === "cards" ? "bg-white text-[#202223] shadow-sm font-bold" : "text-[#6d7175]"
                }`}
              >
                <ImageIcon className="w-3 h-3" />
                <span>Cards</span>
              </button>
            </div>
          </div>

          {/* Table View */}
          {viewMode === "table" && (
            <div className="bg-white rounded-2xl border border-[#e1e3e5] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f6f6f7] text-[#6d7175] font-semibold border-b border-[#e1e3e5]">
                    <tr>
                      <th className="py-3 px-4">Campaign</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Daily Budget</th>
                      <th className="py-3 px-4 text-right">Spend (+18% GST)</th>
                      <th className="py-3 px-4 text-right">Purchases</th>
                      <th className="py-3 px-4 text-right">CPA</th>
                      <th className="py-3 px-4 text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede8e8]">
                    {filteredCampaigns.map((c) => {
                      const isActive = (c.status || "").toLowerCase() === "active";
                      return (
                        <tr key={c.id} className="hover:bg-[#faf9f9]">
                          <td className="py-3 px-4 font-semibold text-[#202223] max-w-[260px] truncate">
                            {c.name}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-[#f1f2f4] text-[#6d7175] border-[#e1e3e5]"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isActive ? "bg-emerald-500 animate-pulse" : "bg-[#8c9196]"
                                }`}
                              ></span>
                              {c.status?.toUpperCase() || "PAUSED"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#202223]">
                            {c.dailyBudgetWithGst > 0 ? `₹${c.dailyBudgetWithGst.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#202223]">
                            ₹{c.spendWithGst.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 text-right">{c.purchases}</td>
                          <td className="py-3 px-4 text-right font-medium">
                            {c.cpa > 0 ? `₹${c.cpa.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">
                            {c.roas > 0 ? `${c.roas}x` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cards View */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCampaigns.map((c) => {
                const isActive = (c.status || "").toLowerCase() === "active";
                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl border border-[#e1e3e5] shadow-sm overflow-hidden flex flex-col"
                  >
                    <div className="relative h-40 bg-[#f1f2f4] overflow-hidden">
                      {c.thumbnailUrl ? (
                        <img src={c.thumbnailUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#8c9196]">
                          <ImageIcon className="w-8 h-8 text-[#c9cccf]" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md ${
                            isActive
                              ? "bg-emerald-500/90 text-white border-emerald-400"
                              : "bg-black/60 text-white border-white/20"
                          }`}
                        >
                          {c.status?.toUpperCase() || "PAUSED"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <h4 className="text-xs font-bold text-[#202223] truncate">{c.name}</h4>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#ede8e8] text-center text-xs">
                        <div className="p-2 rounded-xl bg-[#f6f6f7]">
                          <span className="text-[10px] text-[#8c9196] block">ROAS</span>
                          <span className="font-bold text-emerald-700">{c.roas}x</span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#f6f6f7]">
                          <span className="text-[10px] text-[#8c9196] block">CPA</span>
                          <span className="font-bold">₹{c.cpa}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#f6f6f7]">
                          <span className="text-[10px] text-[#8c9196] block">Spend</span>
                          <span className="font-bold">₹{c.spendWithGst}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONFIGURATION & SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-2xl border border-[#e1e3e5] p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e1e3e5] pb-3">
            <Store className="w-4 h-4" />
            <h3 className="text-sm font-bold text-[#202223]">Store & Meta Ads Configuration</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#202223] mb-1">Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c9cccf] text-xs focus:ring-2 focus:ring-[#202223] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#202223] mb-1">Shopify Store Domain</label>
              <input
                type="text"
                value={shop}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e1e3e5] bg-[#f6f6f7] text-[#6d7175] text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#202223] mb-1">Meta Ad Account ID</label>
              <input
                type="text"
                value={metaAccountId}
                placeholder="act_1234567890"
                onChange={(e) => setMetaAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c9cccf] text-xs font-mono focus:ring-2 focus:ring-[#202223] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#202223] mb-1">Target CPA (₹)</label>
              <input
                type="number"
                value={targetCpa}
                onChange={(e) => setTargetCpa(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c9cccf] text-xs focus:ring-2 focus:ring-[#202223] focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
