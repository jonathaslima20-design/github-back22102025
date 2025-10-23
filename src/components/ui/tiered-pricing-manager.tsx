import React, { useState, useCallback, useMemo } from 'react';
import { NumericFormat } from 'react-number-format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Pencil, Trash2, AlertTriangle, Info, TrendingDown, Package } from 'lucide-react';
import { getCurrencySymbol, type SupportedLanguage, type SupportedCurrency, getLocaleConfig } from '@/lib/i18n';

export interface PriceTier {
  id?: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  discounted_unit_price?: number | null;
}

interface ValidationError {
  type: 'overlap' | 'gap' | 'invalid_min' | 'invalid_max' | 'invalid_price' | 'invalid_discount';
  message: string;
  tierIndex?: number;
}

interface TieredPricingManagerProps {
  tiers: PriceTier[];
  onChange: (tiers: PriceTier[]) => void;
  currency?: SupportedCurrency;
  locale?: SupportedLanguage;
}

export function TieredPricingManager({
  tiers,
  onChange,
  currency = 'BRL',
  locale = 'pt-BR'
}: TieredPricingManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [newTier, setNewTier] = useState<Partial<PriceTier>>({
    min_quantity: 1,
    max_quantity: null,
    unit_price: 0,
    discounted_unit_price: null
  });

  const localeConfig = getLocaleConfig(locale);
  const currencySymbol = getCurrencySymbol(currency, locale);

  const numberFormatConfig = useMemo(() => ({
    thousandSeparator: localeConfig.thousandsSeparator,
    decimalSeparator: localeConfig.decimalSeparator,
    prefix: currencySymbol + ' ',
    decimalScale: 2,
    fixedDecimalScale: true,
    allowNegative: false,
    allowLeadingZeros: false,
  }), [localeConfig, currencySymbol]);

  const validateTiers = useCallback((tiersToValidate: PriceTier[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (tiersToValidate.length === 0) {
      return errors;
    }

    const sortedTiers = [...tiersToValidate].sort((a, b) => a.min_quantity - b.min_quantity);

    if (sortedTiers[0].min_quantity !== 1) {
      errors.push({
        type: 'invalid_min',
        message: 'A primeira faixa deve começar na quantidade 1',
        tierIndex: 0
      });
    }

    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];

      if (tier.min_quantity <= 0) {
        errors.push({
          type: 'invalid_min',
          message: `Faixa ${i + 1}: Quantidade mínima deve ser maior que 0`,
          tierIndex: i
        });
      }

      if (tier.max_quantity !== null && tier.max_quantity <= tier.min_quantity) {
        errors.push({
          type: 'invalid_max',
          message: `Faixa ${i + 1}: Quantidade máxima deve ser maior que a mínima`,
          tierIndex: i
        });
      }

      if (tier.unit_price <= 0) {
        errors.push({
          type: 'invalid_price',
          message: `Faixa ${i + 1}: Preço unitário deve ser maior que 0`,
          tierIndex: i
        });
      }

      if (tier.discounted_unit_price !== null && tier.discounted_unit_price !== undefined) {
        if (tier.discounted_unit_price <= 0) {
          errors.push({
            type: 'invalid_discount',
            message: `Faixa ${i + 1}: Preço promocional deve ser maior que 0`,
            tierIndex: i
          });
        }
        if (tier.discounted_unit_price >= tier.unit_price) {
          errors.push({
            type: 'invalid_discount',
            message: `Faixa ${i + 1}: Preço promocional deve ser menor que o preço normal`,
            tierIndex: i
          });
        }
      }

      for (let j = i + 1; j < sortedTiers.length; j++) {
        const otherTier = sortedTiers[j];
        const tierMax = tier.max_quantity ?? Infinity;
        const otherMax = otherTier.max_quantity ?? Infinity;

        if (tier.min_quantity <= otherMax && tierMax >= otherTier.min_quantity) {
          errors.push({
            type: 'overlap',
            message: `Faixas ${i + 1} e ${j + 1}: Sobreposição detectada nas quantidades`,
            tierIndex: i
          });
        }
      }

      if (i < sortedTiers.length - 1 && tier.max_quantity !== null) {
        const nextTier = sortedTiers[i + 1];
        if (nextTier.min_quantity !== tier.max_quantity + 1) {
          errors.push({
            type: 'gap',
            message: `Gap detectado entre faixa ${i + 1} (termina em ${tier.max_quantity}) e faixa ${i + 2} (começa em ${nextTier.min_quantity})`,
            tierIndex: i
          });
        }
      }
    }

    const nullMaxCount = sortedTiers.filter(t => t.max_quantity === null).length;
    if (nullMaxCount > 1) {
      errors.push({
        type: 'invalid_max',
        message: 'Apenas a última faixa pode ter quantidade ilimitada'
      });
    }

    return errors;
  }, []);

  const errors = useMemo(() => validateTiers(tiers), [tiers, validateTiers]);

  const minPrice = useMemo(() => {
    if (tiers.length === 0) return null;
    return Math.min(...tiers.map(t => t.discounted_unit_price ?? t.unit_price));
  }, [tiers]);

  const handleAddTier = useCallback(() => {
    if (!newTier.min_quantity || !newTier.unit_price) {
      return;
    }

    let minQuantity = newTier.min_quantity;
    if (tiers.length === 0 && minQuantity !== 1) {
      minQuantity = 1;
    }

    const tierToAdd: PriceTier = {
      min_quantity: minQuantity,
      max_quantity: newTier.max_quantity ?? null,
      unit_price: newTier.unit_price,
      discounted_unit_price: newTier.discounted_unit_price ?? null
    };

    onChange([...tiers, tierToAdd]);

    setNewTier({
      min_quantity: (newTier.max_quantity ?? minQuantity) + 1,
      max_quantity: null,
      unit_price: 0,
      discounted_unit_price: null
    });
  }, [newTier, tiers, onChange]);

  const handleDeleteTier = useCallback((index: number) => {
    const updatedTiers = tiers.filter((_, i) => i !== index);
    onChange(updatedTiers);
    setDeleteConfirmIndex(null);
  }, [tiers, onChange]);

  const calculateSavings = (unitPrice: number, discountedPrice?: number | null) => {
    if (!discountedPrice) return null;
    const savings = unitPrice - discountedPrice;
    const percentage = Math.round((savings / unitPrice) * 100);
    return { savings, percentage };
  };

  const formatQuantityRange = (min: number, max: number | null) => {
    if (max === null) {
      return `${min}+`;
    }
    if (min === max) {
      return `${min}`;
    }
    return `${min} - ${max}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-2 text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100">
            Como funciona o preço escalonado?
          </p>
          <p className="text-blue-800 dark:text-blue-200">
            Defina diferentes preços por unidade baseados na quantidade comprada. Exemplo: de 1-10 unidades por R$ 100, de 11-50 por R$ 90, acima de 50 por R$ 80.
          </p>
          <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
            <li>As faixas devem começar em quantidade 1</li>
            <li>Não pode haver lacunas entre as faixas</li>
            <li>Não pode haver sobreposição de quantidades</li>
            <li>Apenas a última faixa pode ter quantidade ilimitada</li>
          </ul>
        </div>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Erros de validação detectados:</p>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx} className="text-sm">{error.message}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {tiers.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Faixas de Preço Cadastradas</h3>
              <p className="text-sm text-muted-foreground">
                Visualize e gerencie suas faixas de preço por quantidade
              </p>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Preço Unitário</TableHead>
                    <TableHead>Preço Promocional</TableHead>
                    <TableHead>Economia</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...tiers].sort((a, b) => a.min_quantity - b.min_quantity).map((tier, index) => {
                    const savings = calculateSavings(tier.unit_price, tier.discounted_unit_price);
                    const hasError = errors.some(e => e.tierIndex === index);

                    return (
                      <TableRow key={index} className={hasError ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {formatQuantityRange(tier.min_quantity, tier.max_quantity)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {currencySymbol} {tier.unit_price.toLocaleString(locale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </TableCell>
                        <TableCell>
                          {tier.discounted_unit_price ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {currencySymbol} {tier.discounted_unit_price.toLocaleString(locale, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {savings ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="bg-green-600">
                                -{savings.percentage}%
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Economize {currencySymbol} {savings.savings.toLocaleString(locale, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteConfirmIndex(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remover faixa</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {minPrice !== null && (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Preço exibido na vitrine
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    A partir de {currencySymbol} {minPrice.toLocaleString(locale, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })} por unidade
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Adicionar Nova Faixa</h3>
            <p className="text-sm text-muted-foreground">
              Preencha os campos abaixo para adicionar uma nova faixa de preço
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormLabel>Quantidade Mínima *</FormLabel>
              <Input
                type="number"
                min={1}
                value={newTier.min_quantity || ''}
                onChange={(e) => setNewTier({ ...newTier, min_quantity: parseInt(e.target.value) || 1 })}
                placeholder="Ex: 1"
              />
            </div>

            <div className="space-y-2">
              <FormLabel>
                Quantidade Máxima
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 inline ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Deixe vazio para quantidade ilimitada (apenas para a última faixa)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <Input
                type="number"
                min={newTier.min_quantity || 1}
                value={newTier.max_quantity || ''}
                onChange={(e) => setNewTier({
                  ...newTier,
                  max_quantity: e.target.value ? parseInt(e.target.value) : null
                })}
                placeholder="Deixe vazio para ilimitado"
              />
            </div>

            <div className="space-y-2">
              <FormLabel>Preço Unitário *</FormLabel>
              <NumericFormat
                {...numberFormatConfig}
                value={newTier.unit_price || ''}
                onValueChange={(values) => {
                  setNewTier({ ...newTier, unit_price: parseFloat(values.value) || 0 });
                }}
                placeholder={`${currencySymbol} 0,00`}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <FormLabel>Preço Promocional Unitário</FormLabel>
              <NumericFormat
                {...numberFormatConfig}
                value={newTier.discounted_unit_price || ''}
                onValueChange={(values) => {
                  setNewTier({
                    ...newTier,
                    discounted_unit_price: values.value ? parseFloat(values.value) : null
                  });
                }}
                placeholder={`${currencySymbol} 0,00`}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <Button type="button" onClick={handleAddTier} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Faixa
          </Button>
        </div>
      </Card>

      <AlertDialog open={deleteConfirmIndex !== null} onOpenChange={(open) => !open && setDeleteConfirmIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta faixa de preço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmIndex !== null && handleDeleteTier(deleteConfirmIndex)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
