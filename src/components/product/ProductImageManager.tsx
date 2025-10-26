import { useState } from 'react';
import { Upload, X, Star, Image as ImageIcon, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageCropperProduct } from '@/components/ui/image-cropper-product';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ImageItem = {
  id: string;
  url: string;
  file?: File;
  isFeatured: boolean;
};

interface ProductImageManagerProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  maxImages?: number;
  maxFileSize?: number;
}

export function ProductImageManager({
  images,
  onChange,
  maxImages = 10,
  maxFileSize = 5
}: ProductImageManagerProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [imageToRecrop, setImageToRecrop] = useState<ImageItem | null>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const remainingSlots = maxImages - images.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    if (filesToAdd.length === 0) {
      toast.error('Limite máximo de imagens atingido');
      return;
    }

    const validFiles = filesToAdd.filter(file => {
      if (file.size > maxFileSize * 1024 * 1024) {
        toast.error(`${file.name} excede o tamanho máximo de ${maxFileSize}MB`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} não é uma imagem válida`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setPendingFiles(validFiles);
      setCurrentFileIndex(0);
      setSelectedFile(validFiles[0]);
      setShowCropper(true);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (imageToRecrop) {
      const croppedFile = new File([croppedBlob], `recropped-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      const updatedImages = images.map(img =>
        img.id === imageToRecrop.id
          ? { ...img, url: URL.createObjectURL(croppedFile), file: croppedFile }
          : img
      );

      onChange(updatedImages);
      setShowCropper(false);
      setImageToRecrop(null);
      toast.success('Imagem recortada com sucesso');
      return;
    }

    if (!selectedFile) return;

    const croppedFile = new File([croppedBlob], selectedFile.name, {
      type: 'image/jpeg',
    });

    const newImage: ImageItem = {
      id: `new-${Date.now()}-${currentFileIndex}`,
      url: URL.createObjectURL(croppedFile),
      file: croppedFile,
      isFeatured: images.length === 0 && currentFileIndex === 0
    };

    onChange([...images, newImage]);

    if (currentFileIndex < pendingFiles.length - 1) {
      const nextIndex = currentFileIndex + 1;
      setCurrentFileIndex(nextIndex);
      setSelectedFile(pendingFiles[nextIndex]);
    } else {
      setShowCropper(false);
      setSelectedFile(null);
      setPendingFiles([]);
      setCurrentFileIndex(0);
      toast.success(`${pendingFiles.length} imagem(ns) adicionada(s) com sucesso`);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedFile(null);
    setPendingFiles([]);
    setCurrentFileIndex(0);
    setImageToRecrop(null);
  };

  const handleRecropImage = (image: ImageItem) => {
    setImageToRecrop(image);
    setShowCropper(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const setFeaturedImage = (imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isFeatured: img.id === imageId
    }));
    onChange(updatedImages);
  };

  const removeImage = (imageId: string) => {
    const imageToRemove = images.find(img => img.id === imageId);
    const remainingImages = images.filter(img => img.id !== imageId);

    if (imageToRemove?.isFeatured && remainingImages.length > 0) {
      remainingImages[0].isFeatured = true;
    }

    onChange(remainingImages);
  };

  const remainingSlots = maxImages - images.length;

  return (
    <>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Imagens do Produto</h3>
          <p className="text-sm text-muted-foreground">
            Adicione até {maxImages} imagens do produto. Cada imagem será cortada em proporção quadrada (1:1).
          </p>
        </div>

        {images.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Imagens Atuais</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group aspect-square rounded-lg overflow-hidden bg-muted border-2 transition-all"
                >
                  <img
                    src={image.url}
                    alt="Product"
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant={image.isFeatured ? "default" : "secondary"}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setFeaturedImage(image.id)}
                      title={image.isFeatured ? "Imagem principal" : "Definir como principal"}
                    >
                      <Star className={cn(
                        "h-4 w-4",
                        image.isFeatured && "fill-current"
                      )} />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRecropImage(image)}
                      title="Recortar imagem"
                    >
                      <Scissors className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(image.id)}
                      title="Remover imagem"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {image.isFeatured && (
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded">
                        Principal
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {remainingSlots > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">
              Adicionar Novas Imagens ({remainingSlots} restantes)
            </h4>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "relative border-2 border-dashed rounded-lg p-8 transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <input
                type="file"
                id="image-upload"
                className="hidden"
                multiple
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <Scissors className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm font-medium text-center mb-1">
                  Clique para fazer upload ou arraste as imagens
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  PNG, JPG ou WEBP (MÁX. {maxFileSize}MB)
                </p>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Recomendado: 1000×1000px ou superior para melhor qualidade
                </p>
                <p className="text-xs text-primary/80 text-center mt-2 font-medium flex items-center justify-center gap-1">
                  <Scissors className="h-3 w-3" />
                  As imagens serão ajustadas ao fazer upload
                </p>
              </label>
            </div>
          </div>
        )}

        {images.length === 0 && (
          <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border border-dashed">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma imagem adicionada ainda. Adicione pelo menos uma imagem do produto.
            </p>
          </div>
        )}
      </div>

      {(selectedFile || imageToRecrop) && (
        <ImageCropperProduct
          image={imageToRecrop ? imageToRecrop.url : URL.createObjectURL(selectedFile!)}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
          open={showCropper}
        />
      )}
    </>
  );
}
