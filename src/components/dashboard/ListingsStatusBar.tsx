import { Badge } from '@/components/ui/badge';

interface ListingsStatusBarProps {
  totalCount: number;
  filteredCount: number;
  selectedCount: number;
}

export function ListingsStatusBar({
  totalCount,
  filteredCount,
  selectedCount
}: ListingsStatusBarProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <span>
          {filteredCount === totalCount
            ? `${totalCount} produtos`
            : `${filteredCount} de ${totalCount} produtos`}
        </span>
        {selectedCount > 0 && (
          <Badge variant="secondary" className="ml-2">
            {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </div>
  );
}