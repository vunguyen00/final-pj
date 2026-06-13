export type CourseTab = "information" | "modules" | "tests";

type CourseTabsProps = {
  activeTab: CourseTab;
  moduleCount: number;
  testCount: number;
  onTabChange: (tab: CourseTab) => void;
};

export function CourseTabs({
  activeTab,
  moduleCount,
  testCount,
  onTabChange,
}: CourseTabsProps) {
  const tabClass = (tab: CourseTab) =>
    `border-b-2 px-1 py-4 text-sm font-medium ${
      activeTab === tab
        ? "border-slate-900 text-slate-900"
        : "border-transparent text-slate-500 hover:text-slate-700"
    }`;

  return (
    <div className="mt-6 border-b border-slate-200">
      <nav className="-mb-px flex flex-wrap gap-x-6">
        <button
          type="button"
          onClick={() => onTabChange("information")}
          className={tabClass("information")}
        >
          Chỉnh sửa thông tin
        </button>
        <button
          type="button"
          onClick={() => onTabChange("modules")}
          className={tabClass("modules")}
        >
          Quản lý chương ({moduleCount})
        </button>
        <button
          type="button"
          onClick={() => onTabChange("tests")}
          className={tabClass("tests")}
        >
          Quản lý bài test ({testCount})
        </button>
      </nav>
    </div>
  );
}
