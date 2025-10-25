import { supabase } from './supabase';
import type { PriceTier } from '@/types';

export interface TieredPricingResult {
  unitPrice: number;
  totalPrice: number;
  appliedTier: PriceTier | null;
  savings: number;
  nextTier: PriceTier | null;
  nextTierSavings: number;
  unitsToNextTier: number;
}

export async function fetchProductPriceTiers(productId: string): Promise<PriceTier[]> {
  const { data, error } = await supabase
    .from('product_price_tiers')
    .select('*')
    .eq('product_id', productId)
    .order('quantity', { ascending: true });

  if (error) {
    console.error('Error fetching price tiers:', error);
    return [];
  }

  return data || [];
}

export function getMinimumPriceFromTiers(tiers: PriceTier[]): number | null {
  if (!tiers || tiers.length === 0) return null;

  const prices = tiers.map(tier => tier.discounted_unit_price || tier.unit_price);
  return Math.min(...prices);
}

export function calculateApplicablePrice(
  quantity: number,
  tiers: PriceTier[],
  basePrice: number,
  baseDiscountedPrice?: number
): TieredPricingResult {
  if (!tiers || tiers.length === 0) {
    const unitPrice = baseDiscountedPrice || basePrice;
    return {
      unitPrice,
      totalPrice: unitPrice * quantity,
      appliedTier: null,
      savings: 0,
      nextTier: null,
      nextTierSavings: 0,
      unitsToNextTier: 0,
    };
  }

  const sortedTiers = [...tiers].sort((a, b) => a.quantity - b.quantity);

  const applicableTier = sortedTiers
    .filter(tier => quantity >= tier.quantity)
    .pop();

  const unitPrice = applicableTier
    ? (applicableTier.discounted_unit_price || applicableTier.unit_price)
    : (baseDiscountedPrice || basePrice);

  const totalPrice = unitPrice * quantity;

  const baseUnitPrice = baseDiscountedPrice || basePrice;
  const baseTotalPrice = baseUnitPrice * quantity;
  const savings = baseTotalPrice - totalPrice;

  const nextTier = sortedTiers.find(tier => tier.quantity > quantity) || null;

  let nextTierSavings = 0;
  let unitsToNextTier = 0;

  if (nextTier) {
    const nextTierUnitPrice = nextTier.discounted_unit_price || nextTier.unit_price;
    const nextTierTotalPrice = nextTierUnitPrice * nextTier.quantity;
    const baseTotalAtNextTier = baseUnitPrice * nextTier.quantity;
    nextTierSavings = baseTotalAtNextTier - nextTierTotalPrice;
    unitsToNextTier = nextTier.quantity - quantity;
  }

  return {
    unitPrice,
    totalPrice,
    appliedTier: applicableTier || null,
    savings,
    nextTier,
    nextTierSavings,
    unitsToNextTier,
  };
}

export function formatPriceTierRange(tier: PriceTier): string {
  return `${tier.quantity} unidade${tier.quantity > 1 ? 's' : ''}`;
}

export function getBestValueTier(tiers: PriceTier[]): PriceTier | null {
  if (!tiers || tiers.length === 0) return null;

  return tiers.reduce((best, current) => {
    const bestPrice = best.discounted_unit_price || best.unit_price;
    const currentPrice = current.discounted_unit_price || current.unit_price;
    return currentPrice < bestPrice ? current : best;
  }, tiers[0]);
}

export async function updatePriceTier(
  tierId: string,
  updates: Partial<Pick<PriceTier, 'quantity' | 'unit_price' | 'discounted_unit_price'>>
): Promise<PriceTier | null> {
  const { data, error } = await supabase
    .from('product_price_tiers')
    .update(updates)
    .eq('id', tierId)
    .select()
    .single();

  if (error) {
    console.error('Error updating price tier:', error);
    throw new Error('Failed to update price tier');
  }

  return data;
}

export async function deletePriceTier(tierId: string): Promise<boolean> {
  const { error } = await supabase
    .from('product_price_tiers')
    .delete()
    .eq('id', tierId);

  if (error) {
    console.error('Error deleting price tier:', error);
    throw new Error('Failed to delete price tier');
  }

  return true;
}

export async function createPriceTier(
  productId: string,
  tier: Omit<PriceTier, 'id' | 'product_id' | 'created_at'>
): Promise<PriceTier | null> {
  const { data, error } = await supabase
    .from('product_price_tiers')
    .insert({
      product_id: productId,
      quantity: tier.quantity,
      unit_price: tier.unit_price,
      discounted_unit_price: tier.discounted_unit_price
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating price tier:', error);
    throw new Error('Failed to create price tier');
  }

  return data;
}
