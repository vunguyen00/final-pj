import Link from "next/link";
import { FeatureList, Stats } from "@/components/base/content";
import { Section, SectionHeader } from "@/components/base/section";
import { prisma } from "@/lib/prisma";
import { formatCount } from "@/lib/public-teachers";

export const dynamic = "force-dynamic";

async function getAboutStats() {
  try {
    const [students, courses, teachers, languages] = await Promise.all([
      prisma.user.count({
        where: { role: "STUDENT", isBanned: false, accountStatus: "ACTIVE" },
      }),
      prisma.course.count({
        where: {
          status: "ACTIVE",
          instructor: { is: { isBanned: false, accountStatus: "ACTIVE" } },
        },
      }),
      prisma.user.count({
        where: { role: "TEACHER", isBanned: false, accountStatus: "ACTIVE" },
      }),
      prisma.learningLanguage.count({ where: { isActive: true } }),
    ]);

    return { students, courses, teachers, languages };
  } catch {
    return { students: 0, courses: 0, teachers: 0, languages: 0 };
  }
}

export default async function AboutPage() {
  const stats = await getAboutStats();

  return (
    <main className="min-h-screen bg-background">
      <Section background="muted" padding="lg">
        <SectionHeader
          title="Về FinnCenter"
          subtitle="Nền tảng học ngoại ngữ giúp người học Việt Nam tiếp cận lộ trình chất lượng cao và khả thi."
          centered
        />
      </Section>

      <Section padding="md">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">Sứ mệnh của chúng tôi</h2>
            <p className="leading-relaxed text-muted-foreground">
              FinnCenter được xây dựng để mở rộng cơ hội học ngoại ngữ thông qua khóa học thực tế, giảng viên có kinh nghiệm,
              và hệ thống theo dõi tiến độ rõ ràng.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Chúng tôi tin rằng mỗi học viên đều cần một lộ trình phù hợp mục tiêu cá nhân, để học nhanh hơn và ứng dụng được ngay.
            </p>
          </div>
          <Stats
            className="lg:grid-cols-1"
            stats={[
              { label: "Học viên đang hoạt động", value: formatCount(stats.students) },
              { label: "Khóa học đang mở", value: formatCount(stats.courses) },
              { label: "Giảng viên đang hoạt động", value: formatCount(stats.teachers) },
              { label: "Ngôn ngữ đang hỗ trợ", value: formatCount(stats.languages) },
            ]}
          />
        </div>
      </Section>

      <Section background="muted" padding="md">
        <SectionHeader title="Giá trị cốt lõi" centered />
        <FeatureList
          items={[
            {
              title: "Chất lượng",
              description: "Nội dung được xây dựng theo mục tiêu đầu ra rõ ràng và đo lường được.",
            },
            {
              title: "Cá nhân hóa",
              description: "Mỗi học viên có lộ trình riêng dựa trên trình độ và nhu cầu thực tế.",
            },
            {
              title: "Tin cậy",
              description: "Chính sách minh bạch, tiến độ rõ ràng, và hỗ trợ xuyên suốt quá trình học.",
            },
          ]}
        />
      </Section>

      <Section padding="md">
        <SectionHeader
          title="Cách FinnCenter vận hành"
          subtitle="Mọi nội dung công khai đều gắn với dữ liệu và quy trình đang hoạt động trên hệ thống."
          centered
        />
        <FeatureList
          items={[
            {
              title: "Nội dung có kiểm duyệt",
              description: "Khóa học chỉ được công khai khi đã có đầy đủ chương, bài học và bài kiểm tra đạt yêu cầu.",
            },
            {
              title: "Tiến độ có thể kiểm chứng",
              description: "Hoạt động học, kết quả kiểm tra và quyền đánh giá được ghi nhận theo tài khoản của từng học viên.",
            },
            {
              title: "Giao dịch minh bạch",
              description: "Thanh toán, hoàn tiền và doanh thu giảng viên có trạng thái xử lý rõ ràng để người dùng theo dõi.",
            },
          ]}
        />
      </Section>

      <Section background="muted" padding="sm">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <h2 className="text-2xl font-semibold text-foreground">Sẵn sàng bắt đầu?</h2>
          <p className="mt-2 text-muted-foreground">Tham gia cùng hàng nghìn học viên trong hành trình chinh phục ngoại ngữ.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/auth/register" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Đăng ký ngay
            </Link>
            <Link href="/courses" className="rounded-lg border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground">
              Khám phá khóa học
            </Link>
          </div>
        </div>
      </Section>
    </main>
  );
}
