"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Zap,
  Settings,
  X,
  CreditCard,
  Activity,
  LayoutGrid,
  Layers,
  Image as ImageIcon,
  Search,
  Eye,
  ArrowUpDown,
  Store,
  Sparkles,
  SlidersHorizontal,
  Check,
} from "lucide-react";

export default function ShopifyAppClient({
  brand,
  host,
  shop,
  range,
  billingSuccess,
  stats,
  campaigns,
  decisions = [],
  recentOrders,
}: {
  brand: any;
  host: string;
  shop: string;
  range: string;
  billingSuccess?: boolean;
  stats: any;
  campaigns: any[];
  decisions?: any[];
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
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [targetCpa, setTargetCpa] = useState(brand.targetCpa ?? 250);
  const [breakEvenCpa, setBreakEvenCpa] = useState(brand.breakEvenCpa ?? 450);
  const [targetRoas, setTargetRoas] = useState(brand.targetRoas ?? 3.0);
  const [averageOrderValue, setAverageOrderValue] = useState(brand.averageOrderValue ?? 999);
  const [cogsPercentage, setCogsPercentage] = useState(brand.cogsPercentage ?? 30);
  const [rtoRate, setRtoRate] = useState(brand.rtoRate ?? 20);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isMetaConnected = brand.metaStatus === "connected" && brand.metaAccountId;

  const handleRangeChange = (newRange: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", newRange);
    router.push(`/embedded?${params.toString()}`);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncMessage("Syncing live Shopify orders & Meta ad spend...");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: brand._id, shop, type: "all" }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage("Orders and Meta Ads synchronized!");
        setTimeout(() => {
          setSyncMessage(null);
          router.refresh();
        }, 1200);
      } else {
        setSyncMessage("Sync completed with warnings.");
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } catch {
      setSyncMessage("Sync failed. Please try again.");
      setTimeout(() => setSyncMessage(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsMessage(null);
    try {
      const payload: any = {
        brandId: brand._id,
        shop,
        name: storeName,
        targetCpa: Number(targetCpa),
        breakEvenCpa: Number(breakEvenCpa),
        targetRoas: Number(targetRoas),
        averageOrderValue: Number(averageOrderValue),
        cogsPercentage: Number(cogsPercentage),
        rtoRate: Number(rtoRate),
      };
      if (metaAccountId.trim()) payload.metaAccountId = metaAccountId.trim();
      if (metaAccessToken.trim()) payload.metaAccessToken = metaAccessToken.trim();

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSettingsMessage({ type: "error", text: data.error || "Failed to save configuration." });
      } else {
        setSettingsMessage({ type: "success", text: "Configuration saved & verified successfully!" });
        setMetaAccessToken("");
        setShowTokenInput(false);
        setTimeout(() => {
          setSettingsMessage(null);
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setSettingsMessage({ type: "error", text: err.message || "Network error." });
    } finally {
      setIsSavingSettings(false);
    }
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
              {brand.lastSyncAt && (
                <>
                  <span>&bull;</span>
                  <span>
                    Synced{" "}
                    {new Date(brand.lastSyncAt).toLocaleTimeString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Date presets & Sync Live */}
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

          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#202223] hover:bg-black text-white transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Live"}</span>
          </button>
        </div>
      </div>

      {/* Sync Banner */}
      {syncMessage && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium flex items-center gap-2">
          <Activity className="w-4 h-4 animate-spin text-blue-600" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Billing Success Banner */}
      {billingSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Subscription activated successfully! All features are unlocked.</span>
        </div>
      )}

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
            Starter (\$5.99/mo)
          </button>
          <button
            onClick={() => handleSubscribe("pro")}
            className="px-3.5 py-1.5 rounded-xl bg-[#202223] hover:bg-black text-white font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Pro Intelligence (\$8.99/mo)</span>
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
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === "meta-ads" ? "bg-white/20 text-white" : "bg-[#ede8e8] text-[#202223]"
            }`}
          >
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
          {/* Meta Connection Prompt if not connected */}
          {!isMetaConnected && (
            <div className="bg-gradient-to-r from-[#fff5f5] via-white to-[#fff8f6] rounded-2xl border border-red-200 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Meta Ads Not Connected
                </div>
                <h2 className="text-sm font-bold text-[#202223]">
                  Connect your Meta Ad Account to unlock ROAS & Decision Intelligence
                </h2>
                <p className="text-xs text-[#6d7175]">
                  Add your Meta Ad Account ID and System User Token in Settings to start tracking live ad spend.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("settings")}
                className="px-4 py-2 rounded-xl bg-[#e02b20] hover:bg-[#c92015] text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Connect Meta Ads</span>
              </button>
            </div>
          )}

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

          {/* Decision Intelligence SOP Cards */}
          {decisions && decisions.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e1e3e5] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#e1e3e5] pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <h3 className="text-sm font-bold text-[#202223]">
                    Media Buyer Campaign Decision Intelligence
                  </h3>
                </div>
                <span className="text-xs text-[#8c9196]">{decisions.length} Evaluated Campaigns</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {decisions.slice(0, 6).map((dec: any) => {
                  const isScale = dec.decision === "SCALE";
                  const isCut = dec.decision === "REDUCE";
                  const isStop = dec.decision === "PAUSE";

                  const badgeColor = isScale
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isCut
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : isStop
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-blue-50 text-blue-700 border-blue-200";

                  return (
                    <div
                      key={dec.campaignId || dec.externalId}
                      className="rounded-xl border border-[#e1e3e5] p-3.5 bg-[#fbfbfb] space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-[#202223] truncate">
                          {dec.campaignName || "Campaign"}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase shrink-0 ${badgeColor}`}
                        >
                          {dec.actionText || dec.decision?.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-[#4a4f54] leading-relaxed line-clamp-2">
                        {dec.primaryReason || "Performance evaluated against target CPA threshold."}
                      </p>
                      <div className="pt-2 border-t border-[#ede8e8] flex items-center justify-between text-[11px]">
                        <span className="text-[#8c9196]">
                          3D CPA: ₹{Math.round(dec.metrics?.w3Cpa || dec.metrics?.activeCpa || 0).toLocaleString("en-IN")}
                        </span>
                        <span className="font-semibold text-emerald-700">
                          Action: ₹{Math.round(dec.recommendedDailyBudget || dec.currentDailyBudget || 0).toLocaleString("en-IN")}/d
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                            o.paymentStatus === "paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : o.paymentStatus === "partially_paid"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {o.paymentStatus.replace("_", " ")}
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
          {/* Top Daily Budget & Campaign Stats Banner */}
          <div className="bg-white rounded-2xl border border-[#e1e3e5] p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-[#8c9196] font-medium">TOTAL CAMPAIGNS</div>
              <div className="text-2xl font-black text-[#202223] mt-1">{campaigns.length}</div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-emerald-700 font-semibold">{activeCount} Active</span>
                <span className="text-[#8c9196]">&bull;</span>
                <span className="text-[#6d7175]">{pausedCount} Paused</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-[#8c9196] font-medium">DAILY BUDGET CAP (w/GST)</div>
              <div className="text-2xl font-black text-[#202223] mt-1">
                ₹{(stats.totalDailyBudgetWithGst || 0).toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-[#6d7175] mt-1">
                Base: ₹{(stats.totalDailyBudget || 0).toLocaleString("en-IN")}/day
              </div>
            </div>

            <div>
              <div className="text-xs text-[#8c9196] font-medium">TOTAL AD SPEND (w/18% GST)</div>
              <div className="text-2xl font-black text-[#202223] mt-1">
                ₹{stats.spendWithGst.toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-[#6d7175] mt-1">
                Base: ₹{stats.baseSpend.toLocaleString("en-IN")}
              </div>
            </div>

            <div>
              <div className="text-xs text-[#8c9196] font-medium">META ACCOUNT STATUS</div>
              <div className="text-sm font-bold text-[#202223] mt-1 truncate">
                {brand.metaAccountId || "Not Configured"}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`w-2 h-2 rounded-full ${isMetaConnected ? "bg-emerald-500" : "bg-red-500"}`}
                ></span>
                <span className="text-xs text-[#6d7175] capitalize">
                  {brand.metaStatus || "Not Connected"}
                </span>
              </div>
            </div>
          </div>

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
                      <th className="py-3 px-4 w-12 text-center">Creative</th>
                      <th className="py-3 px-4">Campaign</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Daily Budget</th>
                      <th className="py-3 px-4 text-right">Spend (+18% GST)</th>
                      <th className="py-3 px-4 text-right">Purchases</th>
                      <th className="py-3 px-4 text-right">CPA</th>
                      <th className="py-3 px-4 text-right">ROAS</th>
                      <th className="py-3 px-4 text-right">Clicks</th>
                      <th className="py-3 px-4 text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede8e8]">
                    {filteredCampaigns.map((c) => {
                      const isActive = (c.status || "").toLowerCase() === "active";
                      return (
                        <tr key={c.id} className="hover:bg-[#faf9f9]">
                          <td className="py-3 px-4 text-center">
                            {c.thumbnailUrl ? (
                              <button
                                onClick={() => setPreviewImageUrl(c.thumbnailUrl)}
                                className="w-9 h-9 rounded-lg overflow-hidden border border-[#e1e3e5] mx-auto block relative group"
                              >
                                <img src={c.thumbnailUrl} alt={c.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-[#f1f2f4] border border-[#e1e3e5] flex items-center justify-center text-[#8c9196] mx-auto">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </td>
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
                          <td className="py-3 px-4 text-right text-[#6d7175]">
                            {c.clicks ? c.clicks.toLocaleString("en-IN") : "—"}
                          </td>
                          <td className="py-3 px-4 text-right text-[#6d7175]">
                            {c.ctr ? `${c.ctr}%` : "—"}
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
                    <div className="relative h-40 bg-[#f1f2f4] overflow-hidden group">
                      {c.thumbnailUrl ? (
                        <>
                          <img src={c.thumbnailUrl} alt={c.name} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setPreviewImageUrl(c.thumbnailUrl)}
                            className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Preview</span>
                          </button>
                        </>
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
        <form onSubmit={handleSaveSettings} className="space-y-5">
          {settingsMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                settingsMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {settingsMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{settingsMessage.text}</span>
            </div>
          )}

          {/* Store Profile */}
          <div className="bg-white rounded-2xl border border-[#e1e3e5] p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#e1e3e5] pb-3">
              <Store className="w-4 h-4" />
              <h3 className="text-sm font-bold text-[#202223]">Store Profile</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#202223] mb-1">Store Display Name</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
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
            </div>
          </div>

          {/* Meta Ads Credentials */}
          <div className="bg-white rounded-2xl border border-[#e1e3e5] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#e1e3e5] pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#e02b20]" />
                <h3 className="text-sm font-bold text-[#202223]">Meta Ads Integration</h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  isMetaConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {isMetaConnected ? "Connected" : "Not Connected"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#202223]">System User Access Token</label>
                  {isMetaConnected && !showTokenInput && (
                    <button
                      type="button"
                      onClick={() => setShowTokenInput(true)}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      Update Token
                    </button>
                  )}
                </div>
                {isMetaConnected && !showTokenInput ? (
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-[#e1e3e5] bg-[#f6f6f7] text-[#6d7175] text-xs font-mono flex items-center justify-between">
                    <span>••••••••••••••••••••••••</span>
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  </div>
                ) : (
                  <input
                    type="password"
                    placeholder="EAAYzw..."
                    value={metaAccessToken}
                    onChange={(e) => setMetaAccessToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#c9cccf] text-xs font-mono focus:ring-2 focus:ring-[#202223] focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Indian D2C Fashion Economics */}
          <div className="bg-white rounded-2xl border border-[#e1e3e5] p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#e1e3e5] pb-3">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-[#202223]">D2C Fashion Economics & Decision SOP</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#202223] mb-1">Target CPA (₹)</label>
                <input
                  type="number"
                  value={targetCpa}
                  onChange={(e) => setTargetCpa(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c9cccf] text-xs focus:ring-2 focus:ring-[#202223] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#202223] mb-1">Break-Even CPA (₹)</label>
                <input
                  type="number"
                  value={breakEvenCpa}
                  onChange={(e) => setBreakEvenCpa(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c9cccf] text-xs focus:ring-2 focus:ring-[#202223] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#202223] mb-1">Target ROAS (x)</label>
                <input
                  type="number"
                  step="0.1"
                  value={targetRoas}
                  onChange={(e) => setTargetRoas(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c9cccf] text-xs focus:ring-2 focus:ring-[#202223] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#202223] mb-1">Average Order Value (₹)</label>
                <input
                  type="number"
                  value={averageOrderValue}
                  onChange={(e) => setAverageOrderValue(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c9cccf] text-xs focus:ring-2 focus:ring-[#202223] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#202223] mb-1">Estimated COGS %</label>
                <input
                  type="number"
                  value={cogsPercentage}
                  onChange={(e) => setCogsPercentage(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c9cccf] text-xs focus:ring-2 focus:ring-[#202223] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#202223] mb-1">Estimated RTO Rate %</label>
                <input
                  type="number"
                  value={rtoRate}
                  onChange={(e) => setRtoRate(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c9cccf] text-xs focus:ring-2 focus:ring-[#202223] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#6d7175] hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-5 py-2.5 rounded-xl bg-[#202223] hover:bg-black text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSavingSettings && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSavingSettings ? "Saving..." : "Save Configuration"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Creative Image Preview Modal */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#e1e3e5]"
          >
            <div className="p-3 border-b border-[#e1e3e5] flex items-center justify-between">
              <span className="text-xs font-bold text-[#202223]">Meta Ad Creative</span>
              <button onClick={() => setPreviewImageUrl(null)} className="p-1 rounded-lg hover:bg-[#f6f6f7] text-[#6d7175]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-[#f1f2f4] flex items-center justify-center">
              <img src={previewImageUrl} alt="Ad Creative" className="max-h-[70vh] rounded-xl object-contain shadow-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
