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
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-6 py-10 text-[#102033]">
      <article className="mx-auto max-w-4xl">
        <Link
          href="/blog"
          className="mb-6 inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d] shadow-sm"
        >
          ← Back to Blog
        </Link>

        <header className="rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl">
          <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest">
            {post.category}
          </p>

          <h1 className="text-4xl font-black leading-[0.98] tracking-[-0.05em] md:text-6xl">
            {post.title}
          </h1>

          <p className="mt-5 max-w-2xl text-white/80">{post.description}</p>

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

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg"
              >
                Open Dashboard
              </Link>

              <Link
                href="/billing"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
              >
                View Plans
              </Link>
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}