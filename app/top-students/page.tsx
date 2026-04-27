import Link from "next/link";

// Mock top students data
const topStudents = [
  { rank: 1, id: "1", name: "Nguyễn Minh Hoàng", avatar: "NH", points: 9850, streak: 45, courses: 12, certificates: 10 },
  { rank: 2, id: "2", name: "Trần Lan Anh", avatar: "TA", points: 9200, streak: 38, courses: 10, certificates: 8 },
  { rank: 3, id: "3", name: "Lê Đức Phong", avatar: "LP", points: 8900, streak: 32, courses: 9, certificates: 7 },
  { rank: 4, id: "4", name: "Vũ Thảo My", avatar: "VM", points: 8650, streak: 28, courses: 8, certificates: 6 },
  { rank: 5, id: "5", name: "Hoàng Gia Huy", avatar: "HG", points: 8400, streak: 25, courses: 7, certificates: 5 },
  { rank: 6, id: "6", name: "Đặng Minh Quân", avatar: "DMQ", points: 8100, streak: 22, courses: 7, certificates: 5 },
  { rank: 7, id: "7", name: "Phạm Ngọc Linh", avatar: "PNL", points: 7800, streak: 20, courses: 6, certificates: 4 },
  { rank: 8, id: "8", name: "Ngô Thị Hương", avatar: "NTH", points: 7500, streak: 18, courses: 6, certificates: 4 },
  { rank: 9, id: "9", name: "Bùi Đình Minh", avatar: "BDM", points: 7200, streak: 15, courses: 5, certificates: 3 },
  { rank: 10, id: "10", name: "Lý Thị Mai", avatar: "LTM", points: 6900, streak: 12, courses: 5, certificates: 3 },
];

export default function TopStudentsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Học viên xuất sắc</h1>
          <p className="mt-2 text-slate-600">Những học viên có thành tích hàng đầu của LearnHub</p>
        </div>

        {/* Top 3 Podium */}
        <div className="mb-12 flex justify-center">
          <div className="flex items-end gap-4">
            {/* 2nd Place */}
            <div className="text-center">
              <div className="relative">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-2xl font-bold text-white">
                  {topStudents[1].avatar}
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-400 px-3 py-1 text-sm font-bold text-white">
                  #2
                </span>
              </div>
              <div className="mt-4 rounded-t-lg bg-slate-200 px-6 py-4">
                <p className="font-semibold text-slate-900">{topStudents[1].name}</p>
                <p className="text-sm text-slate-600">{topStudents[1].points.toLocaleString()} điểm</p>
              </div>
            </div>

            {/* 1st Place */}
            <div className="text-center">
              <div className="relative">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-3xl font-bold text-white shadow-lg">
                  {topStudents[0].avatar}
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-yellow-500 px-3 py-1 text-sm font-bold text-white">
                  👑
                </span>
              </div>
              <div className="mt-4 rounded-t-lg bg-yellow-100 px-6 py-4">
                <p className="font-semibold text-slate-900">{topStudents[0].name}</p>
                <p className="text-sm text-slate-600">{topStudents[0].points.toLocaleString()} điểm</p>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="text-center">
              <div className="relative">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-orange-400 text-2xl font-bold text-white">
                  {topStudents[2].avatar}
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-orange-400 px-3 py-1 text-sm font-bold text-white">
                  #3
                </span>
              </div>
              <div className="mt-4 rounded-t-lg bg-orange-100 px-6 py-4">
                <p className="font-semibold text-slate-900">{topStudents[2].name}</p>
                <p className="text-sm text-slate-600">{topStudents[2].points.toLocaleString()} điểm</p>
              </div>
            </div>
          </div>
        </div>

        {/* Full List */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Hạng</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">Học viên</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-600">Điểm</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-600">Streak</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-600">Khóa học</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-600">Chứng chỉ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      student.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                      student.rank === 2 ? "bg-slate-100 text-slate-700" :
                      student.rank === 3 ? "bg-orange-100 text-orange-700" :
                      "bg-slate-50 text-slate-600"
                    }`}>
                      {student.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/students/${student.id}`} className="flex items-center gap-3 hover:text-blue-600">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
                        {student.avatar}
                      </div>
                      <span className="font-medium text-slate-900">{student.name}</span>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-slate-900">{student.points.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-sm text-red-600">
                      🔥 {student.streak} ngày
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">
                    {student.courses}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">
                    {student.certificates}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}