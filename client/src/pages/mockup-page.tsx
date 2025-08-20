import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, ArrowLeft } from "lucide-react";
import ImageUpload from "@/components/image-upload";
import { TemplateSelector } from "@/components/template-selector";
import { MockupResults } from "@/components/mockup-results";

interface GeneratedMockup {
  template: {
    room: string;
    id: string;
    name: string;
  };
  image_data: string;
}

export function MockupPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [generatedMockups, setGeneratedMockups] = useState<GeneratedMockup[]>([]);
  const [currentStep, setCurrentStep] = useState<"upload" | "select" | "results">("upload");

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadedImageUrl(url);
    setCurrentStep("select");
  };

  const handleMockupsGenerated = (mockups: GeneratedMockup[]) => {
    setGeneratedMockups(mockups);
    setCurrentStep("results");
  };

  const handleReset = () => {
    setCurrentStep("select");
    setGeneratedMockups([]);
  };

  const handleStartOver = () => {
    setUploadedFile(null);
    setUploadedImageUrl("");
    setGeneratedMockups([]);
    setCurrentStep("upload");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {currentStep !== "upload" && (
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={currentStep === "select" ? handleStartOver : handleReset}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === "select" ? "Change Image" : "Select Different Templates"}
          </Button>
          {uploadedImageUrl && (
            <div className="flex items-center space-x-2">
              <img 
                src={uploadedImageUrl} 
                alt="Uploaded artwork" 
                className="w-12 h-12 object-cover rounded border"
              />
              <span className="text-sm text-muted-foreground">
                {uploadedFile?.name}
              </span>
            </div>
          )}
        </div>
      )}

      {currentStep === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Upload Your Artwork</span>
            </CardTitle>
            <CardDescription>
              Upload your artwork to create professional mockups. We'll place your art into beautiful room settings using our template system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUpload
              onImageUpload={handleFileUpload}
              uploadedImage={uploadedFile ? {
                file: uploadedFile,
                preview: uploadedImageUrl
              } : null}
              onRemoveImage={() => {
                setUploadedFile(null);
                setUploadedImageUrl("");
              }}
            />
          </CardContent>
        </Card>
      )}

      {currentStep === "select" && (
        <TemplateSelector
          uploadedFile={uploadedFile}
          onMockupsGenerated={handleMockupsGenerated}
        />
      )}

      {currentStep === "results" && generatedMockups.length > 0 && (
        <MockupResults
          mockups={generatedMockups}
          onReset={handleReset}
        />
      )}
    </div>
  );
}