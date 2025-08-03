import { useState } from "react";
import { Image } from "lucide-react";

interface MockupTemplate {
  id: string;
  name: string;
  imageUrl: string;
}

interface MockupTemplatesProps {
  onSelectTemplate: (template: string) => void;
  selectedTemplate?: string;
}

export default function MockupTemplates({ onSelectTemplate, selectedTemplate }: MockupTemplatesProps) {
  const templates: MockupTemplate[] = [
    {
      id: "living-room",
      name: "Living Room",
      imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250"
    },
    {
      id: "bedroom",
      name: "Bedroom",
      imageUrl: "https://images.unsplash.com/photo-1631947430066-48c30d57b943?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250"
    },
    {
      id: "office",
      name: "Office",
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250"
    },
    {
      id: "kitchen",
      name: "Kitchen",
      imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250"
    },
    {
      id: "hallway",
      name: "Hallway",
      imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250"
    },
    {
      id: "gallery",
      name: "Gallery Wall",
      imageUrl: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250"
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          <Image className="inline w-5 h-5 text-primary mr-2" />
          Choose Mockup Template
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`group cursor-pointer ${
                selectedTemplate === template.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => onSelectTemplate(template.id)}
            >
              <div className="aspect-w-16 aspect-h-10 bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary">
                <img
                  src={template.imageUrl}
                  alt={`${template.name} mockup`}
                  className="w-full h-32 object-cover"
                />
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">{template.name}</p>
              <p className="text-xs text-gray-500">5 different mockups included</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
