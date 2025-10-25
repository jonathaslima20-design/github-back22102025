import { useState } from 'react';
import { TrendingDown, Calculator } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrencyI18n, type SupportedCurrency, type SupportedLanguage } from '@/lib/i18n';
import { formatPriceTierRange, getBestValueTier, calculateApplicablePrice } from '@/lib/tieredPricingUtils';
import type { PriceTier } from '@/types';

interface TieredPricingTableProps {
  tiers: PriceTier[];
  basePrice: number;
  baseDiscountedPrice?: number;
  currency?: SupportedCurrency;
  language?: SupportedLanguage;
}

export default function TieredPricingTable({
  tiers,
  basePrice,
  baseDiscountedPrice,
  currency = 'BRL',
  language = 'pt-BR',
}: TieredPricingTableProps) {
  const [calculatorQuantity, setCalculatorQuantity] = useState<number>(1);

  if (!tiers || tiers.length === 0) return null;

  const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  const bestValueTier = getBestValueTier(sortedTiers);
  const baseUnitPrice = baseDiscountedPrice || basePrice;

  const calculatorResult = calculateApplicablePrice(
    calculatorQuantity,
    tiers,
    basePrice,
    baseDiscountedPrice
  );

  const calculateSavingsPercentage = (originalPrice: number, newPrice: number): number => {
    if (originalPrice <= 0) return 0;
    return Math.round(((originalPrice - newPrice) / originalPrice) * 100);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-600" />
            <CardTitle>Preços por Quantidade</CardTitle>
          </div>
          <CardDescription>
            Quanto mais você compra, menos paga por unidade!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-semibold text-sm">Quantidade</th>
                  <th className="text-right py-3 px-2 font-semibold text-sm">Preço Unit.</th>
                  <th className="text-right py-3 px-2 font-semibold text-sm hidden sm:table-cell">Total</th>
                  <th className="text-right py-3 px-2 font-semibold text-sm hidden md:table-cell">Economia</th>
                </tr>
              </thead>
              <tbody>
                {sortedTiers.map((tier) => {
                  const unitPrice = tier.discounted_unit_price || tier.unit_price;
                  const isBestValue = bestValueTier?.id === tier.id;
                  const totalAtQty = unitPrice * tier.min_quantity;
                  const baseTotal = baseUnitPrice * tier.min_quantity;
                  const savings = baseTotal - totalAtQty;
                  const savingsPercentage = calculateSavingsPercentage(baseUnitPrice, unitPrice);

                  return (
                    <tr
                      key={tier.id}
                      className={`border-b transition-colors hover:bg-muted/50 ${
                        isBestValue ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{formatPriceTierRange(tier)}</span>
                          {isBestValue && (
                            <Badge className="bg-blue-600 text-white text-xs">
                              Melhor Valor
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-2">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-sm">
                            {formatCurrencyI18n(unitPrice, currency, language)}
                          </span>
                          {savingsPercentage > 0 && (
                            <span className="text-xs text-green-600 font-medium">
                              -{savingsPercentage}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 hidden sm:table-cell">
                        <span className="text-sm font-medium">
                          {formatCurrencyI18n(totalAtQty, currency, language)}
                        </span>
                      </td>
                      <td className="text-right py-3 px-2 hidden md:table-cell">
                        {savings > 0 ? (
                          <span className="text-sm text-green-600 font-semibold">
                            {formatCurrencyI18n(savings, currency, language)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>Calculadora de Preço</CardTitle>
          </div>
          <CardDescription>
            Digite a quantidade desejada para ver o preço aplicável
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={calculatorQuantity}
                onChange={(e) => setCalculatorQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1"
              />
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Preço unitário:</span>
                <span className="font-semibold">
                  {formatCurrencyI18n(calculatorResult.unitPrice, currency, language)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Preço total:</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrencyI18n(calculatorResult.totalPrice, currency, language)}
                </span>
              </div>
              {calculatorResult.savings > 0 && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-green-600">Economia:</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrencyI18n(calculatorResult.savings, currency, language)}
                  </span>
                </div>
              )}
            </div>

            {calculatorResult.nextTier && calculatorResult.unitsToNextTier > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="font-semibold">Dica:</span> Compre{' '}
                  <span className="font-bold">{calculatorResult.nextTier.min_quantity}</span>{' '}
                  {calculatorResult.nextTier.min_quantity === 1 ? 'unidade' : 'unidades'} para economizar adicional{' '}
                  <span className="font-bold">
                    {formatCurrencyI18n(calculatorResult.nextTierSavings, currency, language)}
                  </span>
                  !
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
