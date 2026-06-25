"use client";

export default function BudgetBar({
  budgetUsato,
  budgetMax,
  budgetResiduo,
}: {
  budgetUsato: number;
  budgetMax: number;
  budgetResiduo: number;
}) {
  return (
    <section className="mb-3 grid grid-cols-2 gap-3 rounded-2xl border border-slate-700/70 bg-[#101a2d] p-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Budget
        </p>
        <p className="mt-1 text-2xl font-black text-white">
          {budgetUsato}/{budgetMax}
        </p>
      </div>

      <div className="text-right">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Crediti residui
        </p>
        <p
          className={`mt-1 text-2xl font-black ${
            budgetResiduo < 0 ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {budgetResiduo}
        </p>
      </div>
    </section>
  );
}