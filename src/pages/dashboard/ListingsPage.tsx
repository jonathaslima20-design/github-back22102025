import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ListingsHeader } from '@/components/dashboard/ListingsHeader';
import { ListingsFilters } from '@/components/dashboard/ListingsFilters';
import { ListingsStatusBar } from '@/components/dashboard/ListingsStatusBar';
import { EnhancedProductGrid } from '@/components/dashboard/EnhancedProductGrid';
import { BulkActionsPanel } from '@/components/dashboard/BulkActionsPanel';
import { useProductListManagement } from '@/hooks/useProductListManagement';

export default function ListingsPage() {
  const navigate = useNavigate();
  const {
    products,
    filteredProducts,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortOrder,
    setSortOrder,
    selectedProducts,
    setSelectedProducts,
    reorderMode,
    setReorderMode,
    handleReorder,
    handleBulkDelete,
    handleBulkVisibilityToggle,
    refreshProducts
  } = useProductListManagement();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <ListingsHeader
        onCreateNew={() => navigate('/dashboard/products/new')}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        reorderMode={reorderMode}
        onReorderModeToggle={() => setReorderMode(!reorderMode)}
      />

      <ListingsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      <ListingsStatusBar
        totalCount={products.length}
        filteredCount={filteredProducts.length}
        selectedCount={selectedProducts.length}
      />

      {selectedProducts.length > 0 && (
        <BulkActionsPanel
          selectedCount={selectedProducts.length}
          onDelete={handleBulkDelete}
          onVisibilityToggle={handleBulkVisibilityToggle}
          onClearSelection={() => setSelectedProducts([])}
        />
      )}

      <EnhancedProductGrid
        products={filteredProducts}
        loading={loading}
        viewMode={viewMode}
        reorderMode={reorderMode}
        selectedProducts={selectedProducts}
        onSelectionChange={setSelectedProducts}
        onReorder={handleReorder}
        onRefresh={refreshProducts}
      />

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Nenhum produto encontrado</p>
          <Button onClick={() => navigate('/dashboard/products/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Produto
          </Button>
        </div>
      )}
    </div>
  );
}
