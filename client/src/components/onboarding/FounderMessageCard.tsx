import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STORAGE_KEY = "imageUpscaler_founder_message_dismissed_v1";

export function FounderMessageCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === "true";
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  return (
    <Card className="mb-4 border border-amber-200 bg-amber-50/80">
      <CardContent className="pt-4 pr-4 pb-4 flex gap-3">
        <div className="flex-1 text-sm text-amber-900">
          <p className="font-semibold mb-1">From Leon, the founder</p>
          <p className="mb-2">
            Hey, thanks for trying this!
          </p>
          <p className="mb-2">
            I built ImageUpscaler specifically for Etsy sellers who want faster, better listing images. If something feels
            confusing or you think a workflow could be improved, please tell me — I'm shaping the product based on
            feedback from sellers like you.
          </p>
          <p className="mb-1">
            I hope this helps speed up your shop workflow!
          </p>
          <p className="font-medium">— Leon 🙌</p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-amber-500 hover:bg-amber-100"
          aria-label="Dismiss founder message"
        >
          <X className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}
