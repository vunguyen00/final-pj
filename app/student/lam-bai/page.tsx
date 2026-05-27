import Link from "next/link";
import { LANGUAGES, getLanguageSkills } from "@/app/components/learningMarketplace";
import { requireRole } from "@/lib/auth";

const statuses = ["Recommended", "Unfinished", "Completed", "Saved"];
const filters = ["Difficulty", "Topic", "Duration", "Exam type"];

export default async function StudentLamBaiPage() {
  const user = await requireRole("STUDENT");

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl space-y-6 px-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Practice studio</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Choose a language skill to practice</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Hi {user.username}, pick a language tab, then choose dynamic skill practice by exam, topic, duration, and difficulty.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {LANGUAGES.map((language, index) => (
              <a
                key={language}
                href={`#${language.toLowerCase()}`}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${index === 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                {language}
              </a>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {filters.map((filter) => (
              <button key={filter} type="button" className="rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {filter}
                <span className="mt-1 block text-xs font-normal text-slate-500">All</span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/student/speaking-ai" className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Speaking AI</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Cham speaking</h2>
            <p className="mt-2 text-sm text-slate-600">Tru 7 diem, luu audio va feedback nhu giam khao.</p>
          </Link>
          <Link href="/student/writing-ai" className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Writing AI</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Cham writing</h2>
            <p className="mt-2 text-sm text-slate-600">Tru 3 diem, co band, loi sai, sample answer.</p>
          </Link>
          <Link href="/student/results" className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">History</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Lich su ket qua</h2>
            <p className="mt-2 text-sm text-slate-600">Xem lai test, speaking, writing va tien bo hoc tap.</p>
          </Link>
        </section>

        {LANGUAGES.map((language) => (
          <section key={language} id={language.toLowerCase()} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">{language}</h2>
                <p className="mt-1 text-sm text-slate-500">Skills adapt by language and exam system.</p>
              </div>
              <Link href={`/courses?language=${encodeURIComponent(language)}&type=Skill+training`} className="text-sm font-semibold text-blue-600">
                Find skill courses
              </Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {getLanguageSkills(language).map((skill, index) => (
                <article key={skill} className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{language}</p>
                      <h3 className="mt-2 text-lg font-bold text-slate-950">{skill}</h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {statuses[index % statuses.length]}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
                    <div className="rounded-lg bg-slate-50 p-2">15 min</div>
                    <div className="rounded-lg bg-slate-50 p-2">B1</div>
                    <div className="rounded-lg bg-slate-50 p-2">{index % 2 === 0 ? "Exam" : "Topic"}</div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${25 + index * 9}%` }} />
                  </div>
                  <button type="button" className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
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
