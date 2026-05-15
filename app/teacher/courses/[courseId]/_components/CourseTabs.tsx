type CourseTabsProps = {
  activeTab: "modules" | "tests";
  moduleCount: number;
  testCount: number;
  onTabChange: (tab: "modules" | "tests") => void;
};

export function CourseTabs({ activeTab, moduleCount, testCount, onTabChange }: CourseTabsProps) {
  return (
    <div className="mt-6 border-b border-slate-200">
      <nav className="-mb-px flex gap-4">
        <button
          onClick={() => onTabChange("modules")}
          className={`border-b-2 px-1 py-4 text-sm font-medium ${activeTab === "modules" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Quan ly Module ({moduleCount})
        </button>
        <button
          onClick={() => onTabChange("tests")}
          className={`border-b-2 px-1 py-4 text-sm font-medium ${activeTab === "tests" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Quan ly Bai Test ({testCount})
        </button>
      </nav>
    </div>
  );
}
