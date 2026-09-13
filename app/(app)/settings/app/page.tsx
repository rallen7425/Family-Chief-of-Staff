import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AppSettingsPage() {
  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/settings" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[22px] leading-tight text-ink">Settings</h1>
      </div>
      <p className="text-[12.5px] text-muted-label leading-relaxed">
        App settings will live here.
      </p>
    </>
  );
}
