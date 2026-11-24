import dbConnect from "./mongodb";
import Brand from "@/models/Brand";

export interface PlanConfig {
  id: "starter" | "pro";
  name: string;
  price: number;
  trialDays: number;
}

export const PLANS: Record<string, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Tameta Starter Plan",
    price: parseFloat(process.env.PLAN_STARTER_PRICE || "5.99"),
    trialDays: parseInt(process.env.PLAN_TRIAL_DAYS || "7", 10),
  },
  pro: {
    id: "pro",
    name: "Tameta Pro Intelligence",
    price: parseFloat(process.env.PLAN_PRO_PRICE || "8.99"),
    trialDays: parseInt(process.env.PLAN_TRIAL_DAYS || "7", 10),
  },
};

/**
 * Creates a recurring monthly subscription charge via Shopify GraphQL Admin API
 */
export async function createSubscription({
  shop,
  accessToken,
  planId,
  host,
}: {
  shop: string;
  accessToken: string;
  planId: "starter" | "pro";
  host?: string;
}) {
  const plan = PLANS[planId] || PLANS.starter;
  const appUrl = process.env.SHOPIFY_APP_URL || "https://brands.tameta.tech";
  const returnUrl = `${appUrl}/api/billing/callback?shop=${encodeURIComponent(shop)}${
    host ? `&host=${encodeURIComponent(host)}` : ""
  }&plan=${plan.id}`;

  const isTest = process.env.NODE_ENV !== "production" || shop.includes("myshopify.com");

  const query = `
    mutation AppSubscriptionCreate(
      $name: String!
      $lineItems: [AppSubscriptionLineItemInput!]!
      $returnUrl: URL!
      $test: Boolean
      $trialDays: Int
    ) {
      appSubscriptionCreate(
        name: $name
        lineItems: $lineItems
        returnUrl: $returnUrl
        test: $test
        trialDays: $trialDays
      ) {
        userErrors {
          field
          message
        }
        confirmationUrl
        appSubscription {
          id
          status
        }
      }
    }
  `;

  const variables = {
    name: plan.name,
    returnUrl,
    test: isTest,
    trialDays: plan.trialDays,
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: {
              amount: plan.price,
              currencyCode: "USD",
            },
            interval: "EVERY_30_DAYS",
          },
        },
      },
    ],
  };

  const res = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Shopify Billing API error: ${errText}`);
  }

  const json = await res.json();
  const data = json.data?.appSubscriptionCreate;

  if (data?.userErrors && data.userErrors.length > 0) {
    throw new Error(`Shopify subscription error: ${data.userErrors[0].message}`);
  }

  return {
    confirmationUrl: data?.confirmationUrl,
    subscriptionId: data?.appSubscription?.id,
  };
}

/**
 * Checks or activates active recurring charge for the store
 */
export async function getActiveSubscription({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}) {
  const query = `
    query GetActiveSubscriptions {
      appInstallation {
        activeSubscriptions {
          id
          name
          status
          currentPeriodEnd
          test
          lineItems {
            plan {
              pricingDetails {
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                  interval
                }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(`https://${shop}/admin/api/2024-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) return null;
  const json = await res.json();
  const subs = json.data?.appInstallation?.activeSubscriptions || [];
  return subs.find((s: any) => s.status === "ACTIVE") || null;
}
