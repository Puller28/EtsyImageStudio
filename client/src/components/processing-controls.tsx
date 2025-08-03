import { useState } from "react";
import { Play, Check, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ProcessingControlsProps {
  onStartProcessing: (options: { upscaleOption: "2x" | "4x" }) => void;
  disabled?: boolean;
}

export default function ProcessingControls({ onStartProcessing, disabled }: ProcessingControlsProps) {
  const [upscaleOption, setUpscaleOption] = useState<"2x" | "4x">("2x");

  const printFormats = [
    "4x5 (8x10)",
    "3x4 (18x24)",
    "2x3 (12x18)",
    "11x14",
    "A4 (ISO)"
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          <Settings className="inline w-5 h-5 text-primary mr-2" />
          Processing Options
        </h3>
        
        {/* Upscaling Options */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Image Upscaling</h4>
          <RadioGroup value={upscaleOption} onValueChange={(value) => setUpscaleOption(value as "2x" | "4x")}>
            <div className="grid grid-cols-2 gap-3">
              <Label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="2x" className="text-primary" />
                <div className="ml-3">
                  <span className="block font-medium text-gray-900">2x Upscale</span>
                  <span className="block text-sm text-gray-500">Recommended</span>
                </div>
              </Label>
              <Label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="4x" className="text-primary" />
                <div className="ml-3">
                  <span className="block font-medium text-gray-900">4x Upscale</span>
                  <span className="block text-sm text-gray-500">Higher quality</span>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Print Formats */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Print Formats</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {printFormats.map((format) => (
              <div key={format} className="flex items-center p-2 bg-gray-50 rounded text-sm">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                {format}
              </div>
            ))}
          </div>
        </div>

        <div style={{background: 'blue', color: 'white', padding: '5px', marginBottom: '10px', fontSize: '12px'}}>
          DEBUG PROCESSING: upscaleOption={upscaleOption}, disabled={disabled?.toString()}
        </div>
        <Button
          onClick={(e) => {
            console.log("🔵 PROCESSING CONTROLS: Start Processing clicked!", {
              upscaleOption,
              disabled,
              event: e,
              timestamp: new Date().toISOString()
            });
            e.preventDefault();
            e.stopPropagation();
            onStartProcessing({ upscaleOption });
          }}
          onMouseEnter={() => console.log("🟢 Processing button hover detected")}
          disabled={disabled}
          className="w-full"
          size="lg"
        >
          <Play className="w-4 h-4 mr-2" />
          Start Processing
        </Button>
      </div>
    </div>
  );
}
