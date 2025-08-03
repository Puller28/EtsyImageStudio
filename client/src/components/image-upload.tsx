import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { CloudUpload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  uploadedImage?: {
    file: File;
    preview: string;
  };
  onRemoveImage: () => void;
}

export default function ImageUpload({ onImageUpload, uploadedImage, onRemoveImage }: ImageUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles[0]);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          <CloudUpload className="inline w-5 h-5 text-primary mr-2" />
          Upload Your Artwork
        </h3>
        
        {!uploadedImage ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
              isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
            }`}
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
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <img
                src={uploadedImage.preview}
                alt="Uploaded artwork preview"
                className="w-20 h-16 object-cover rounded-lg"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{uploadedImage.file.name}</p>
                <p className="text-sm text-gray-500">
                  {(uploadedImage.file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
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
        )}
      </div>
    </div>
  );
}
