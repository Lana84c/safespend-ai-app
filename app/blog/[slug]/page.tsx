import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/blogPosts";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;

  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    return {
      title: "Blog Post Not Found | SafeSpend AI",
    };
  }

  return {
    title: `${post.title} | SafeSpend AI`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-6 py-8 text-[#102033]">
      <section className="mx-auto max-w-6xl">
        <SiteHeader />

        <article className="mx-auto max-w-4xl">
          <Link
            href="/blog"
            className="mb-6 inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            ← Back to Blog
          </Link>

          <header className="rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl md:p-10">
            <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest">
              {post.category}
            </p>

            <h1 className="text-4xl font-black leading-[0.98] tracking-[-0.05em] md:text-6xl">
              {post.title}
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
              {post.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-white/75">
              <span>{post.date}</span>
              <span>•</span>
              <span>{post.readTime}</span>
            </div>
          </header>

          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
            <div className="space-y-6 text-lg leading-8 text-slate-700">
              {post.content.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-10 rounded-[2rem] bg-gradient-to-r from-[#eefbff] to-[#f4fff6] p-6">
              <h2 className="text-2xl font-black text-[#061b3d]">
                Want help checking your spending?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use SafeSpend AI to log income, track expenses, review category
                pressure, and check whether a purchase fits your safe-to-spend
                amount.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Start Free →
                </Link>

                <Link
                  href="/billing"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d] transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </section>
        </article>

        <section className="mx-auto mt-8 max-w-4xl rounded-[2rem] bg-gradient-to-br from-[#061b3d] via-[#0b4edb] to-[#00b7c7] p-8 text-center text-white shadow-2xl">
          <h3 className="text-4xl font-black tracking-[-0.05em]">
            Start with clarity today.
          </h3>

          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Create your free account, add your first transaction, and see your
            safe-to-spend number in minutes.
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

function SiteFooter() {
  return (
    <footer className="mt-8 text-center text-sm text-slate-500">
      <p>
        SafeSpend AI is a spending-awareness tool, not financial, legal, tax, or
        investment advice.
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
  );
}