import Link from "next/link";

export default function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-6 py-8 text-[#102033]">
      <section className="mx-auto max-w-6xl">
        <PublicHeader />
        {children}
        <PublicFooter />
      </section>
    </main>
  );
}

function PublicHeader() {
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

function PublicFooter() {
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