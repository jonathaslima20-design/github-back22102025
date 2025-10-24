import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DiscountPriceInput } from '@/components/ui/discount-price-input';
import { CustomColorSelector } from '@/components/ui/custom-color-selector';
import { CustomSizeInput } from '@/components/ui/custom-size-input';
import { ImageCropperProduct } from '@/components/ui/image-cropper-product';
import { TieredPricingManager } from '@/components/ui/tiered-pricing-manager';
import { PricingModeToggle } from '@/components/ui/pricing-mode-toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { uploadImage } from '@/lib/image';

const productSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  short_description: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser maior ou igual a zero'),
  is_starting_price: z.boolean().default(false),
  featured_offer_price: z.number().optional(),
  featured_offer_installment: z.number().optional(),
  featured_offer_description: z.string().optional(),
  status: z.enum(['disponivel', 'vendido', 'reservado']).default('disponivel'),
  category: z.array(z.string()).default([]),
  brand: z.string().optional(),
  model: z.string().optional(),
  condition: z.enum(['novo', 'usado', 'seminovo']).default('novo'),
  video_url: z.string().optional(),
  is_visible_on_storefront: z.boolean().default(true),
  colors: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  has_tiered_pricing: z.boolean().default(false),
});

type ProductFormData = z.infer<typeof productSchema>;

type PriceTier = {
  id?: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  discounted_unit_price: number | null;
};

type ProductImage = {
  id: string;
  url: string;
  is_featured: boolean;
};

export default function EditProductPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string>('');
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [pricingMode, setPricingMode] = useState<'simple' | 'tiered'>('simple');
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      description: '',
      short_description: '',
      price: 0,
      is_starting_price: false,
      featured_offer_price: undefined,
      featured_offer_installment: undefined,
      featured_offer_description: '',
      status: 'disponivel',
      category: [],
      brand: '',
      model: '',
      condition: 'novo',
      video_url: '',
      is_visible_on_storefront: true,
      colors: [],
      sizes: [],
      has_tiered_pricing: false,
    },
  });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id || !user?.id) return;

      try {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (productError) throw productError;
        if (!product) {
          toast.error('Produto não encontrado');
          navigate('/dashboard/listings');
          return;
        }

        form.reset({
          title: product.title,
          description: product.description,
          short_description: product.short_description || '',
          price: product.price,
          is_starting_price: product.is_starting_price || false,
          featured_offer_price: product.featured_offer_price || undefined,
          featured_offer_installment: product.featured_offer_installment || undefined,
          featured_offer_description: product.featured_offer_description || '',
          status: product.status,
          category: product.category || [],
          brand: product.brand || '',
          model: product.model || '',
          condition: product.condition,
          video_url: product.video_url || '',
          is_visible_on_storefront: product.is_visible_on_storefront,
          colors: product.colors || [],
          sizes: product.sizes || [],
          has_tiered_pricing: product.has_tiered_pricing || false,
        });

        if (product.featured_image_url) {
          setFeaturedImagePreview(product.featured_image_url);
        }

        setPricingMode(product.has_tiered_pricing ? 'tiered' : 'simple');

        const { data: images, error: imagesError } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', id);

        if (imagesError) throw imagesError;
        if (images) {
          setExistingImages(images);
        }

        if (product.has_tiered_pricing) {
          const { data: tiers, error: tiersError } = await supabase
            .from('product_price_tiers')
            .select('*')
            .eq('product_id', id)
            .order('min_quantity');

          if (tiersError) throw tiersError;
          if (tiers) {
            setPriceTiers(tiers.map(tier => ({
              id: tier.id,
              min_quantity: tier.min_quantity,
              max_quantity: tier.max_quantity,
              unit_price: parseFloat(tier.unit_price),
              discounted_unit_price: tier.discounted_unit_price ? parseFloat(tier.discounted_unit_price) : null,
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Erro ao carregar produto');
      } finally {
        setFetching(false);
      }
    };

    fetchProduct();
  }, [id, user?.id, navigate, form]);

  const handleFeaturedImageChange = (file: File | null) => {
    setFeaturedImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFeaturedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAdditionalImages(prev => [...prev, ...files]);

      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAdditionalImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
    setAdditionalImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imageId: string) => {
    setImagesToDelete(prev => [...prev, imageId]);
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!user?.id || !id) return;

    if (pricingMode === 'tiered' && priceTiers.length === 0) {
      toast.error('Adicione pelo menos um nível de preço');
      return;
    }

    setLoading(true);
    try {
      let featuredImageUrl = featuredImagePreview;
      if (featuredImage) {
        const uploadResult = await uploadImage(featuredImage, user.id, 'product');
        if (uploadResult) {
          featuredImageUrl = uploadResult;
        }
      }

      const productData = {
        title: data.title,
        description: data.description,
        short_description: data.short_description || '',
        price: pricingMode === 'simple' ? data.price : 0,
        is_starting_price: data.is_starting_price,
        featured_offer_price: data.featured_offer_price || null,
        featured_offer_installment: data.featured_offer_installment || null,
        featured_offer_description: data.featured_offer_description || '',
        status: data.status,
        category: data.category.length > 0 ? data.category : ['Sem Categoria'],
        brand: data.brand || '',
        model: data.model || '',
        condition: data.condition,
        featured_image_url: featuredImageUrl,
        video_url: data.video_url || '',
        is_visible_on_storefront: data.is_visible_on_storefront,
        colors: data.colors,
        sizes: data.sizes,
        has_tiered_pricing: pricingMode === 'tiered',
      };

      const { error: productError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (productError) throw productError;

      if (imagesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_images')
          .delete()
          .in('id', imagesToDelete);

        if (deleteError) throw deleteError;
      }

      if (additionalImages.length > 0) {
        const imageUrls = await Promise.all(
          additionalImages.map(async (image) => {
            const url = await uploadImage(image, user.id, 'product');
            return url;
          })
        );

        const imageRecords = imageUrls
          .filter(url => url !== null)
          .map(url => ({
            product_id: id,
            url: url!,
            is_featured: false,
          }));

        if (imageRecords.length > 0) {
          const { error: imagesError } = await supabase
            .from('product_images')
            .insert(imageRecords);

          if (imagesError) throw imagesError;
        }
      }

      if (pricingMode === 'tiered') {
        const { error: deleteOldTiersError } = await supabase
          .from('product_price_tiers')
          .delete()
          .eq('product_id', id);

        if (deleteOldTiersError) throw deleteOldTiersError;

        if (priceTiers.length > 0) {
          const tierRecords = priceTiers.map(tier => ({
            product_id: id,
            min_quantity: tier.min_quantity,
            max_quantity: tier.max_quantity,
            unit_price: tier.unit_price,
            discounted_unit_price: tier.discounted_unit_price,
          }));

          const { error: tiersError } = await supabase
            .from('product_price_tiers')
            .insert(tierRecords);

          if (tiersError) throw tiersError;
        }
      } else {
        const { error: deleteAllTiersError } = await supabase
          .from('product_price_tiers')
          .delete()
          .eq('product_id', id);

        if (deleteAllTiersError) throw deleteAllTiersError;
      }

      toast.success('Produto atualizado com sucesso!');
      navigate('/dashboard/listings');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Erro ao atualizar produto');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Produto</h1>
          <p className="text-muted-foreground">Atualize as informações do produto</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título do Produto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Tênis Nike Air Max 90" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="short_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição Curta</FormLabel>
                    <FormControl>
                      <Input placeholder="Uma breve descrição do produto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição Completa *</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        content={field.value}
                        onChange={field.onChange}
                        placeholder="Descreva os detalhes do produto..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Nike" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Air Max 90" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condição</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a condição" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="novo">Novo</SelectItem>
                          <SelectItem value="seminovo">Semi-novo</SelectItem>
                          <SelectItem value="usado">Usado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="disponivel">Disponível</SelectItem>
                          <SelectItem value="reservado">Reservado</SelectItem>
                          <SelectItem value="vendido">Vendido</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PricingModeToggle
                isTieredPricing={pricingMode === 'tiered'}
                onModeChange={(useTieredPricing) => {
                  setPricingMode(useTieredPricing ? 'tiered' : 'simple');
                  form.setValue('has_tiered_pricing', useTieredPricing);
                }}
                hasSinglePriceData={form.watch('price') > 0}
                hasTieredPriceData={priceTiers.length > 0}
              />

              {pricingMode === 'simple' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço *</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="R$ 0,00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_starting_price"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Preço "A partir de"</FormLabel>
                            <FormDescription>
                              Exibir como "A partir de R$ {form.watch('price').toFixed(2)}"
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="featured_offer_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço Promocional</FormLabel>
                          <FormControl>
                            <DiscountPriceInput
                              value={field.value || 0}
                              onChange={field.onChange}
                              originalPrice={form.watch('price')}
                              placeholder="R$ 0,00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="featured_offer_installment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Parcelado</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              value={field.value || 0}
                              onChange={field.onChange}
                              placeholder="R$ 0,00"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="featured_offer_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição da Oferta</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 12x sem juros" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              ) : (
                <TieredPricingManager
                  tiers={priceTiers}
                  onChange={setPriceTiers}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="colors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cores</FormLabel>
                    <FormControl>
                      <CustomColorSelector
                        selectedColors={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sizes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamanhos</FormLabel>
                    <FormControl>
                      <CustomSizeInput
                        selectedSizes={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <FormLabel>Imagem Principal</FormLabel>
                <div className="mt-2">
                  <ImageCropperProduct
                    onImageCropped={handleFeaturedImageChange}
                    currentImageUrl={featuredImagePreview}
                  />
                </div>
              </div>

              <div>
                <FormLabel>Imagens Adicionais</FormLabel>
                <div className="mt-2 space-y-4">
                  {existingImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {existingImages.map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.url}
                            alt="Product"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(image.id)}
                            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Clique para adicionar imagens
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleAdditionalImagesChange}
                      />
                    </label>
                  </div>

                  {additionalImagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {additionalImagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeAdditionalImage(index)}
                            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="video_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Vídeo</FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtube.com/..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Cole o link de um vídeo do YouTube ou outro serviço
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="is_visible_on_storefront"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Visível na Vitrine</FormLabel>
                      <FormDescription>
                        Mostrar este produto na sua vitrine pública
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
