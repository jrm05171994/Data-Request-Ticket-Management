import { requireAdmin } from "@/lib/auth";
import { getScoringConfig } from "@/lib/scoring/queries";
import { AppHeader } from "@/components/app-header";
import { ScoringConfigForm } from "@/components/admin/scoring-config-form";

export default async function AdminScoringPage() {
  await requireAdmin();
  const { data: config, error } = await getScoringConfig();

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold text-slate-900">Scoring Configuration</h1>
          <p className="mt-1 text-sm text-slate-600">
            Tune the priority formula. Saving rescores and re-ranks every open ticket
            automatically.
          </p>
        </div>

        {error || !config ? (
          <div className="mt-6 rounded-2xl bg-koda-coral-50 p-4 text-sm text-koda-coral-700">
            Could not load scoring config: {error?.message ?? "missing row"}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <ScoringConfigForm
              defaults={{
                weight_stakeholder: Number(config.weight_stakeholder),
                weight_deadline_bonus: Number(config.weight_deadline_bonus),
                weight_requester_priority: Number(config.weight_requester_priority),
                weight_request_type: Number(config.weight_request_type),
                deadline_tier_7d: Number(config.deadline_tier_7d),
                deadline_tier_14d: Number(config.deadline_tier_14d),
                deadline_tier_30d: Number(config.deadline_tier_30d),
                deadline_tier_30d_plus: Number(config.deadline_tier_30d_plus),
              }}
            />
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            How the formula works
          </h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>
              <strong>Stakeholder:</strong> external requests get the full stakeholder
              weight; internal requests get 0.
            </p>
            <p>
              <strong>Deadline bonus:</strong> only applied to external requests with a
              hard deadline. The bonus tier is chosen by days-until-deadline.
            </p>
            <p>
              <strong>Requester priority:</strong> scales the priority weight linearly —
              1 → 20%, 2 → 44%, 3 → 68%, 4 → 88%, 5 → 100%.
            </p>
            <p>
              <strong>Request type:</strong> Risk Scoring 100%, New Dashboard 84%,
              New Visual 68%, New Analysis 52%, Update 32%, Other 16% of the request
              type weight.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
