import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Eye } from "lucide-react";
import JSZip from "jszip";

interface GeneratedMockup {
  template: {
    room: string;
    id: string;
    name: string;
  };
  image_data: string;
}

interface MockupResultsProps {
  mockups: GeneratedMockup[];
  onReset: () => void;
}

export function MockupResults({ mockups, onReset }: MockupResultsProps) {
  const [selectedMockup, setSelectedMockup] = useState<GeneratedMockup | null>(null);

  const downloadSingle = (mockup: GeneratedMockup) => {
    const link = document.createElement("a");
    link.href = mockup.image_data;
    link.download = `${mockup.template.name}_mockup.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    
    for (const mockup of mockups) {
      // Convert base64 to blob
      const base64Data = mockup.image_data.split(',')[1];
      const binaryData = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(binaryData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
      }
      
      zip.file(`${mockup.template.name}_mockup.png`, arrayBuffer);
    }
    
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "mockups.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Your Generated Mockups
            <Badge variant="outline">{mockups.length} mockups created</Badge>
          </CardTitle>
          <CardDescription>
            Professional mockups with your artwork perfectly placed. Download individual mockups or get all as a ZIP file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            <Button 
              onClick={downloadAll}
              variant="default"
              data-testid="button-download-all"
            >
              <Download className="h-4 w-4 mr-2" />
              Download All ({mockups.length} files)
            </Button>
            <Button 
              onClick={onReset}
              variant="outline"
              data-testid="button-generate-more"
            >
              Generate More Mockups
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockups.map((mockup, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="aspect-square relative bg-gray-100">
                  <img
                    src={mockup.image_data}
                    alt={`${mockup.template.name} mockup`}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedMockup(mockup)}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMockup(mockup);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{mockup.template.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {mockup.template.room.replace('_', ' ')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadSingle(mockup)}
                      data-testid={`button-download-${index}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full-size preview modal */}
      {selectedMockup && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMockup(null)}
        >
          <div className="max-w-4xl max-h-full">
            <img
              src={selectedMockup.image_data}
              alt={`${selectedMockup.template.name} mockup - full size`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}