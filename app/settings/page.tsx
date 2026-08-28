import { getArrivalBufferRules } from "@/lib/data/arrivalRules";
import { ArrivalRulesEditor } from "@/components/settings/ArrivalRulesEditor";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const rules = await getArrivalBufferRules();

  return (
    <>
      <h1 className="font-display font-semibold text-[28px] leading-tight text-ink">Settings</h1>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display font-semibold text-[18px] text-ink">Arrival buffer rules</h2>
          <p className="text-[13px] text-muted-text mt-1 leading-relaxed">
            When an entry doesn&rsquo;t state an arrival time, these defaults fill it in — a category rule beats
            the general default; you can always edit a single entry&rsquo;s arrival time by hand.
          </p>
        </div>
        <ArrivalRulesEditor rules={rules} />
      </section>
    </>
  );
}
