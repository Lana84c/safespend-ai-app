import Link from "next/link";

export default function LegalFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/70 px-4 py-8 text-center text-sm font-bold text-slate-500 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4">
        <p>
          SafeSpend AI is for budgeting, spending awareness, and personal money
          organization. It is not financial, legal, tax, investment, credit, or
          banking advice.
        </p>

        <div className="flex flex-wrap justify-center gap-4 text-xs font-black uppercase tracking-widest">
          <Link href="/privacy" className="hover:text-[#061b3d]">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[#061b3d]">
            Terms of Service
          </Link>
          <Link href="/disclaimer" className="hover:text-[#061b3d]">
            Disclaimer
          </Link>
          <Link href="/data-deletion" className="hover:text-[#061b3d]">
            Data Deletion
          </Link>
        </div>
      </div>
    </footer>
  );
}