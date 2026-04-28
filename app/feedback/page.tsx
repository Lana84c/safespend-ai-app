import PublicShell from "@/components/PublicShell";

export default function FeedbackPage() {
  return (
    <PublicShell>
      <section className="rounded-[2.25rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl md:p-12">
        <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
          SafeSpend AI Feedback
        </p>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
          Help us improve SafeSpend AI.
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
          Thank you for helping test SafeSpend AI. Please use the app like a
          real person managing everyday spending, then send honest feedback on
          what worked, what confused you, and what would make it more useful.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-base font-black text-[#061b3d] shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
          >
            Start Testing →
          </a>

          <a
            href="mailto:support@safespendai.com?subject=SafeSpend%20AI%20Feedback"
            className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 text-base font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            Email Feedback
          </a>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
        <p className="mb-3 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
          Tester Checklist
        </p>

        <h2 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
          Please test these steps.
        </h2>

        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          This checklist helps us understand whether SafeSpend is clear,
          useful, and working correctly across the full user experience.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <ChecklistItem number="1" text="Visit the homepage." />
          <ChecklistItem number="2" text="Click Start Free." />
          <ChecklistItem number="3" text="Create an account." />
          <ChecklistItem
            number="4"
            text="Complete any setup or onboarding prompts."
          />
          <ChecklistItem number="5" text="Add one income transaction." />
          <ChecklistItem number="6" text="Add at least three expenses." />
          <ChecklistItem number="7" text="Add one budget limit." />
          <ChecklistItem number="8" text="Add one bill." />
          <ChecklistItem
            number="9"
            text='Ask the AI Coach: “Can I spend $50 on dinner?”'
          />
          <ChecklistItem number="10" text="Review the dashboard." />
          <ChecklistItem number="11" text="Review reports." />
          <ChecklistItem number="12" text="Visit the billing page." />
          <ChecklistItem number="13" text="Log out and log back in." />
          <ChecklistItem number="14" text="Try it on mobile." />
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
          <p className="mb-3 inline-flex rounded-full bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-700">
            Feedback Questions
          </p>

          <h2 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
            What should testers answer?
          </h2>

          <div className="mt-5 grid gap-3">
            <QuestionItem text="What was easy?" />
            <QuestionItem text="What was confusing?" />
            <QuestionItem text="Did anything break?" />
            <QuestionItem text="Did the dashboard make sense?" />
            <QuestionItem text="Did the AI Coach give helpful guidance?" />
            <QuestionItem text="Would you use this again?" />
            <QuestionItem text="What would make it worth paying for?" />
            <QuestionItem text="What feature feels missing?" />
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
          <p className="mb-3 inline-flex rounded-full bg-yellow-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-yellow-700">
            Helpful Details
          </p>

          <h2 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
            What should they include?
          </h2>

          <div className="mt-5 grid gap-3">
            <QuestionItem text="Device used: phone, tablet, or desktop." />
            <QuestionItem text="Browser used: Chrome, Safari, Edge, etc." />
            <QuestionItem text="Page where the issue happened." />
            <QuestionItem text="What they expected to happen." />
            <QuestionItem text="What actually happened." />
            <QuestionItem text="Screenshot, if possible." />
          </div>

          <a
            href="mailto:support@safespendai.com?subject=SafeSpend%20AI%20Feedback"
            className="mt-6 inline-flex rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Send Feedback →
          </a>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] bg-gradient-to-br from-[#061b3d] via-[#0b4edb] to-[#00b7c7] p-8 text-center text-white shadow-2xl">
        <h2 className="text-4xl font-black tracking-[-0.05em]">
          Thank you for testing SafeSpend AI.
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-white/80">
          Honest feedback helps us build a better spending-awareness tool for
          real-life paycheck planning, budgeting, bills, and daily money
          decisions.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 font-black text-[#061b3d] shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
          >
            Start Testing →
          </a>

          <a
            href="/blog"
            className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            Read Money Tips
          </a>
        </div>
      </section>
    </PublicShell>
  );
}

function ChecklistItem({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-sm font-black text-white">
        {number}
      </div>

      <p className="pt-1 text-sm font-bold leading-6 text-slate-700">{text}</p>
    </div>
  );
}

function QuestionItem({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c]" />
      <p className="text-sm font-bold leading-6 text-slate-700">{text}</p>
    </div>
  );
}