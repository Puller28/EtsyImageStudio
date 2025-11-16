import { CheckCircle2 } from "lucide-react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FirstListingMissionCard() {
  const { state } = useOnboarding();
  const checklist = state.checklist;
  const allDone = checklist.uploadArtwork && checklist.generateListingBundle && checklist.downloadFirstImages && checklist.createFirstEtsyListing;

  const items: { key: keyof typeof checklist; label: string }[] = [
    { key: "uploadArtwork", label: "Upload your first artwork" },
    { key: "generateListingBundle", label: "Generate a listing bundle" },
    { key: "downloadFirstImages", label: "Download your first images" },
    { key: "createFirstEtsyListing", label: "Create your first Etsy listing" },
  ];

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">First Listing Mission</CardTitle>
          {allDone && (
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
              <span>Ready to List 🎉</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Complete these 4 steps to get your first Etsy listing bundle out the door.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2 text-sm">
          {items.map((item) => {
            const done = checklist[item.key];
            return (
              <li key={item.key} className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border",
                    done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-gray-300 bg-white text-transparent"
                  )}
                >
                  <CheckCircle2 className="h-3 w-3" />
                </span>
                <span
                  className={cn(
                    "text-gray-700",
                    done && "line-through text-gray-400"
                  )}
                >
                  {item.label}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
