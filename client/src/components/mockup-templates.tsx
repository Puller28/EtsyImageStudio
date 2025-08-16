import { Image } from "lucide-react";
import { Link } from "wouter";

interface MockupTemplatesProps {
  onSelectTemplate: (template: string) => void;
  selectedTemplate?: string;
}

export default function MockupTemplates({ onSelectTemplate, selectedTemplate }: MockupTemplatesProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          <Image className="inline w-5 h-5 text-primary mr-2" />
          Generate Mockups for Your Art
        </h3>
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            Upload your artwork and automatically generate mockups across 5 different room templates
          </p>
          <Link href="/template-mockups">
            <button className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200">
              Start Mockup Generation
            </button>
          </Link>
          <div className="mt-4 text-sm text-gray-500">
            <p className="font-medium">Available templates:</p>
            <p>Living Room • Bedroom • Study • Gallery • Kitchen</p>
          </div>
        </div>
      </div>
    </div>
  );
}
