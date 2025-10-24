import ProductCategoriesManager from '@/components/dashboard/ProductCategoriesManager';

export default function CategoriesPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Categorias</h1>
        <p className="text-muted-foreground">Organize seus produtos em categorias</p>
      </div>
      <ProductCategoriesManager />
    </div>
  );
}
