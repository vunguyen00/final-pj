import Link from "next/link";
import { notFound } from "next/navigation";

// Mock course data
const coursesData: Record<string, {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  thumbnail: string;
  instructor: { id: string; name: string; bio: string; avatar: string };
  price: number;
  students: number;
  rating: number;
  category: string;
  duration: string;
  lessons: number;
  level: string;
  whatYouWillLearn: string[];
  requirements: string[];
}> = {
  "1": {
    id: "1",
    title: "Tiếng Anh Giao Tiếp Cơ Bản",
    description: "Học cách giao tiếp cơ bản trong các tình huống thường ngày. Phù hợp cho người mới bắt đầu.",
    longDescription: "Khóa học này giúp bạn xây dựng nền tảng vững chắc về tiếng Anh giao tiếp. Bạn sẽ được học cách phát âm chuẩn, từ vựng thông dụng, và các cấu trúc câu phổ biến trong giao tiếp hàng ngày. Sau khi hoàn thành, bạn có thể tự tin giao tiếp trong các tình huống cơ bản.",
    thumbnail: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&h=400&fit=crop",
    instructor: { 
      id: "1", 
      name: "Nguyễn Văn A", 
      bio: "Thạc sĩ Ngôn ngữ học với 10 năm kinh nghiệm giảng dạy tiếng Anh. Đã đào tạo hơn 5000 học viên đạt chuẩn giao tiếp.",
      avatar: "NVA"
    },
    price: 299000,
    students: 1250,
    rating: 4.8,
    category: "Speaking",
    duration: "8 tuần",
    lessons: 24,
    level: "Người mới bắt đầu",
    whatYouWillLearn: [
      "Phát âm chuẩn các nguyên âm và phụ âm trong tiếng Anh",
      "Từ vựng thông dụng trong giao tiếp hàng ngày (500+ từ)",
      "Cấu trúc câu cơ bản và nâng cao",
      "Kỹ năng nghe và hiểu trong giao tiếp",
      "Cách đặt câu hỏi và trả lời tự nhiên",
      "Xử lý các tình huống giao tiếp thực tế"
    ],
    requirements: [
      "Không yêu cầu kiến thức tiếng Anh trước đó",
      "Có máy tính và kết nối internet ổn định",
      "Cam kết học tập ít nhất 30 phút mỗi ngày"
    ]
  },
  "2": {
    id: "2",
    title: "IELTS Writing Band 7+",
    description: "Luyện viết IELTS với chiến lược và template hiệu quả. Hướng dẫn chi tiết từng phần.",
    longDescription: "Khóa học IELTS Writing chuyên sâu giúp bạn đạt điểm Band 7+ trong kỳ thi IELTS. Với phương pháp học hiệu quả và template được kiểm chứng, bạn sẽ nắm vững cách viết cả Task 1 và Task 2.",
    thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&h=400&fit=crop",
    instructor: { 
      id: "2", 
      name: "Trần Thị B", 
      bio: "Giảng viên IELTS với 12 năm kinh nghiệm. Chuyên gia về Writing và Speaking. Đã giúp hàng trăm học viên đạt Band 7+.",
      avatar: "TTB"
    },
    price: 499000,
    students: 890,
    rating: 4.9,
    category: "Writing",
    duration: "12 tuần",
    lessons: 36,
    level: "Trung cấp - Nâng cao",
    whatYouWillLearn: [
      "Cấu trúc và chiến lược viết Task 1 (Report/Letter)",
      "Cách viết Essay Band 7+ cho Task 2",
      "Sử dụng từ vựng và ngữ pháp nâng cao",
      "Kỹ năng phân tích đề bài và lập dàn ý",
      "Quản lý thời gian hiệu quả khi làm bài",
      "Cách tránh các lỗi phổ biến làm giảm điểm"
    ],
    requirements: [
      "Có kiến thức tiếng Anh cơ bản (tương đương IELTS 5.0)",
      "Đã từng làm quen với định dạng bài thi IELTS",
      "Cam kết luyện tập viết ít nhất 2 bài mỗi tuần"
    ]
  },
};

// Related courses
const relatedCourses = [
  {
    id: "3",
    title: "Reading Comprehension Nâng Cao",
    thumbnail: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop",
    price: 399000,
    category: "Reading",
  },
  {
    id: "4",
    title: "Listening & Dictation Master",
    thumbnail: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=300&fit=crop",
    price: 349000,
    category: "Listening",
  },
  {
    id: "5",
    title: "Business English Cho Người Đi Làm",
    thumbnail: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=300&fit=crop",
    price: 599000,
    category: "Speaking",
  },
];

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params;
  const course = coursesData[id];

  if (!course) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-slate-900 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="text-white">
              <span className="inline-block rounded-full bg-blue-600 px-3 py-1 text-sm font-medium">
                {course.category}
              </span>
              <h1 className="mt-4 text-3xl font-bold lg:text-4xl">{course.title}</h1>
              <p className="mt-4 text-slate-300">{course.description}</p>
              
              <div className="mt-6 flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">★</span>
                  <span>{course.rating} ({course.students} học viên)</span>
                </div>
                <div>⏱ {course.duration}</div>
                <div>📚 {course.lessons} bài học</div>
                <div>📊 {course.level}</div>
              </div>

              {/* Instructor */}
              <div className="mt-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold">
                  {course.instructor.avatar}
                </div>
                <div>
                  <p className="font-medium">Giảng viên: {course.instructor.name}</p>
                  <Link href={`/teachers/${course.instructor.id}`} className="text-sm text-blue-400 hover:underline">
                    Xem profile →
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden bg-white">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full aspect-video object-cover"
              />
              <div className="p-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">
                    {course.price.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <button className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700">
                  Đăng ký ngay
                </button>
                <p className="mt-3 text-center text-sm text-slate-500">
                  30 ngày hoàn tiền nếu không hài lòng
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* About */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900">Về khóa học</h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                {course.longDescription}
              </p>
            </section>

            {/* What you'll learn */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900">Bạn sẽ học được</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {course.whatYouWillLearn.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg bg-white p-4 border border-slate-200">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 text-sm">
                      ✓
                    </span>
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Requirements */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900">Yêu cầu</h2>
              <ul className="mt-4 space-y-3">
                {course.requirements.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Sidebar */}
          <div>
            <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900">Thông tin khóa học</h3>
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Thời lượng</span>
                  <span className="font-medium text-slate-900">{course.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số bài học</span>
                  <span className="font-medium text-slate-900">{course.lessons}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cấp độ</span>
                  <span className="font-medium text-slate-900">{course.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Học viên</span>
                  <span className="font-medium text-slate-900">{course.students.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đánh giá</span>
                  <span className="font-medium text-slate-900">{course.rating} ★</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Courses */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900">Khóa học liên quan</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-slate-700">
                    {course.category}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-600">
                    {course.title}
                  </h3>
                  <div className="mt-3">
                    <span className="text-sm font-semibold text-blue-600">
                      {course.price.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}