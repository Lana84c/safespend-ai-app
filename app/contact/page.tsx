import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-6 py-8 text-[#102033]">
      <section className="mx-auto max-w-6xl">
        <SiteHeader />

        <section className="mb-8 rounded-[2.25rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl md:p-12">
          <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
            Contact SafeSpend AI
          </p>

          <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
            Questions, feedback, or support?
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/82">
            We are currently in soft-launch testing. Use this page to reach out,
            share feedback, report issues, or ask questions about SafeSpend AI.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:support@safespendai.com?subject=SafeSpend%20AI%20Support%20Request"
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-base font-black text-[#061b3d] shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              Email Support →
            </a>

            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 text-base font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              Start Free
            </Link>
          </div>
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
            <p className="mb-3 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
              Contact
            </p>

            <h2 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
              Reach us by email.
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              For support, feedback, account questions, or product suggestions,
              send an email using the button below.
            </p>

            <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                Support Email
              </p>

              <a
                href="mailto:support@safespendai.com"
                className="mt-2 block break-all text-xl font-black text-[#061b3d]"
              >
                support@safespendai.com
              </a>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Replace this with your real support email if you are using a
                different address.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
            <h2 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
              Helpful things to include
            </h2>

            <div className="mt-5 grid gap-3">
              <InfoRow text="What page you were on when the issue happened." />
              <InfoRow text="What you expected SafeSpend to do." />
              <InfoRow text="What actually happened." />
              <InfoRow text="Whether you were using mobile, tablet, or desktop." />
              <InfoRow text="A screenshot, if you are reporting a visual issue." />
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
          <p className="mb-3 inline-flex rounded-full bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-700">
            Soft-launch feedback
          </p>

          <h2 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
            Help improve SafeSpend.
          </h2>

          <p className="mt-4 max-w-4xl leading-7 text-slate-600">
            If you are part of the early test audience, the most helpful
            feedback is honest and specific. Tell us what felt useful, what felt
            confusing, what you expected to happen, and whether SafeSpend helped
            you feel more aware of your spending.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FeedbackCard
              title="What worked?"
              description="Tell us which feature felt useful or made spending easier to understand."
            />

            <FeedbackCard
              title="What confused you?"
              description="Tell us where you got stuck, hesitated, or were unsure what to do next."
            />

            <FeedbackCard
              title="What would you pay for?"
              description="Tell us which feature would make SafeSpend valuable enough to upgrade."
            />
          </div>
        </section>

        <section className="rounded-[2rem] bg-gradient-to-br from-[#061b3d] via-[#0b4edb] to-[#00b7c7] p-8 text-center text-white shadow-2xl">
          <h2 className="text-4xl font-black tracking-[-0.05em]">
            Ready to try SafeSpend?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Create a free account and start tracking your safe-to-spend number.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 font-black text-[#061b3d] shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              Start Free →
            </Link>

            <Link
              href="/blog"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              Read Blog
            </Link>
          </div>
        </section>

        <SiteFooter />
      </section>
    </main>
  );
}

function SiteHeader() {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <Link href="/" className="flex items-center gap-4">
        <img
          src="/safespend-logo.png"
          alt="SafeSpend AI logo"
          className="h-14 w-14 rounded-2xl shadow-lg"
        />

        <div>
          <h1 className="text-2xl font-black text-[#061b3d]">
            SafeSpend AI
          </h1>
          <p className="text-sm text-slate-500">
            Know what you can spend before you spend it.
          </p>
        </div>
      </Link>

      <nav className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Home
        </Link>

        <Link
          href="/about"
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          About
        </Link>

        <Link
          href="/blog"
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Blog
        </Link>

        <Link
          href="/login"
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Log In
        </Link>

        <Link
          href="/signup"
          className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          Start Free
        </Link>
      </nav>
    </header>
  );
}

function InfoRow({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="mt-1 h-5 w-5 rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c]" />
      <p className="text-sm font-bold leading-6 text-slate-700">{text}</p>
    </div>
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
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <h3 className="text-xl font-black text-[#061b3d]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-8 text-center text-sm text-slate-500">
      <p>
        SafeSpend AI is a spending-awareness tool, not financial, legal, tax, or
        investment advice.
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-4">
        <Link href="/about" className="font-bold text-[#061b3d]">
          About
        </Link>

        <Link href="/contact" className="font-bold text-[#061b3d]">
          Contact
        </Link>

        <Link href="/privacy" className="font-bold text-[#061b3d]">
          Privacy Policy
        </Link>

        <Link href="/terms" className="font-bold text-[#061b3d]">
          Terms
        </Link>

        <Link href="/disclaimer" className="font-bold text-[#061b3d]">
          Disclaimer
        </Link>

        <Link href="/blog" className="font-bold text-[#061b3d]">
          Blog
        </Link>
      </div>
    </footer>
  );
}