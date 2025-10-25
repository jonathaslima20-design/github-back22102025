import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomColorSelector } from '@/components/ui/custom-color-selector';
import { cn } from '@/lib/utils';

interface SizesColorsSelectorProps {
  colors: string[];
  onColorsChange: (colors: string[]) => void;
  sizes: string[];
  onSizesChange: (sizes: string[]) => void;
  userId?: string;
}

const APPAREL_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
const SHOE_SIZES = Array.from({ length: 27 }, (_, i) => (17 + i).toString());

export function SizesColorsSelector({
  colors,
  onColorsChange,
  sizes,
  onSizesChange,
  userId,
}: SizesColorsSelectorProps) {
  const [colorsExpanded, setColorsExpanded] = useState(false);
  const [sizesExpanded, setSizesExpanded] = useState(false);
  const [activeSizeType, setActiveSizeType] = useState<'apparel' | 'shoes' | 'custom'>('apparel');
  const [customSize, setCustomSize] = useState('');

  const handleSizeToggle = (size: string) => {
    if (sizes.includes(size)) {
      onSizesChange(sizes.filter((s) => s !== size));
    } else {
      onSizesChange([...sizes, size]);
    }
  };

  const handleRemoveSize = (size: string) => {
    onSizesChange(sizes.filter((s) => s !== size));
  };

  const handleAddCustomSize = () => {
    const trimmed = customSize.trim();
    if (trimmed && !sizes.includes(trimmed)) {
      onSizesChange([...sizes, trimmed]);
      setCustomSize('');
    }
  };

  const handleCustomSizeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomSize();
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => setColorsExpanded(!colorsExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium cursor-pointer">
              Cores Disponíveis (Opcional)
            </Label>
            {colors.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {colors.length}
              </Badge>
            )}
          </div>
          {colorsExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {colorsExpanded && (
          <div className="p-4 border-t">
            <CustomColorSelector
              value={colors}
              onChange={onColorsChange}
              userId={userId}
            />
          </div>
        )}
      </div>

      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => setSizesExpanded(!sizesExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium cursor-pointer">Tamanhos</Label>
            {sizes.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sizes.length}
              </Badge>
            )}
          </div>
          {sizesExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {sizesExpanded && (
          <div className="p-4 border-t space-y-4">
            {sizes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Tamanhos Selecionados</Label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <Badge key={size} variant="secondary" className="px-3 py-1">
                      {size}
                      <button
                        type="button"
                        onClick={() => handleRemoveSize(size)}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 border-b pb-3">
              <Button
                type="button"
                variant={activeSizeType === 'apparel' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSizeType('apparel')}
              >
                Vestuário
              </Button>
              <Button
                type="button"
                variant={activeSizeType === 'shoes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSizeType('shoes')}
              >
                Calçados
              </Button>
              <Button
                type="button"
                variant={activeSizeType === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSizeType('custom')}
              >
                Personalizado
              </Button>
            </div>

            {activeSizeType === 'apparel' && (
              <div className="space-y-2">
                <Label className="text-sm">Tamanhos de Vestuário</Label>
                <div className="flex flex-wrap gap-2">
                  {APPAREL_SIZES.map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant={sizes.includes(size) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSizeToggle(size)}
                      className="w-16"
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {activeSizeType === 'shoes' && (
              <div className="space-y-2">
                <Label className="text-sm">Tamanhos de Calçados (17-43)</Label>
                <div className="grid grid-cols-7 gap-2 max-h-64 overflow-y-auto">
                  {SHOE_SIZES.map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant={sizes.includes(size) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSizeToggle(size)}
                      className="h-9"
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {activeSizeType === 'custom' && (
              <div className="space-y-2">
                <Label className="text-sm">Tamanhos Personalizados</Label>
                <div className="flex gap-2">
                  <Input
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    onKeyDown={handleCustomSizeKeyDown}
                    placeholder="Digite um tamanho personalizado..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddCustomSize}
                    disabled={!customSize.trim()}
                  >
                    Adicionar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Exemplos: 2XL, 3XL, P/M, Único, etc.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
