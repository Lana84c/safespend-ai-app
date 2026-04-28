import PublicShell from "@/components/PublicShell";

export default function FeedbackPage() {
  return (
    <PublicShell>
      <section className="rounded-[2.25rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl md:p-12">
        <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
          SafeSpend Feedback
        </p>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
          Help us improve SafeSpend AI.
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
          If you are part of the early test audience, your feedback helps shape
          what SafeSpend becomes next.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <FeedbackCard
          title="What worked?"
          description="Tell us which feature felt useful, clear, or worth keeping."
        />

        <FeedbackCard
          title="What confused you?"
          description="Tell us where you got stuck or were unsure what to do."
        />

        <FeedbackCard
          title="What would you pay for?"
          description="Tell us which feature would make SafeSpend worth upgrading."
        />
      </section>

      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
        <h2 className="text-3xl font-black text-[#061b3d]">
          Send feedback by email
        </h2>

        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          For now, send feedback by email. Include what device you used, what
          page you were on, and what you expected to happen.
        </p>

        <a
          href="mailto:support@safespendai.com?subject=SafeSpend%20AI%20Feedback"
          className="mt-6 inline-flex rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg"
        >
          Email Feedback →
        </a>
      </section>
    </PublicShell>
  );
}

function FeedbackCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <h2 className="text-2xl font-black text-[#061b3d]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}