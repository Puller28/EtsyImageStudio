import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { CloudUpload, X, Image, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  uploadedImage?: {
    file: File;
    preview: string;
  };
  onRemoveImage: () => void;
  onGenerateNew?: () => void; // For AI-generated images
  onBackToChoice?: () => void; // To go back to initial choice
  onOpenProjectPicker?: () => void;
}

export default function ImageUpload({
  onImageUpload,
  uploadedImage,
  onRemoveImage,
  onGenerateNew,
  onBackToChoice,
  onOpenProjectPicker,
}: ImageUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles[0]);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false
  });

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            <CloudUpload className="inline w-5 h-5 text-primary mr-2" />
            Upload Your Artwork
          </h3>
          {onBackToChoice && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToChoice}
              className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold shadow-md"
              data-testid="button-back-to-choice"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Options
            </Button>
          )}
        </div>
        
        {!uploadedImage ? (
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
                isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
              }`}
              data-onboarding-target="upload"
            >
              <input {...getInputProps()} />
              <div className="space-y-2">
                <CloudUpload className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? "Drop your artwork here" : "Drop your AI artwork here"}
                </p>
                <p className="text-sm text-gray-500">or click to browse files</p>
                <p className="text-xs text-gray-400">JPG, PNG up to 50MB</p>
              </div>
            </div>

            {onOpenProjectPicker && (
              <div className="mt-6 text-center">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">or reuse</div>
                <Button
                  variant="outline"
                  className="mt-2 inline-flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  onClick={onOpenProjectPicker}
                  type="button"
                >
                  <Image className="h-4 w-4" />
                  Use artwork from a project
                </Button>
              </div>
            )}
            
            {/* Error messages for rejected files */}
            {fileRejections.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-600">
                  {fileRejections.map(({ file, errors }) => (
                    <div key={file.name}>
                      <p className="font-medium">{file.name}</p>
                      {errors.map((error) => (
                        <p key={error.code} className="text-xs">
                          {error.code === 'file-too-large' 
                            ? `File is too large. Maximum size allowed is 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
                            : error.message}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {/* Large Preview */}
            <div className="relative">
              <img
                src={uploadedImage.preview}
                alt="Artwork preview"
                className="w-full max-w-lg mx-auto rounded-lg shadow-sm border border-gray-200"
              />
            </div>
            
            {/* Image Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{uploadedImage.file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedImage.file.size / (1024 * 1024)).toFixed(1)} MB - Ready to process
                  </p>
                </div>
                <div className="flex gap-2">
                  {onGenerateNew && uploadedImage.file.name.includes('ai-generated') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onGenerateNew}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      Generate New
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemoveImage}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
