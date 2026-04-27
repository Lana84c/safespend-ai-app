export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] text-[#102033]">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center gap-4">
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
        </div>

        <div className="grid gap-8 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl md:grid-cols-[1.2fr_.8fr] md:p-12">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
              AI Spending Coach + Dashboard
            </p>

            <h2 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-7xl">
              Stop overspending before it happens.
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
              SafeSpend AI helps users create an account, track income and
              expenses, check safe-to-spend, and make smarter spending decisions
              before money disappears.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="rounded-full bg-white px-6 py-3 font-black text-[#061b3d]"
              >
                Create Account
              </a>

              <a
                href="/login"
                className="rounded-full border border-white/30 bg-white/10 px-6 py-3 font-black text-white"
              >
                Log In
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/15 p-6 backdrop-blur">
            <p className="text-sm font-black uppercase tracking-widest text-white/70">
              Safe to Spend
            </p>

            <p className="mt-3 text-5xl font-black">$0</p>

            <p className="mt-4 inline-flex rounded-full bg-green-400/20 px-4 py-2 text-sm font-bold text-green-100">
              Create an account to begin
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}