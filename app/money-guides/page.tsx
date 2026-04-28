import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import { blogPosts } from "@/lib/blogPosts";

export default function MoneyGuidesPage() {
  return (
    <PublicShell>
      <section className="rounded-[2.25rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl md:p-12">
        <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
          Money Guides
        </p>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
          Practical guides for better spending decisions.
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
          Simple, clear money guides for paycheck planning, budgeting,
          overspending recovery, and safe-to-spend awareness.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <p className="mb-3 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-cyan-700">
              {post.category}
            </p>

            <h2 className="text-2xl font-black text-[#061b3d]">
              {post.title}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {post.description}
            </p>

            <p className="mt-5 text-xs font-bold text-slate-500">
              {post.readTime}
            </p>
          </Link>
        ))}
      </section>
    </PublicShell>
  );
}