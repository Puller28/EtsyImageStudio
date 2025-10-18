import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, Scissors, Image as ImageIcon, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export default function BackgroundRemovalTool() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageType, setImageType] = useState<'auto' | 'person' | 'product' | 'car'>('auto');
  const [quality, setQuality] = useState<'auto' | 'preview' | 'full' | 'hd'>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const CREDITS_REQUIRED = 2;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Read and display the image
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setProcessedImage(null); // Clear previous result
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = async () => {
    if (!selectedImage) {
      toast({
        title: "No Image Selected",
        description: "Please select an image first",
        variant: "destructive",
      });
      return;
    }

    // Check credits
    if (!user || user.credits < CREDITS_REQUIRED) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${CREDITS_REQUIRED} credits to remove background. Current balance: ${user?.credits || 0}`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Convert base64 to blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('image', blob, 'image.png');
      formData.append('type', imageType);
      formData.append('size', quality);

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Send request
      const apiResponse = await fetch('/api/remove-background', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(result.error || 'Failed to remove background');
      }

      setProcessedImage(result.imageBase64);

      toast({
        title: "Background Removed!",
        description: `Successfully removed background. ${CREDITS_REQUIRED} credits used. New balance: ${result.newBalance}`,
      });
    } catch (error) {
      console.error('Background removal error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove background",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `background-removed-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Downloaded!",
      description: "Image saved to your downloads folder",
    });
  };

  const handleReset = () => {
    setSelectedImage(null);
    setProcessedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Scissors className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Background Removal</h1>
        </div>
        <p className="text-muted-foreground">
          Remove backgrounds from images instantly with AI. Perfect for product photos, portraits, and mockups.
        </p>
      </div>

      {/* Credits Badge */}
      <div className="mb-6">
        <Badge variant="secondary" className="text-sm">
          <Sparkles className="h-3 w-3 mr-1" />
          Cost: {CREDITS_REQUIRED} credits per image
        </Badge>
        <span className="ml-3 text-sm text-muted-foreground">
          Your balance: <span className="font-semibold">{user?.credits || 0} credits</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Image</CardTitle>
              <CardDescription>Select an image to remove its background</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                  disabled={isProcessing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Image
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports JPG, PNG, WebP (max 10MB)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Image Type</Label>
                <Select value={imageType} onValueChange={(value: any) => setImageType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto Detect</SelectItem>
                    <SelectItem value="person">Person / Portrait</SelectItem>
                    <SelectItem value="product">Product / Object</SelectItem>
                    <SelectItem value="car">Car / Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quality</Label>
                <Select value={quality} onValueChange={(value: any) => setQuality(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Recommended)</SelectItem>
                    <SelectItem value="preview">Preview (Fast)</SelectItem>
                    <SelectItem value="full">Full Quality</SelectItem>
                    <SelectItem value="hd">HD Quality</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 space-y-2">
                <Button
                  onClick={handleRemoveBackground}
                  disabled={!selectedImage || isProcessing || (user?.credits || 0) < CREDITS_REQUIRED}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Removing Background...
                    </>
                  ) : (
                    <>
                      <Scissors className="h-4 w-4 mr-2" />
                      Remove Background
                    </>
                  )}
                </Button>

                {processedImage && (
                  <>
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PNG
                    </Button>
                    <Button
                      onClick={handleReset}
                      variant="ghost"
                      className="w-full"
                    >
                      Start Over
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Upload any image (JPG, PNG, WebP)</p>
              <p>• AI automatically detects the subject</p>
              <p>• Background removed in seconds</p>
              <p>• Download as transparent PNG</p>
              <p className="pt-2 text-xs">
                Perfect for: Product photos, portraits, mockups, social media graphics
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {processedImage ? "Background removed successfully!" : "Your result will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Image */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Original</Label>
                  <div className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25">
                    {selectedImage ? (
                      <img
                        src={selectedImage}
                        alt="Original"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mb-2" />
                        <p className="text-sm">No image selected</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Processed Image */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Background Removed</Label>
                  <div 
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25"
                    style={{
                      backgroundImage: processedImage 
                        ? 'repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 20px 20px'
                        : 'none',
                      backgroundColor: processedImage ? 'transparent' : 'hsl(var(--muted))'
                    }}
                  >
                    {processedImage ? (
                      <img
                        src={processedImage}
                        alt="Processed"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                        <Scissors className="h-12 w-12 mb-2" />
                        <p className="text-sm">Result will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isProcessing && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div>
                      <p className="font-medium">Processing your image...</p>
                      <p className="text-sm text-muted-foreground">This usually takes 5-10 seconds</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Perfect For</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Photos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Create clean product images for your Etsy listings, Amazon store, or website. Remove distracting backgrounds instantly.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mockup Creation</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Prepare artwork for mockup generation. Remove backgrounds to create transparent PNGs perfect for placing on products.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Social Media</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Create professional graphics for Instagram, Facebook, and Pinterest. Perfect for profile pictures and promotional content.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
