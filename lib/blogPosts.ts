export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  content: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "how-to-stop-overspending-before-payday",
    title: "How to Stop Overspending Before Payday",
    description:
      "Simple ways to protect your money, avoid impulse spending, and know what you can safely spend before your next paycheck.",
    date: "2026-04-27",
    readTime: "4 min read",
    category: "Spending Control",
    content: [
      "Overspending usually happens when your real available money is unclear. You may know your account balance, but that number does not always show what is already spoken for.",
      "A safer approach is to separate your money into income, bills, required expenses, savings, debt payments, and flexible spending. Once those are accounted for, your safe-to-spend number becomes much clearer.",
      "Before making a purchase, pause and ask: Will this affect groceries, bills, gas, debt payments, or my emergency buffer? If the answer is yes, the purchase may need to wait.",
      "SafeSpend AI helps by turning everyday money activity into clear financial entries and showing whether a spending decision keeps you on track or creates pressure before payday.",
    ],
  },
  {
    slug: "what-is-safe-to-spend",
    title: "What Does Safe-to-Spend Mean?",
    description:
      "Safe-to-spend is the amount you can use without risking bills, essentials, savings goals, or weekly spending limits.",
    date: "2026-04-27",
    readTime: "3 min read",
    category: "Budgeting Basics",
    content: [
      "Your bank balance only tells you how much money is currently in the account. It does not tell you what money is already needed for bills, groceries, transportation, debt, or savings.",
      "Safe-to-spend is a more useful number because it looks at what is left after your important obligations are considered.",
      "For example, if you have $500 in your account but $300 in upcoming bills, your true flexible amount is much lower than your balance suggests.",
      "The goal is not to make spending feel restrictive. The goal is to give you confidence before you spend.",
    ],
  },
  {
    slug: "paycheck-budgeting-for-beginners",
    title: "Paycheck Budgeting for Beginners",
    description:
      "A simple paycheck budgeting method for people who want to track income, bills, spending, and savings without getting overwhelmed.",
    date: "2026-04-27",
    readTime: "5 min read",
    category: "Paycheck Planning",
    content: [
      "Paycheck budgeting means planning around the money you actually receive, not just a monthly estimate.",
      "Start by listing your income for the pay period. Then subtract fixed bills, expected essentials, debt payments, savings, and any important upcoming expenses.",
      "The amount left becomes your flexible spending pool. This is the money that can cover dining, shopping, personal items, entertainment, and other non-essential spending.",
      "SafeSpend AI is designed for this kind of real-life spending. You can log what happened, check purchases before buying, and see how each decision affects your safe-to-spend amount.",
    ],
  },
  {
    slug: "how-to-budget-when-money-is-tight",
    title: "How to Budget When Money Is Tight",
    description:
      "A practical guide for protecting essentials, reducing stress, and making better spending decisions when cash is limited.",
    date: "2026-04-28",
    readTime: "4 min read",
    category: "Budgeting Basics",
    content: [
      "When money is tight, the first goal is not perfection. The first goal is clarity.",
      "Start by identifying essentials: housing, utilities, food, transportation, required debt payments, and urgent bills.",
      "Then separate flexible spending from required spending. Flexible spending is where small changes can quickly reduce pressure.",
      "SafeSpend AI can help by showing how every transaction affects your safe-to-spend number before the next paycheck.",
    ],
  },
];