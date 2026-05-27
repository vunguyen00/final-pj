import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-blue-50 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-bold">Về LearnHub</h1>
          <p className="mt-4 text-lg text-slate-600">
            Nền tảng học tiếng Anh trực tuyến hàng đầu Việt Nam
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Sứ mệnh của chúng tôi</h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                LearnHub được thành lập với sứ mệnh giúp mọi người Việt Nam có thể tiếp cận 
                giáo dục tiếng Anh chất lượng cao với chi phí hợp lý. Chúng tôi tin rằng 
                tiếng Anh là chìa khóa mở ra cơ hội trong thế giới toàn cầu hóa, và mỗi người 
                đều xứng đáng được học tiếng Anh một cách hiệu quả.
              </p>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Với đội ngũ giảng viên giàu kinh nghiệm và phương pháp giảng dạy được cá nhân hóa, 
                chúng tôi cam kết đồng hành cùng bạn trên hành trình chinh phục tiếng Anh.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-blue-600">50,000+</p>
                <p className="mt-2 text-sm text-slate-600">Học viên</p>
              </div>
              <div className="rounded-xl bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-blue-600">200+</p>
                <p className="mt-2 text-sm text-slate-600">Khóa học</p>
              </div>
              <div className="rounded-xl bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-blue-600">50+</p>
                <p className="mt-2 text-sm text-slate-600">Giảng viên</p>
              </div>
              <div className="rounded-xl bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-blue-600">4.8</p>
                <p className="mt-2 text-sm text-slate-600">Đánh giá trung bình</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-2xl font-bold text-slate-900">Giá trị cốt lõi</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-blue-600">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">Chất lượng</h3>
              <p className="mt-2 text-sm text-slate-600">
                Luôn đảm bảo chất lượng giảng dạy tốt nhất cho học viên
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-green-600">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">Cá nhân hóa</h3>
              <p className="mt-2 text-sm text-slate-600">
                Mỗi học viên có lộ trình học tập phù hợp với mục tiêu riêng
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-purple-600">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">Tin cậy</h3>
              <p className="mt-2 text-sm text-slate-600">
                Học viên có thể yên tâm với chính sách hoàn tiền 30 ngày
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-2xl font-bold text-slate-900">Đội ngũ lãnh đạo</h2>
          <div className="mt-8 flex justify-center gap-8">
            <div className="text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-200"></div>
              <p className="mt-4 font-medium text-slate-900">Nguyễn Văn A</p>
              <p className="text-sm text-slate-500">CEO & Founder</p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-200"></div>
              <p className="mt-4 font-medium text-slate-900">Trần Thị B</p>
              <p className="text-sm text-slate-500">COO</p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-slate-200"></div>
              <p className="mt-4 font-medium text-slate-900">Lê Văn C</p>
              <p className="text-sm text-slate-500">CTO</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-50 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="text-2xl font-bold">Sẵn sàng bắt đầu?</h2>
          <p className="mt-4 text-slate-600">
            Tham gia cùng hàng nghìn học viên trên hành trình chinh phục tiếng Anh
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/auth/register"
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Đăng ký ngay
            </Link>
            <Link
              href="/courses"
              className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-900 hover:bg-white"
            >
              Khám phá khóa học
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
