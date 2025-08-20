import { Download, FileArchive, Check, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";

interface DownloadItem {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "failed";
}

interface DownloadAssetsProps {
  items: DownloadItem[];
  onDownload: () => void;
  downloadReady: boolean;
  isPackaging?: boolean;
}

export default function DownloadAssets({ items, onDownload, downloadReady, isPackaging }: DownloadAssetsProps) {
  console.log("🎁 DownloadAssets render:", { downloadReady, isPackaging });
  
  const getIcon = (status: DownloadItem["status"]) => {
    switch (status) {
      case "completed":
        return <Check className="w-4 h-4 text-green-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />;
      case "failed":
        return <Clock className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          <Download className="inline w-5 h-5 text-primary mr-2" />
          Download Assets
        </h3>
        
        <div className="space-y-3 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{item.label}</span>
              {getIcon(item.status)}
            </div>
          ))}
        </div>
        
        <Button
          onClick={() => {
            // Track download initiation
            analytics.zipDownload(items.length);
            analytics.download('zip_package', 'zip');
            onDownload();
          }}
          disabled={!downloadReady || isPackaging}
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
        >
          {isPackaging ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Packaging...
            </>
          ) : (
            <>
              <FileArchive className="w-4 h-4 mr-2" />
              Download ZIP Package
            </>
          )}
        </Button>
        
        {!downloadReady && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Package will be ready when processing completes
          </p>
        )}
      </div>
    </div>
  );
}
