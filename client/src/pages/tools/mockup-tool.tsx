import { MockupPage } from "@/pages/mockup-page";

export default function MockupToolPage() {
  return (
    <div className="bg-slate-900/60 text-slate-100">
      <MockupPage showChrome={false} />
    </div>
  );
}
