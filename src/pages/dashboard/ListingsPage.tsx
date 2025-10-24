import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  
  const {
    products,
    filteredProducts,
    loading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    availableCategories,
    updatingProductId,
    reordering,
    isReorderModeActive,
    setIsReorderModeActive,
    selectedProducts,
    setSelectedProducts,
    bulkActionLoading,
    canReorder,
    allSelected,
    someSelected,
    toggleProductVisibility,
    handleSelectProduct,
    handleSelectAll,
    handleBulkVisibilityToggle,
    handleBulkCategoryChange,
    handleBulkBrandChange,
    handleBulkDelete,
    handleBulkImageCompression,
    handleDragEnd,
    refreshProducts
  } = useProductListManagement({ userId: user?.id });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <ListingsHeader
        onCreateNew={() => navigate('/dashboard/products/new')}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        reorderMode={isReorderModeActive}
        onReorderModeToggle={() => setIsReorderModeActive(!isReorderModeActive)}
        canReorder={canReorder}
      />

      <ListingsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        availableCategories={availableCategories}
      />

      <ListingsStatusBar
        totalCount={products.length}
        filteredCount={filteredProducts.length}
        selectedCount={selectedProducts.length}
      />

      {selectedProducts.length > 0 && (
        <BulkActionsPanel
          selectedCount={selectedProducts.length}
          onBulkVisibilityToggle={handleBulkVisibilityToggle}
          onBulkCategoryChange={handleBulkCategoryChange}
          onBulkBrandChange={handleBulkBrandChange}
          onDelete={handleBulkDelete}
          onBulkImageCompression={handleBulkImageCompression}
          onClearSelection={() => setSelectedProducts([])}
          loading={bulkActionLoading}
        />
      )}

      <EnhancedProductGrid
        products={filteredProducts}
        loading={loading}
        viewMode={viewMode}
        reorderMode={isReorderModeActive}
        selectedProducts={selectedProducts}
        onSelectionChange={handleSelectProduct}
        onSelectAll={handleSelectAll}
        onReorder={handleDragEnd}
        onToggleVisibility={toggleProductVisibility}
        onRefresh={refreshProducts}
        updatingProductId={updatingProductId}
        reordering={reordering}
        canReorder={canReorder}
        allSelected={allSelected}
        someSelected={someSelected}
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
