export const courses = [
  { id: "criminal-law", code: "LAW 2101", title: "Criminal Law I", topics: 7, progress: 86, current: "Elements of a Crime" },
  { id: "evidence-law", code: "LAW 2102", title: "Evidence Law I", topics: 6, progress: 65, current: "Hearsay Rule Exceptions" },
  { id: "torts", code: "LAW 2103", title: "Law of Torts", topics: 6, progress: 45, current: "Negligence" },
  { id: "constitutional", code: "LAW 2104", title: "Constitutional Law", topics: 8, progress: 34, current: "Separation of Powers" },
];

export const topics = [
  { number: 1, title: "Introduction to Criminal Law", progress: 100, icon: "▣" },
  { number: 2, title: "Elements of a Crime: Actus Reus & Mens Rea", progress: 75, icon: "⚖" },
  { number: 3, title: "Homicide: Murder and Manslaughter", progress: 40, icon: "§" },
  { number: 4, title: "Inchoate Offences: Attempt, Conspiracy, Incitement", progress: 10, icon: "◇" },
  { number: 5, title: "Defences: Insanity, Intoxication, Duress", progress: 0, icon: "⌁" },
  { number: 6, title: "Participation and Complicity", progress: 0, icon: "◎" },
  { number: 7, title: "Sentencing Principles", progress: 0, icon: "▤" },
];

export const cases = [
  { id: "larsonneur", category: "Actus Reus", title: "R v Larsonneur", citation: "[1933] 24 Cr App R 74", principle: "The accused may be liable where the prohibited state of affairs exists even without a voluntary act.", leading: true },
  { id: "smith", category: "Mens Rea", title: "DPP v Smith", citation: "[1961] AC 290", principle: "Historical authority on the objective approach to intention, later altered by statute.", leading: true },
  { id: "cunningham", category: "Mens Rea", title: "R v Cunningham", citation: "[1957] 2 QB 396", principle: "Recklessness requires awareness of a risk and an unreasonable decision to take it.", leading: true },
  { id: "sweet", category: "Strict Liability", title: "Sweet v Parsley", citation: "[1970] AC 132", principle: "Courts presume that mens rea is required unless Parliament clearly indicates otherwise.", leading: true },
  { id: "woollin", category: "Homicide", title: "R v Woollin", citation: "[1999] 1 AC 82", principle: "A jury may find intention where death or serious injury was virtually certain and appreciated as such.", leading: true },
];

export const threads = [
  { title: "Burden of proof in self-defence?", author: "Maria S.", replies: 5, preview: "When does the evidential burden shift to the accused?", time: "18 min" },
  { title: "Mens rea for attempted murder", author: "John D.", replies: 12, preview: "Can foresight of serious injury be enough for an attempt charge?", time: "1 hr" },
  { title: "Best way to brief a case", author: "Amina K.", replies: 8, preview: "I am trying to separate the ratio from obiter in longer judgments.", time: "3 hrs" },
];
