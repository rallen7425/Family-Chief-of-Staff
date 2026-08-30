import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getArrivalBufferRules } from "@/lib/data/arrivalRules";
import { ArrivalRulesEditor } from "@/components/settings/ArrivalRulesEditor";

export const dynamic = "force-dynamic";

export default async function ArrivalSettingsPage() {
  const rules = await getArrivalBufferRules();

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Link href="/family" aria-label="Back" className="text-ink hover:text-primary transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display font-semibold text-[24px] leading-tight text-ink">
          Arrival buffer rules
        </h1>
      </div>

      <section className="flex flex-col gap-3">
        <p className="text-[13px] text-muted-text leading-relaxed">
          When an entry doesn&rsquo;t state an arrival time, these defaults fill it in — a category rule beats
          the general default; you can always edit a single entry&rsquo;s arrival time by hand.
        </p>
        <ArrivalRulesEditor rules={rules} />
      </section>
    </>
  );
}
