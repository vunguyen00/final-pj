import Link from "next/link";
import { FeatureList, Stats } from "@/components/base/content";
import { Section, SectionHeader } from "@/components/base/section";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <Section background="muted" padding="lg">
        <SectionHeader
          title="Ve LearnHub"
          subtitle="Nen tang hoc ngoai ngu giup nguoi hoc Viet Nam tiep can lo trinh chat luong cao va kha thi." 
          centered
        />
      </Section>

      <Section padding="md">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">Su menh cua chung toi</h2>
            <p className="leading-relaxed text-muted-foreground">
              LearnHub duoc xay dung de mo rong co hoi hoc ngoai ngu thong qua khoa hoc thuc te, giang vien co kinh nghiem,
              va he thong theo doi tien do ro rang.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Chung toi tin rang moi hoc vien deu can mot lo trinh phu hop muc tieu ca nhan, de hoc nhanh hon va ung dung duoc ngay.
            </p>
          </div>
          <Stats
            className="lg:grid-cols-1"
            stats={[
              { label: "Hoc vien", value: "50,000+" },
              { label: "Khoa hoc", value: "200+" },
              { label: "Giang vien", value: "50+" },
              { label: "Danh gia", value: "4.8/5" },
            ]}
          />
        </div>
      </Section>

      <Section background="muted" padding="md">
        <SectionHeader title="Gia tri cot loi" centered />
        <FeatureList
          items={[
            {
              title: "Chat luong",
              description: "Noi dung duoc xay dung theo muc tieu dau ra ro rang va do luong duoc.",
            },
            {
              title: "Ca nhan hoa",
              description: "Moi hoc vien co lo trinh rieng dua tren trinh do va nhu cau thuc te.",
            },
            {
              title: "Tin cay",
              description: "Chinh sach minh bach, tien do ro rang, va ho tro xuyen suot qua trinh hoc.",
            },
          ]}
        />
      </Section>

      <Section padding="md">
        <SectionHeader title="Doi ngu lanh dao" centered />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["Nguyen Van A", "CEO & Founder"],
            ["Tran Thi B", "COO"],
            ["Le Van C", "CTO"],
          ].map(([name, role]) => (
            <article key={name} className="rounded-xl border border-border bg-card p-5 text-center">
              <div className="mx-auto h-20 w-20 rounded-full bg-muted" />
              <p className="mt-4 font-semibold text-foreground">{name}</p>
              <p className="text-sm text-muted-foreground">{role}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section background="muted" padding="sm">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <h2 className="text-2xl font-semibold text-foreground">San sang bat dau?</h2>
          <p className="mt-2 text-muted-foreground">Tham gia cung hang nghin hoc vien trong hanh trinh chinh phuc ngoai ngu.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/auth/register" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Dang ky ngay
            </Link>
            <Link href="/courses" className="rounded-lg border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground">
              Kham pha khoa hoc
            </Link>
          </div>
        </div>
      </Section>
    </main>
  );
}
