import { useState } from "react";
import { Play, Settings, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { analytics } from "@/lib/analytics";
import { DEFAULT_PRINT_FORMAT_IDS, PRINT_FORMAT_OPTIONS, type PrintFormatId } from "@shared/print-formats";

interface ProcessingControlsProps {
  onStartProcessing: (options: { upscaleOption: "none" | "2x" | "4x"; selectedPrintFormats: PrintFormatId[] }) => void;
  disabled?: boolean;
}

export default function ProcessingControls({ onStartProcessing, disabled }: ProcessingControlsProps) {
  const [upscaleOption, setUpscaleOption] = useState<"none" | "2x" | "4x">("2x");
  const [selectedPrintFormats, setSelectedPrintFormats] = useState<PrintFormatId[]>(() => [...DEFAULT_PRINT_FORMAT_IDS]);

  const handleToggleFormat = (format: PrintFormatId, checked: boolean) => {
    setSelectedPrintFormats((current) => {
      if (checked) {
        return current.includes(format) ? current : [...current, format];
      }
      return current.filter((item) => item !== format);
    });
  };

  const handleSelectAllFormats = () => {
    setSelectedPrintFormats([...DEFAULT_PRINT_FORMAT_IDS]);
  };

  const noFormatsSelected = selectedPrintFormats.length === 0;

  return (
    <div className="bg-white rounded-lg shadow-sm w-full">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          <Settings className="inline w-5 h-5 text-primary mr-2" />
          Processing Options
        </h3>
        
        {/* Upscaling Options */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-4">Image Upscaling</h4>
          <RadioGroup value={upscaleOption} onValueChange={(value) => setUpscaleOption(value as "none" | "2x" | "4x")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              <Label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-300 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm transition-all">
                <RadioGroupItem value="none" className="text-primary mt-0.5" />
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-gray-900">No Upscale</span>
                    <Badge variant="secondary" className="text-xs">Free</Badge>
                  </div>
                  <span className="block text-xs text-gray-500">Use original resolution</span>
                </div>
              </Label>
              <Label className="relative flex items-start p-4 pt-6 border-2 border-primary rounded-lg cursor-pointer bg-primary/5 hover:bg-primary/10 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:shadow-md transition-all">
                <Badge className="absolute top-1 left-1/2 -translate-x-1/2 bg-amber-500 hover:bg-amber-600 text-white text-xs whitespace-nowrap px-2 py-0.5">
                  <Star className="h-3 w-3 mr-1" />
                  Best Value
                </Badge>
                <RadioGroupItem value="2x" className="text-primary mt-0.5" />
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-gray-900">2x Upscale</span>
                    <Badge variant="default" className="text-xs shrink-0">1 credit</Badge>
                  </div>
                  <span className="block text-xs text-primary font-medium">Recommended</span>
                </div>
              </Label>
              <Label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-300 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm transition-all">
                <RadioGroupItem value="4x" className="text-primary mt-0.5" />
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-gray-900">4x Upscale</span>
                    <Badge variant="default" className="text-xs">2 credits</Badge>
                  </div>
                  <span className="block text-xs text-gray-500">Maximum quality</span>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Print Formats */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900">Print Formats</h4>
              <p className="text-sm text-gray-500">
                Choose the dimensions we should prepare as high-resolution downloads.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAllFormats}
              disabled={selectedPrintFormats.length === DEFAULT_PRINT_FORMAT_IDS.length}
            >
              Select all
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRINT_FORMAT_OPTIONS.map((format) => {
              const isChecked = selectedPrintFormats.includes(format.id);
              return (
                <label
                  key={format.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                    isChecked ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/60"
                  }`}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(value) => handleToggleFormat(format.id, value === true)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{format.label}</div>
                    {format.notes && (
                      <div className="text-xs text-gray-500 mt-1">{format.notes}</div>
                    )}
                    <div className="text-[11px] text-gray-400 mt-1 uppercase tracking-wide">
                      {format.width} x {format.height} px @ 300 DPI
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          {noFormatsSelected && (
            <p className="mt-2 text-xs text-red-500">
              Select at least one print format to continue.
            </p>
          )}
        </div>

        <Button
          onClick={() => {
            // Track image processing start
            const creditsUsed = upscaleOption === "4x" ? 2 : upscaleOption === "2x" ? 1 : 0;
            analytics.imageProcess(upscaleOption, creditsUsed);
            analytics.funnelStep('image_processing_start', 2);
            
            onStartProcessing({ upscaleOption, selectedPrintFormats });
          }}
          disabled={disabled || noFormatsSelected}
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
