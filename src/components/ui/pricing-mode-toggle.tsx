import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { DollarSign, Layers, Info } from 'lucide-react';

interface PricingModeToggleProps {
  isTieredPricing: boolean;
  onModeChange: (useTieredPricing: boolean) => void;
  hasSinglePriceData: boolean;
  hasTieredPriceData: boolean;
  disabled?: boolean;
}

export function PricingModeToggle({
  isTieredPricing,
  onModeChange,
  hasSinglePriceData,
  hasTieredPriceData,
  disabled = false
}: PricingModeToggleProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<boolean | null>(null);

  const handleToggle = (checked: boolean) => {
    const hasDataInCurrentMode = checked ? hasSinglePriceData : hasTieredPriceData;

    if (hasDataInCurrentMode) {
      setPendingMode(checked);
      setShowConfirmDialog(true);
    } else {
      onModeChange(checked);
    }
  };

  const confirmModeChange = () => {
    if (pendingMode !== null) {
      onModeChange(pendingMode);
    }
    setShowConfirmDialog(false);
    setPendingMode(null);
  };

  const cancelModeChange = () => {
    setShowConfirmDialog(false);
    setPendingMode(null);
  };

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Modo de Precificação</h3>
            <p className="text-sm text-muted-foreground">
              Escolha como deseja definir os preços deste produto
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Switch
              id="pricing-mode"
              checked={isTieredPricing}
              onCheckedChange={handleToggle}
              disabled={disabled}
            />
            <Label htmlFor="pricing-mode" className="cursor-pointer">
              <div className="flex items-center gap-2">
                {isTieredPricing ? (
                  <>
                    <Layers className="h-5 w-5 text-primary" />
                    <span className="font-medium">Preço Escalonado</span>
                    <Badge variant="default">Ativo</Badge>
                  </>
                ) : (
                  <>
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Preço Único</span>
                    <Badge variant="secondary">Ativo</Badge>
                  </>
                )}
              </div>
            </Label>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div
              className={`p-4 rounded-lg border-2 transition-all ${
                !isTieredPricing
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${!isTieredPricing ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <DollarSign className="h-5 w-5" />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-semibold text-sm">Preço Único</h4>
                  <p className="text-xs text-muted-foreground">
                    Um preço fixo para o produto, independente da quantidade comprada.
                  </p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✓ Simples e direto</li>
                    <li>✓ Ideal para produtos unitários</li>
                    <li>✓ Suporta preço promocional</li>
                  </ul>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border-2 transition-all ${
                isTieredPricing
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isTieredPricing ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Layers className="h-5 w-5" />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="font-semibold text-sm">Preço Escalonado</h4>
                  <p className="text-xs text-muted-foreground">
                    Preços diferentes baseados na quantidade comprada. Incentiva compras maiores.
                  </p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✓ Descontos por quantidade</li>
                    <li>✓ Múltiplas faixas de preço</li>
                    <li>✓ Preço promocional por faixa</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              {isTieredPricing ? (
                <>
                  <strong>Modo Escalonado:</strong> Defina faixas de quantidade com preços diferentes.
                  Exemplo: 1-10 unidades por R$ 100, 11-50 por R$ 90, 51+ por R$ 80.
                </>
              ) : (
                <>
                  <strong>Modo Único:</strong> Defina um único preço para o produto.
                  Opcionalmente, adicione um preço promocional para destacar uma oferta.
                </>
              )}
            </p>
          </div>
        </div>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mudança de modo de precificação</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a mudar o modo de precificação. Os dados do modo atual serão perdidos.
              {pendingMode ? (
                <>
                  <br /><br />
                  <strong>Mudando para Preço Escalonado:</strong> O preço único atual será removido
                  e você precisará configurar as faixas de preço.
                </>
              ) : (
                <>
                  <br /><br />
                  <strong>Mudando para Preço Único:</strong> Todas as faixas de preço escalonado
                  serão removidas e você precisará configurar um preço único.
                </>
              )}
              <br /><br />
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelModeChange}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmModeChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
