import { vi } from "vitest";
import path from "path";

export const initializePaymentMock = vi.fn();
export const verifyPaymentMock = vi.fn();

const creditPackages = [
  {
    id: "credits_50",
    name: "50 Credits",
    credits: 50,
    usdPrice: 6,
    zarPrice: 11400,
    description: "Small top-up for quick projects",
    type: "one-time",
  },
  {
    id: "credits_100",
    name: "100 Credits",
    credits: 100,
    usdPrice: 11,
    zarPrice: 20900,
    description: "Perfect for additional credits",
    type: "one-time",
  },
  {
    id: "credits_200",
    name: "200 Credits",
    credits: 200,
    usdPrice: 20,
    zarPrice: 38000,
    description: "Great value for extra credits",
    type: "one-time",
  },
  {
    id: "credits_400",
    name: "400 Credits",
    credits: 400,
    usdPrice: 36,
    zarPrice: 68400,
    description: "Maximum credits for heavy usage",
    type: "one-time",
  },
];

const subscriptionPlans = [
  {
    id: "free",
    name: "Free Plan",
    credits: 100,
    usdPrice: 0,
    zarPrice: 0,
    interval: "monthly",
    description: "Free monthly credits to get started",
    type: "free",
    features: [],
  },
  {
    id: "pro_monthly",
    name: "Pro Plan",
    credits: 300,
    usdPrice: 19.95,
    zarPrice: 38000,
    interval: "monthly",
    description: "Perfect for regular AI art creators",
    type: "subscription",
    features: [],
    paystackPlanCode: "PLN_TEST_PRO",
  },
  {
    id: "business_monthly",
    name: "Business Plan",
    credits: 800,
    usdPrice: 49,
    zarPrice: 93100,
    interval: "monthly",
    description: "For serious Etsy sellers and agencies",
    type: "subscription",
    features: [],
    paystackPlanCode: "PLN_TEST_BUSINESS",
  },
];

const modulePath = path.resolve(process.cwd(), "server/paystack.ts");

vi.doMock(modulePath, () => {
  return {
    creditPackages,
    subscriptionPlans,
    PaystackService: {
      getCreditPackage: (id: string) => creditPackages.find((pkg) => pkg.id === id),
      getCreditPackages: () => creditPackages,
      getAllCreditPackages: () => creditPackages,
      getAllSubscriptionPlans: () => subscriptionPlans,
      getAllPlans: () => ({ creditPackages, subscriptionPlans }),
      initializePayment: initializePaymentMock,
      verifyPayment: verifyPaymentMock,
    },
    paystack: {
      transaction: {
        initialize: initializePaymentMock,
      },
    },
  };
});

export const resetPaystackMocks = () => {
  initializePaymentMock.mockReset();
  verifyPaymentMock.mockReset();
};
