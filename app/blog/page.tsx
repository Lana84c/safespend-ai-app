import Link from "next/link";
import { blogPosts } from "@/lib/blogPosts";

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-6 py-10 text-[#102033]">
      <section className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm font-black uppercase tracking-widest text-cyan-700">
              SafeSpend AI Blog
            </p>

            <h1 className="text-5xl font-black tracking-[-0.05em] text-[#061b3d]">
              Smarter spending starts here.
            </h1>

            <p className="mt-4 max-w-2xl text-slate-600">
              Practical guides for paycheck budgeting, overspending recovery,
              safe-to-spend planning, and better everyday money decisions.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 text-center font-black text-white shadow-lg"
          >
            Open Dashboard
          </Link>
        </header>

        <section className="mb-8 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl">
          <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
            Spending Control + Financial Awareness
          </p>

          <h2 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.05em] md:text-6xl">
            Learn how to stop money from disappearing.
          </h2>

          <p className="mt-5 max-w-2xl text-white/80">
            SafeSpend helps you understand what you can spend before you spend
            it, so you can protect bills, reduce stress, and make better
            day-to-day decisions.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
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
      </section>
    </main>
  );
}