import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCart } from '@/contexts/CartContext';
import { formatCurrencyI18n, useTranslation, type SupportedLanguage, type SupportedCurrency } from '@/lib/i18n';
import { toast } from 'sonner';
import { getColorValue } from '@/lib/utils';
import type { Product, PriceTier } from '@/types';
import { fetchProductPriceTiers, calculateApplicablePrice, formatPriceTierRange } from '@/lib/tieredPricingUtils';
import { supabase } from '@/lib/supabase';
import TieredPricingIndicator from '@/components/product/TieredPricingIndicator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductVariantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  currency?: SupportedCurrency;
  language?: SupportedLanguage;
}

export default function ProductVariantModal({
  open,
  onOpenChange,
  product,
  currency = 'BRL',
  language = 'pt-BR'
}: ProductVariantModalProps) {
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [hasTieredPricing, setHasTieredPricing] = useState(false);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const { addToCart, hasVariant, getVariantQuantity } = useCart();
  const { t } = useTranslation(language);

  useEffect(() => {
    const loadTieredPricing = async () => {
      if (!product.id) return;

      setLoadingTiers(true);
      try {
        const { data: productData } = await supabase
          .from('products')
          .select('has_tiered_pricing')
          .eq('id', product.id)
          .single();

        if (productData?.has_tiered_pricing) {
          const tiers = await fetchProductPriceTiers(product.id);
          setPriceTiers(tiers);
          setHasTieredPricing(true);
        }
      } catch (error) {
        console.error('Error loading tiered pricing:', error);
      } finally {
        setLoadingTiers(false);
      }
    };

    if (open) {
      loadTieredPricing();
    }
  }, [product.id, open]);

  // More robust checking for colors and sizes
  const hasColors = Boolean(
    product.colors && 
    Array.isArray(product.colors) && 
    product.colors.length > 0 &&
    product.colors.some(color => color && typeof color === 'string' && color.trim().length > 0)
  );
                   
  const hasSizes = Boolean(
    product.sizes && 
    Array.isArray(product.sizes) && 
    product.sizes.length > 0 &&
    product.sizes.some(size => size && typeof size === 'string' && size.trim().length > 0)
  );
                  
  const hasOptions = hasColors || hasSizes;

  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('🛒 ProductVariantModal - Product data:', {
      id: product.id,
      colors: product.colors,
      sizes: product.sizes,
      hasColors,
      hasSizes
    });
  }

  // Separate apparel sizes from shoe sizes
  const separateSizes = (sizes: string[]) => {
    const apparelSizes: string[] = [];
    const shoeSizes: string[] = [];
    
    sizes.forEach((size: string) => {
      const numericSize = parseInt(size);
      if (!isNaN(numericSize) && numericSize >= 17 && numericSize <= 43) {
        shoeSizes.push(size);
      } else {
        apparelSizes.push(size);
      }
    });

    return { apparelSizes, shoeSizes };
  };

  const sortSizes = (sizes: string[], isShoe: boolean) => {
    if (isShoe) {
      return sizes.sort((a, b) => parseInt(a) - parseInt(b));
    } else {
      const sizeOrder = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
      return sizes.sort((a, b) => {
        const indexA = sizeOrder.indexOf(a);
        const indexB = sizeOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      });
    }
  };

  const currentVariantQuantity = getVariantQuantity(product.id, selectedColor, selectedSize);
  const inCart = hasVariant(product.id, selectedColor, selectedSize);

  const handleAddToCart = () => {
    // Validate required selections for products with options
    if (hasOptions) {
      if (hasColors && !selectedColor) {
        toast.error('Selecione uma cor');
        return;
      }
      if (hasSizes && !selectedSize) {
        toast.error('Selecione um tamanho');
        return;
      }
    }

    // Calculate the unit price (with tiered pricing if applicable)
    const unitPrice = hasTieredPricing && pricingInfo ? pricingInfo.unitPrice : undefined;

    // Add the specified quantity with tiered price
    addToCart(product, selectedColor, selectedSize, quantity, unitPrice);

    toast.success(`${quantity} ${quantity === 1 ? 'item adicionado' : 'itens adicionados'} ao carrinho`);

    // Reset form and close modal
    setSelectedColor(undefined);
    setSelectedSize(undefined);
    setQuantity(1);
    onOpenChange(false);
  };

  const canAddToCart = (!hasColors || selectedColor) && (!hasSizes || selectedSize);
  
  // For products without options, always allow add to cart
  const canAddToCartFinal = !hasOptions || canAddToCart;

  // Calculate price with tiered pricing if applicable
  let price = product.discounted_price || product.price;
  let totalPrice = price * quantity;
  let pricingInfo = null;

  if (hasTieredPricing && priceTiers.length > 0) {
    const result = calculateApplicablePrice(
      quantity,
      priceTiers,
      product.price || 0,
      product.discounted_price
    );
    price = result.unitPrice;
    totalPrice = result.totalPrice;
    pricingInfo = result;
  }

  // If price is still 0 or undefined and we have tiered pricing, use the minimum tier price
  if ((!price || price === 0) && hasTieredPricing && priceTiers.length > 0) {
    const firstTier = priceTiers[0];
    price = firstTier.discounted_unit_price || firstTier.unit_price;
    totalPrice = price * quantity;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Selecionar Opções
            </DialogTitle>
            <DialogDescription>
              {product.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
          {/* Product Image and Price */}
          <div className="flex gap-4">
            <div className="w-20 h-20 bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
              <img
                src={product.featured_image_url || 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg'}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-primary">
                {product.is_starting_price ? t('product.starting_from') + ' ' : ''}
                {formatCurrencyI18n(price, currency, language)}
              </div>
              {product.short_description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {product.short_description}
                </p>
              )}
            </div>
          </div>

          {/* Color Selection */}
          {hasColors && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Cor <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedColor || ''} onValueChange={(value) => setSelectedColor(value || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma cor">
                    {selectedColor && (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                          style={{ backgroundColor: getColorValue(selectedColor) }}
                        />
                        <span className="capitalize">{selectedColor}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {product.colors!.map((color: string) => {
                    const colorValue = getColorValue(color);
                    return (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                            style={{ backgroundColor: colorValue }}
                          />
                          <span className="capitalize">{color}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {!selectedSize && (
                <p className="text-xs text-muted-foreground">Selecione uma cor para continuar</p>
              )}
            </div>
          )}

          {/* Size Selection */}
          {hasSizes && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Tamanho <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedSize || ''} onValueChange={(value) => setSelectedSize(value || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tamanho">
                    {selectedSize && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedSize}</span>
                        {(() => {
                          const numericSize = parseInt(selectedSize);
                          if (!isNaN(numericSize) && numericSize >= 17 && numericSize <= 43) {
                            return null;
                          } else if (['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'].includes(selectedSize)) {
                            return <Badge variant="outline" className="text-xs">Vestuário</Badge>;
                          } else {
                            return <Badge variant="outline" className="text-xs">Personalizado</Badge>;
                          }
                        })()}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const { apparelSizes, shoeSizes } = separateSizes(product.sizes!);
                    const sortedApparelSizes = sortSizes(apparelSizes, false);
                    const sortedShoeSizes = sortSizes(shoeSizes, true);
                    const allSizes = [...sortedApparelSizes, ...sortedShoeSizes];
                    
                    return allSizes.map((size: string) => {
                      const numericSize = parseInt(size);
                      const isShoeSize = !isNaN(numericSize) && numericSize >= 17 && numericSize <= 43;
                      const isApparelSize = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'].includes(size);
                      
                      return (
                        <SelectItem key={size} value={size}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{size}</span>
                            {isShoeSize && (
                              null
                            )}
                            {isApparelSize && (
                              <Badge variant="outline" className="text-xs">Vestuário</Badge>
                            )}
                            {!isShoeSize && !isApparelSize && (
                              <Badge variant="outline" className="text-xs">Personalizado</Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    });
                  })()}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Quantidade</Label>
              {hasTieredPricing && (
                <Badge className="bg-blue-600 text-white text-xs">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Preço Escalonado
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold w-12 text-center">
                {quantity}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tiered Pricing Info */}
          {hasTieredPricing && pricingInfo && (
            <TieredPricingIndicator
              currentQuantity={quantity}
              nextTierQuantity={pricingInfo.nextTier?.min_quantity || 0}
              nextTierSavings={pricingInfo.nextTierSavings}
              appliedTierSavings={pricingInfo.savings}
              currency={currency}
              language={language}
            />
          )}

          {/* Quick Tier Selector */}
          {hasTieredPricing && priceTiers.length > 0 && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-blue-600" />
                  Seleção Rápida de Quantidade
                </CardTitle>
                <CardDescription className="text-xs">
                  Clique para selecionar uma quantidade e ver o preço
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {priceTiers.slice(0, 4).map((tier) => {
                    const tierPrice = tier.discounted_unit_price || tier.unit_price;
                    const tierTotal = tierPrice * tier.min_quantity;
                    const basePrice = product.discounted_price || product.price;
                    const savings = (basePrice * tier.min_quantity) - tierTotal;
                    const savingsPercent = Math.round((savings / (basePrice * tier.min_quantity)) * 100);

                    return (
                      <Button
                        key={tier.id}
                        variant={quantity === tier.min_quantity ? "default" : "outline"}
                        className="h-auto py-2 px-3 flex flex-col items-start"
                        onClick={() => setQuantity(tier.min_quantity)}
                      >
                        <div className="text-xs font-semibold">{formatPriceTierRange(tier)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrencyI18n(tierPrice, currency, language)}/un
                        </div>
                        {savingsPercent > 0 && (
                          <div className="text-xs text-green-600 font-medium">
                            -{savingsPercent}%
                          </div>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation message */}
          {hasOptions && ((!selectedColor && hasColors) || (!selectedSize && hasSizes)) && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {(!selectedColor && hasColors) && (!selectedSize && hasSizes)
                  ? 'Selecione uma cor e um tamanho'
                  : !selectedColor && hasColors
                  ? 'Selecione uma cor'
                  : 'Selecione um tamanho'
                }
              </p>
            </div>
          )}

          {/* Current variant in cart info */}
          {inCart && canAddToCartFinal && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Esta variação já está no carrinho ({currentVariantQuantity} {currentVariantQuantity === 1 ? 'unidade' : 'unidades'})
              </p>
            </div>
          )}

          {/* Total Price */}
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="font-medium">Total:</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrencyI18n(totalPrice, currency, language)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={hasOptions && ((!selectedColor && hasColors) || (!selectedSize && hasSizes))}
              className="flex-1"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Adicionar {quantity > 1 ? `(${quantity})` : ''}
            </Button>
          </div>
          </div>
        </>
      </DialogContent>
    </Dialog>
  );
}