/**
 * RevenueCat Service Stub
 * Faturamento oficial migrado para StoreKit nativo via expo-iap
 */
import type { NativeStoreProduct, PurchaseResult } from "./native-billing-service";

export function isRevenueCatIOS(): boolean {
  return false;
}

export async function getRevenueCatSession(_expectedUserId?: string): Promise<{ userId: string; token: string }> {
  return { userId: "none", token: "none" };
}

export async function getRevenueCatProducts(): Promise<NativeStoreProduct[]> {
  return [];
}

export async function purchaseRevenueCatProduct(_sku: string): Promise<PurchaseResult> {
  return {
    status: "ERROR",
    platform: "apple",
    error: {
      code: "STORE_UNAVAILABLE",
      message: "Utilizando StoreKit nativo via expo-iap.",
      userMessage: "Utilizando StoreKit nativo via expo-iap.",
    },
  };
}

export async function restoreRevenueCatPurchases(): Promise<void> {}
export async function refreshRevenueCatCustomer(): Promise<void> {}
export async function resetRevenueCatIdentity(): Promise<void> {}
export async function syncRevenueCatSubscription(_userId: string): Promise<{ plan: string }> {
  return { plan: "FREE" };
}
