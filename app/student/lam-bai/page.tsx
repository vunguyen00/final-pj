import Link from "next/link";
import { LANGUAGES, getLanguageSkills } from "@/app/components/learningMarketplace";
import { requireRole } from "@/lib/auth";

const statuses = ["Recommended", "Unfinished", "Completed", "Saved"];
const filters = ["Difficulty", "Topic", "Duration", "Exam type"];

export default async function StudentLamBaiPage() {
  const user = await requireRole("STUDENT");

  return (
    <main className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Practice studio</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Choose a language skill to practice</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            Hi {user.username}, pick a language tab, then choose dynamic skill practice by exam, topic, duration, and difficulty.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {LANGUAGES.map((language, index) => (
              <a
                key={language}
                href={`#${language.toLowerCase()}`}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${index === 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}
              >
                {language}
              </a>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {filters.map((filter) => (
              <button key={filter} type="button" className="rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                {filter}
                <span className="mt-1 block text-xs font-normal text-slate-500">All</span>
              </button>
            ))}
          </div>
        </section>

        {LANGUAGES.map((language) => (
          <section key={language} id={language.toLowerCase()} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">{language}</h2>
                <p className="mt-1 text-sm text-slate-500">Skills adapt by language and exam system.</p>
              </div>
              <Link href={`/courses?language=${encodeURIComponent(language)}&type=Skill+training`} className="text-sm font-semibold text-blue-600">
                Find skill courses
              </Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {getLanguageSkills(language).map((skill, index) => (
                <article key={skill} className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:shadow-sm dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{language}</p>
                      <h3 className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{skill}</h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {statuses[index % statuses.length]}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">15 min</div>
                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">B1</div>
                    <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">{index % 2 === 0 ? "Exam" : "Topic"}</div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${25 + index * 9}%` }} />
                  </div>
                  <button type="button" className="mt-4 w-full rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
                    Start practice
                  </button>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
