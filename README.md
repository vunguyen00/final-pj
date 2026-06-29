# FinnCenter - Website hoc ngoai ngu tich hop AI

FinnCenter la nen tang hoc ngoai ngu theo mo hinh LMS ket hop marketplace khoa hoc. Website cho phep hoc vien mua khoa hoc, hoc theo module/bai hoc, lam bai test, xem ket qua, luyen Writing/Speaking voi AI, dung vi noi bo de thanh toan va theo doi tien do. Giao vien co the dang ky xet duyet, tao khoa hoc, quan ly bai hoc, de test, hoc vien va doanh thu. Quan tri vien co khu vuc rieng de duyet giao vien, duyet khoa hoc, quan ly he thong, xem analytics va xu ly yeu cau rut doanh thu.

## Cong nghe su dung

- Next.js 16 App Router, React 19 va TypeScript.
- Tailwind CSS 4 cho giao dien.
- Prisma 7 voi PostgreSQL.
- Nodemailer de gui OTP, thong bao va email chung chi.
- Ollama de tao de, cham Writing/Speaking va cham cau hoi tu luan/noi trong bai test.
- VNPAY de nap tien vao vi noi bo.
- Web Worker phia trinh duyet de nhan dien va phan tich audio Speaking.

## Cai dat va chay du an

### Yeu cau

- Node.js phien ban moi tuong thich Next.js 16.
- PostgreSQL, co the chay bang Docker Compose trong repo.
- Ollama neu muon dung cac tinh nang AI cham bai.
- Tai khoan SMTP neu muon gui OTP/email.
- Cau hinh VNPAY sandbox/production neu muon nap vi that.

### Cai dependency

```bash
npm install
```

Repo cung co `pnpm-lock.yaml`, nhung cac script hien tai trong `package.json` dung npm nen huong dan mac dinh dung npm.

### Cau hinh bien moi truong

Tao file `.env` o thu muc goc. Khong commit file nay vi co secret.

```env
DATABASE_URL="postgresql://admin:123456@localhost:5433/admin?schema=public"

AUTH_SECRET="doi_chuoi_bi_mat_nay_trong_production"
# JWT_SECRET cung duoc ho tro lam fallback neu chua co AUTH_SECRET

SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your_email_user"
SMTP_PASS="your_email_password"
SMTP_FROM="FinnCenter <no-reply@example.com>"
SMTP_SECURE="false"

VNPAY_TMN_CODE="your_vnpay_tmn_code"
VNPAY_HASH_SECRET="your_vnpay_hash_secret"
VNPAY_PAYMENT_URL="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
VNPAY_API="https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"
VNPAY_BASE_URL="http://localhost:3000"
VNPAY_RETURN_PATH="/api/wallet/vnpay-return"
VNPAY_IPN_PATH="/api/wallet/vnpay-ipn"

OLLAMA_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="gemma4:31b-cloud"
OLLAMA_NUM_PREDICT="7000"

AI_POINT_PRICE_VND="1000"
PASSWORD_RESET_OTP_EXPIRES_MINUTES="10"
PASSWORD_RESET_OTP_MAX_ATTEMPTS="5"
```

Neu dung Docker Compose trong repo, PostgreSQL mac dinh chay voi user/password/db la `admin/123456/admin` va port host `5433`.

### Khoi dong database

```bash
docker compose up -d
```

Sau do chay migration va generate Prisma Client:

```bash
npx prisma migrate dev
npx prisma generate
```

Trong moi truong production co the dung:

```bash
npx prisma migrate deploy
```

### Chay app

```bash
npm run dev
```

Mo `http://localhost:3000`.

Mot so script co san:

- `npm run dev`: chay Next.js dev server.
- `npm run dev:next`: chay Next.js voi host `::`.
- `npm run dev:ollama`: chay `ollama serve`.
- `npm run dev:tunnel`: chay Cloudflare tunnel ten `finncenter`.
- `npm run dev:all`: khoi dong Docker container, Next.js, tunnel va Ollama cung luc.
- `npm run build`: build production.
- `npm run start`: chay ban build.
- `npm run lint`: chay ESLint.
- `npm run doctor`: chay react-doctor.

## Cau truc thu muc chinh

- `app/`: giao dien, page, layout va API route theo Next.js App Router.
- `app/api/`: backend route handler cho auth, khoa hoc, vi, AI, giao vien, hoc vien va admin.
- `app/generated/prisma/`: Prisma Client duoc generate.
- `components/`: component UI dung chung ngoai `app/components`.
- `lib/`: business logic nhu auth, wallet, VNPAY, AI, IELTS grading, hoc tap, doanh thu, analytics.
- `prisma/schema.prisma`: schema database.
- `prisma/migrations/`: lich su migration.
- `public/uploads/`, `public/videos/`, `public/certificates/`: file upload/runtime.
- `config/vnpay.json`: mo ta cau hinh VNPAY, gia tri that doc tu `.env`.

## Phan quyen nguoi dung

He thong co 3 role chinh:

- `STUDENT`: tai khoan mac dinh sau khi dang ky. Co the hoc, mua khoa hoc, lam test, dung AI, nap vi va dang ky lam giao vien.
- `TEACHER`: co the tao khoa hoc, module, lesson, test, cau hoi, xem hoc vien va gui yeu cau rut doanh thu.
- `ADMIN`: co quyen quan tri, xem analytics, duyet ho so giao vien, duyet khoa hoc, khoa/mo user hoac course, cau hinh he thong va xu ly rut doanh thu.

## Huong dan su dung nhanh

### Khach chua dang nhap

1. Xem trang chu, danh sach khoa hoc, chi tiet khoa hoc, danh sach giao vien va trang gioi thieu.
2. Dang ky tai khoan tai `/auth/register`.
3. Dang nhap tai `/auth/login`.
4. Neu quen mat khau, dung `/auth/forgot-password` de nhan OTP qua email.

### Hoc vien

1. Dang nhap bang tai khoan hoc vien.
2. Vao `/courses` de loc khoa hoc theo ngon ngu, trinh do, loai khoa hoc hoac tab pho bien/moi/combo/ky nang/luyen thi.
3. Vao chi tiet khoa hoc, nap tien neu vi chua du so du, roi dang ky/mua khoa hoc.
4. Vao `/student/hoc-bai?courseId=...` de hoc theo module va lesson.
5. Voi bai hoc khong co video, he thong yeu cau hoc toi thieu 10 phut. Voi bai co video, phai xem het video va khong tua de duoc ghi nhan hoan thanh.
6. Khi tien do dat 100%, vao `/student/tests` de lam bai test khoa hoc. De phai du tong 100 diem moi duoc mo lam.
7. Sau khi nop bai, xem ket qua tai `/student/tests/[testId]/result/[attemptId]` hoac trang tong hop `/student/results`.
8. Neu dat bai test khoa hoc, he thong ghi nhan hoan thanh khoa hoc, co the gui email chung chi va mo quyen danh gia khoa hoc.
9. Dung `/student/writing-ai` de tao de Writing, nhap bai viet, cham diem hoac nhan xet chi tiet bang AI.
10. Dung `/student/speaking-ai` de tao de Speaking, ghi am, nhan dien noi dung noi, cham diem hoac nhan xet chi tiet bang AI.
11. Dung `/student/wallet` de nap tien qua VNPAY, xem so du, mua hat dau AI va xem lich su giao dich.
12. Dung `/student/rewards` de xem hat dau, lich su dung diem AI va thong ke luyen tap.

### Giao vien

1. Hoc vien hoac giao vien vao `/teacher-registration` de nop ho so giang vien khi admin bat chuc nang dang ky.
2. Upload 1 den 3 chung chi dinh dang JPG, PNG hoac PDF, moi file toi da 10MB, kem ngay het han.
3. Neu ngon ngu duoc chon co bai test dau vao, nguoi nop ho so phai lam bai test. He thong co autosave va ghi log anti-cheat.
4. Sau khi admin duyet, tai khoan duoc chuyen sang role `TEACHER`.
5. Vao `/teacher/courses` de tao va quan ly khoa hoc.
6. Trong tung khoa hoc, giao vien co the cap nhat thong tin, upload thumbnail, tao module, tao lesson, upload video bai hoc.
7. Tao bai test cho khoa hoc, them cau hoi trac nghiem, dung/sai, dien tu, tu luan hoac speaking, upload audio cau hoi va tai lieu de.
8. Vao `/teacher/students` de xem hoc vien, khoa hoc da dang ky, chung chi va thong tin lien quan.
9. Vao `/teacher/tests` de xem doanh thu ca nhan, doanh thu theo khoa hoc, giao dich gan day va tao yeu cau rut tien.

### Quan tri vien

1. Vao `/admin` de xem dashboard quan tri.
2. Xem analytics tong quan ve user, khoa hoc, doanh thu, bai test, AI, hoat dong hoc tap, email, anti-cheat va bang xep hang.
3. Bat/tat dang ky giang vien. Khi bat tu trang thai tat, he thong gui notification/email cho hoc vien.
4. Bat/tat tu dong duyet khoa hoc cua giao vien.
5. Cau hinh Speaking AI, vi du loai bai thi va thoi luong.
6. Duyet hoac tu choi ho so giang vien; khi duyet, user duoc nang role len `TEACHER`.
7. Duyet, tu choi, khoa hoac mo khoa khoa hoc.
8. Quan ly de test public practice va teacher entrance.
9. Khoa/mo user hoac thay doi role khi can.
10. Duyet, xac nhan da thanh toan hoac tu choi yeu cau rut doanh thu cua giao vien.

## Cac chuc nang chinh

### Marketplace khoa hoc

- Hien thi khoa hoc cong khai trang thai `ACTIVE`.
- Loc theo ngon ngu: English, Chinese, Japanese, Korean.
- Phan loai khoa hoc theo ten/mo ta/category: khoa don, combo, luyen ky nang, luyen thi chung chi, goi tu vung, mock test.
- Suy luan trinh do: Beginner, Elementary, Intermediate, Upper Intermediate, Advanced.
- Trang chi tiet khoa hoc hien thi instructor, thumbnail, module, lesson, bai test, so hoc vien va danh gia.
- Giao vien/admin co the preview khoa hoc chua public neu la chu so huu hoac admin.

### Tai khoan va bao mat

- Dang ky, dang nhap, dang xuat.
- Mat khau duoc hash bang `scrypt`.
- Cookie dang nhap `auth_token` duoc ky HMAC, co han 7 ngay.
- Kiem tra tai khoan bi khoa (`isBanned`) khi xac thuc.
- Quen mat khau bang OTP gui email, co han va gioi han so lan thu.
- Admin khong reset mat khau qua OTP.
- Trang ho so cho phep cap nhat ten, so dien thoai, ngon ngu hoc va doi mat khau.

### Vi noi bo va VNPAY

- Moi user khong phai admin co vi rieng.
- Nap vi qua VNPAY, so tien toi thieu 10.000 VND.
- Tao `Payment` trang thai `PENDING`, ky tham so VNPAY va redirect sang cong thanh toan.
- Xu ly ca VNPAY IPN va return URL, xac thuc chu ky, kiem tra so tien, chong cong tien nhieu lan.
- Lich su vi gom nap tien, mua khoa hoc va mua hat dau AI.
- Admin khong dung vi.

### Mua khoa hoc va doanh thu

- Hoc vien/giao vien/admin co the enroll khoa hoc neu du dieu kien.
- Neu khoa hoc co gia, he thong tru vi va tao `Order`, `OrderItem`, `Enrollment`.
- Neu nguoi mua la instructor cua khoa hoc, duoc enroll mien phi de xem/hoc thu.
- Doanh thu khoa hoc cua giao vien duoc chia 70% cho giao vien va 30% cho admin.
- Khoa hoc khong thuoc giao vien role `TEACHER` duoc tinh doanh thu admin-only.

### Hoc bai va tien do

- Khoa hoc gom nhieu module, moi module gom nhieu lesson.
- Hoc vien chi truy cap noi dung neu da enroll, la instructor hoac admin.
- He thong ghi nhan bat dau hoc, hoan thanh lesson va phan tram tien do.
- Bai khong co video yeu cau toi thieu 10 phut hoc.
- Bai co video yeu cau xem het va khong tua.
- Khi hoan thanh 100% lesson, giao dien dan hoc vien sang bai test.
- Hoat dong hoc duoc ghi vao `LearningActivity` de tinh streak/analytics.

### Bai test

- Test co 3 loai: `COURSE`, `PUBLIC_PRACTICE`, `TEACHER_ENTRANCE`.
- Che do cham: `STANDARD`, `WRITING`, `SPEAKING`.
- Dang cau hoi: trac nghiem, dung/sai, dien tu, tu luan, speaking.
- Co the them audio cho cau hoi listening va tai lieu de thi.
- Tong diem cau hoi phai bang 100 de test san sang.
- Course test yeu cau hoc vien da enroll va hoan thanh 100% bai hoc.
- Public practice co the xuat hien trong trung tam bai test ma khong gan khoa hoc.
- Bai test co the co gioi han thoi gian, tu dong nop khi het gio.
- He thong luu lich su tung lan lam bai, diem, dap an, nhan xet va trang thai dat/khong dat.

### AI Writing

- Tao de Writing bang AI hoac dung de mac dinh/fallback.
- Ho tro Writing Task 1 va Task 2.
- Task 1 co the tao du lieu bieu do/bang de phan tich.
- Ho tro English, Chinese, Japanese, Korean.
- English dung rubric IELTS Writing; ngon ngu khac dung he cham theo thang 0-10.
- Cham diem mien phi chi tra ket qua diem.
- Nhan xet AI chi tiet tru 3 hat dau voi Student/Teacher, mien phi voi Admin.
- Ket qua luu vao `AiAssessment`, co the xem lai trong `/student/results`.

### AI Speaking

- Tao de Speaking theo ngon ngu, task va topic.
- Ghi am truc tiep bang microphone trong trinh duyet.
- Chuyen audio thanh transcript bang worker phia client, sau do gui transcript/audio len server.
- Luu file audio vao `public/uploads/speaking`.
- Ho tro English, Chinese, Japanese, Korean.
- English dung rubric IELTS Speaking; Chinese co the cham theo HSK/HSKK; Japanese/Korean dung he speaking tuong ung.
- Cham diem mien phi chi tra diem.
- Nhan xet AI chi tiet tru 7 hat dau voi Student/Teacher, mien phi voi Admin.
- Admin co the cau hinh thoi luong Speaking AI tu 30 den 900 giay.

### Hat dau AI

- Hat dau la diem dung de mua nhan xet AI chi tiet.
- Gia mac dinh la 1.000 VND/hat, co the chinh bang `AI_POINT_PRICE_VND`.
- Student/Teacher mua hat dau bang so du vi.
- Admin khong can mua hat dau.
- He thong luu lich su mua, dung va so du hat dau.
- Hien tai hat dau duoc tang chu yeu qua mua hoac admin grant; diem thuong hoan thanh khoa/streak dang cau hinh la 0.

### Ket qua hoc tap

- Trang `/student/results` tong hop ket qua bai test, Writing AI va Speaking AI.
- Co the loc theo loai ket qua.
- Trang chi tiet hien thi diem, tieu chi, bai lam da luu, nhan xet, loi sai, de xuat cai thien va bai mau neu co.
- Lich su bai test nam o `/student/tests/history`.

### Danh gia khoa hoc

- Hoc vien chi duoc danh gia khoa hoc khi da dat bai test cua khoa hoc.
- Rating tu 1 den 5 sao.
- Comment toi da 1.000 ky tu.
- Moi hoc vien co the cap nhat review cua minh.
- Review duoc hien thi o trang chi tiet khoa hoc.

### Dang ky va duyet giao vien

- Admin co the bat/tat chuc nang dang ky giang vien.
- Nguoi dung upload chung chi, chon ngon ngu apply va lam bai test dau vao neu co.
- Ho so co trang thai: draft, submitted, under review, approved, rejected, expired.
- He thong ghi log tien trinh ho so.
- Trong bai test dau vao co autosave va anti-cheat log/suspicious events.
- Admin duyet ho so se chuyen user sang `TEACHER`; tu choi thi luu ly do va gui notification/email.

### Quan ly khoa hoc cho giao vien

- Tao/sua/xoa/khoa khoa hoc.
- Upload thumbnail khoa hoc.
- Tao/sua/xoa module.
- Tao/sua/xoa lesson, upload video bai hoc.
- Khoa hoc co hoc vien se bi `LOCKED` khi xoa thay vi xoa vat ly.
- Neu admin tat auto approval, khoa hoc giao vien tao/sua se vao trang thai `PENDING_APPROVAL`.

### Quan ly test cho giao vien/admin

- Giao vien tao test cho khoa hoc cua minh.
- Moi khoa hoc chi co mot course test.
- Khoa hoc phai co it nhat mot module truoc khi tao test.
- Admin co the tao `PUBLIC_PRACTICE` va `TEACHER_ENTRANCE`.
- Teacher entrance test bat buoc dung mode Writing AI hoac Speaking AI.
- Co upload audio cau hoi va upload tai lieu de.
- Cau hoi duoc validate de tong diem khong vuot 100.

### Quan tri he thong

- Dashboard analytics theo khoang thoi gian.
- Thong ke user, role, khoa hoc, enrollments, doanh thu, diem test, AI usage, hat dau, hoc tap, email va anti-cheat.
- Bang xep hang hoc vien, giao vien va khoa hoc.
- Quan ly user, role va trang thai khoa.
- Duyet/tu choi/khoa/mo khoa khoa hoc.
- Cau hinh dang ky giao vien, auto approval khoa hoc va Speaking AI.
- Xu ly yeu cau rut doanh thu.
- Health check tai `/api/health` de kiem tra app va ket noi database.

## API tieu bieu

- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/forgot-password/*`.
- Profile: `/api/profile`, `/api/profile/password`.
- Courses: `/api/courses`, `/api/courses/[id]/access`, `/api/courses/[id]/enroll`, `/api/courses/[id]/reviews`.
- Wallet: `/api/wallet`, `/api/wallet/top-up`, `/api/wallet/vnpay-ipn`, `/api/wallet/vnpay-return`.
- Learning: `/api/learning/lessons/[lessonId]/start`, `/api/learning/lessons/[lessonId]/complete`.
- Student tests/results: `/api/student/tests/**`, `/api/student/results/**`.
- AI: `/api/ai/essay-evaluation`, `/api/ai/writing-prompt`, `/api/ai/speaking-evaluation/**`, `/api/ai/points/**`.
- Teacher applications: `/api/teacher-applications/**`.
- Teacher: `/api/teacher/courses/**`, `/api/teacher/tests/**`, `/api/teacher/students`, `/api/teacher/revenue-withdrawals`, cac API upload.
- Admin: `/api/admin/**`.
- System: `/api/health`, `/api/languages`.

## Database tong quan

Cac nhom bang chinh:

- Tai khoan: `User`, `Session`, `PasswordResetOtp`.
- Khoa hoc: `Course`, `Module`, `Lesson`, `Enrollment`, `Feedback`.
- Bai test: `Test`, `Question`, `Answer`, `TestAttempt`, `CheatingLog`.
- AI va hoat dong hoc: `AiAssessment`, `PointTransaction`, `LearningActivity`, `SystemSetting`.
- Giao vien: `TeacherApplication`, `TeacherCertificate`, `TeacherApplicationLog`, `AntiCheatLog`, `SuspiciousEvent`.
- Thanh toan/doanh thu: `Wallet`, `Payment`, `Order`, `OrderItem`, `TeacherRevenueWithdrawal`.
- Phu tro: `LearningLanguage`, `Notification`, `EmailLog`.

## Diem manh

- Bao phu gan tron luong LMS: marketplace, mua khoa hoc, hoc bai, lam test, ket qua, chung chi va review.
- Co du 3 vai tro Student/Teacher/Admin voi phan quyen ro trong API.
- Tich hop AI sau cho Writing, Speaking va cau hoi tu luan/noi trong test.
- Co vi noi bo, VNPAY, lich su giao dich va chia doanh thu giao vien.
- Co workflow xet duyet giao vien gom chung chi, bai test dau vao, anti-cheat, notification va email.
- Admin dashboard nhieu du lieu: doanh thu, hoc tap, AI, test, anti-cheat, email, ranking.
- Logic backend duoc gom kha nhieu vao `lib/`, de doc va tai su dung.
- Co kiem tra idempotency cho nhieu nghiep vu nhu cong vi, point transaction va learning activity.
- Ho tro nhieu ngon ngu hoc chinh: Anh, Trung, Nhat, Han.

## Han che hien tai

- Mot so text tieng Viet trong source dang bi loi ma hoa/mojibake; can chuan hoa lai UTF-8 de giao dien dep va de bao tri hon.
- Upload video, audio speaking, thumbnail va chung chi dang luu vao thu muc `public/` local; neu deploy serverless hoac nhieu instance nen chuyen sang object storage nhu S3/R2.
- AI evaluation phu thuoc Ollama va model local/remote. Neu Ollama khong chay, tao de co fallback nhung cham bai se loi hoac tam thoi khong kha dung.
- Speaking phu thuoc quyen microphone, MediaRecorder, AudioContext va Web Worker phia trinh duyet; mot so trinh duyet/may yeu co the nhan dien audio cham hoac khong ho tro day du.
- `Feedback` dang duoc dung cho nhieu muc dich: review khoa hoc, marker tien do, hoan thanh khoa hoc va chung chi. Khi du lieu lon nen tach thanh cac bang rieng.
- `Session` co trong schema nhung flow auth hien dung cookie HMAC tu ky, chua su dung bang session de quan ly/thu hoi phien dang nhap.
- Neu khong cau hinh `AUTH_SECRET`, code co fallback dev secret; production bat buoc dat secret manh.
- He thong chua co seed/admin bootstrap ro rang trong repo; tai khoan admin ban dau co the can tao hoac cap nhat truc tiep trong database.
- Rut doanh thu giao vien moi dung o workflow yeu cau/duyet/xac nhan thu cong, chua tich hop chuyen khoan ngan hang tu dong.
- Hat dau thuong do hoan thanh khoa hoc hoac streak hien dang cau hinh bang 0, nen co che diem thuong hoc tap chua that su phat huy.
- Mot so trang nhu dashboard tu vung dang dung du lieu mau/tinh, chua ket noi day du voi database.
