import Link from "next/link";
import { blogPosts } from "@/lib/blogPosts";

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-6 py-8 text-[#102033]">
      <section className="mx-auto max-w-6xl">
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

        <section className="mb-8 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl md:p-10">
          <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
            SafeSpend AI Blog
          </p>

          <h2 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
            Smarter spending starts here.
          </h2>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
            Practical guides for paycheck budgeting, overspending recovery,
            safe-to-spend planning, and better everyday money decisions.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-base font-black text-[#061b3d] shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              Start Free →
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 text-base font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              Open Dashboard
            </Link>
          </div>
        </section>

        <section className="mb-8 grid gap-5 md:grid-cols-3">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <p className="mb-3 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-cyan-700">
                {post.category}
              </p>

              <h2 className="text-2xl font-black leading-tight text-[#061b3d]">
                {post.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {post.description}
              </p>

              <div className="mt-5 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>{post.date}</span>
                <span>{post.readTime}</span>
              </div>
            </Link>
          ))}
        </section>

        <section className="mb-8 rounded-[2rem] bg-gradient-to-br from-[#061b3d] via-[#0b4edb] to-[#00b7c7] p-8 text-center text-white shadow-2xl">
          <h3 className="text-4xl font-black tracking-[-0.05em]">
            Ready to check your safe-to-spend?
          </h3>

          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Use SafeSpend AI to track income, expenses, budgets, bills, reports,
            and smarter spending decisions.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 font-black text-[#061b3d] shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              Start Free →
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              Log In
            </Link>
          </div>
        </section>

        <footer className="mt-8 text-center text-sm text-slate-500">
          <p>
            SafeSpend AI is a spending-awareness tool, not financial, legal,
            tax, or investment advice.
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-4">
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
      </section>
    </main>
  );
}