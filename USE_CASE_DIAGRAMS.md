# Sơ đồ use-case FinnCenter

Tài liệu này tổng hợp các sơ đồ use-case của website/app FinnCenter theo từng role và theo các luồng nghiệp vụ quan trọng. Toàn bộ sơ đồ đã được xuất thành hình SVG, dùng tiếng Việt có dấu để dễ đưa vào báo cáo hoặc xem trực tiếp trên GitHub/Markdown preview.

## Tác nhân

- **Khách**: người chưa đăng nhập.
- **Học viên**: người dùng đã đăng nhập và học/mua khóa học.
- **Giáo viên**: người dùng đã được admin duyệt quyền giảng dạy.
- **Quản trị viên**: người quản lý hệ thống.
- **VNPAY**: cổng thanh toán dùng khi nạp ví.
- **Ollama AI**: dịch vụ AI dùng để tạo đề, chấm Writing/Speaking và hỗ trợ test.
- **Dịch vụ email**: hệ thống gửi OTP, thông báo và chứng chỉ.

## Danh sách hình vẽ

Các file hình nằm trong thư mục `public/use-case-diagrams/`.

| Sơ đồ | File hình |
| --- | --- |
| Use-case tổng quan | [use-case-overview.svg](public/use-case-diagrams/use-case-overview.svg) |
| Use-case vai trò Khách | [use-case-guest.svg](public/use-case-diagrams/use-case-guest.svg) |
| Use-case vai trò Học viên | [use-case-student.svg](public/use-case-diagrams/use-case-student.svg) |
| Use-case vai trò Giáo viên | [use-case-teacher.svg](public/use-case-diagrams/use-case-teacher.svg) |
| Use-case vai trò Quản trị viên | [use-case-admin.svg](public/use-case-diagrams/use-case-admin.svg) |
| Luồng mua khóa học, học bài, làm test | [use-case-flow-learning-test.svg](public/use-case-diagrams/use-case-flow-learning-test.svg) |
| Luồng AI Writing/Speaking và hạt đậu | [use-case-flow-ai.svg](public/use-case-diagrams/use-case-flow-ai.svg) |
| Luồng đăng ký giáo viên | [use-case-flow-teacher-application.svg](public/use-case-diagrams/use-case-flow-teacher-application.svg) |
| Luồng doanh thu và rút tiền giáo viên | [use-case-flow-revenue.svg](public/use-case-diagrams/use-case-flow-revenue.svg) |

Nếu cần tạo lại các file SVG sau khi sửa nội dung sơ đồ, chạy:

```bash
node scripts/generate-use-case-svgs.mjs
```

## Use-case Tổng Quan

![Sơ đồ use-case tổng quan](public/use-case-diagrams/use-case-overview.svg)

Sơ đồ tổng quan thể hiện toàn bộ hệ thống FinnCenter với các tác nhân chính: Khách, Học viên, Giáo viên, Quản trị viên và các hệ thống ngoài như VNPAY, Ollama AI, dịch vụ email. Đây là sơ đồ nên dùng đầu tiên trong báo cáo để người đọc nắm phạm vi chức năng của website/app.

## Use-case Vai Trò Khách

![Sơ đồ use-case vai trò Khách](public/use-case-diagrams/use-case-guest.svg)

Khách có thể xem trang chủ, xem/lọc khóa học, xem chi tiết khóa học, xem giáo viên, xem trang giới thiệu, đăng ký, đăng nhập và quên mật khẩu bằng OTP.

## Use-case Vai Trò Học Viên

![Sơ đồ use-case vai trò Học viên](public/use-case-diagrams/use-case-student.svg)

Học viên có thể quản lý hồ sơ, nạp ví, mua hạt đậu AI, tìm và đăng ký khóa học, học module/lesson, theo dõi tiến độ, làm test, xem kết quả, nhận chứng chỉ, đánh giá khóa học, luyện Writing/Speaking với AI và đăng ký trở thành giáo viên.

## Use-case Vai Trò Giáo Viên

![Sơ đồ use-case vai trò Giáo viên](public/use-case-diagrams/use-case-teacher.svg)

Giáo viên có thể quản lý khóa học, module, lesson, video bài học, bài test, câu hỏi, đáp án, audio, tài liệu test, học viên, doanh thu và gửi yêu cầu rút tiền.

## Use-case Vai Trò Quản Trị Viên

![Sơ đồ use-case vai trò Quản trị viên](public/use-case-diagrams/use-case-admin.svg)

Quản trị viên có thể xem dashboard, quản lý user/role, quản lý ngôn ngữ học, bật/tắt đăng ký giáo viên, duyệt hồ sơ giáo viên, duyệt khóa học, cấu hình Speaking AI, xử lý rút doanh thu, theo dõi email/notification, xem anti-cheat và kiểm tra health/database.

## Luồng Mua Khóa Học, Học Bài, Làm Test

![Luồng mua khóa học, học bài, làm test](public/use-case-diagrams/use-case-flow-learning-test.svg)

Luồng này mô tả quá trình từ lúc học viên tìm khóa học, kiểm tra số dư ví, nạp tiền nếu thiếu, mua khóa học, học lesson, mở test khi đủ tiến độ, nộp bài test, lưu kết quả và gửi chứng chỉ nếu đạt.

## Luồng AI Writing/Speaking Và Hạt Đậu

![Luồng AI Writing/Speaking và hạt đậu](public/use-case-diagrams/use-case-flow-ai.svg)

Luồng này mô tả cách người dùng mua hạt đậu bằng ví, tạo đề Writing/Speaking, chấm điểm miễn phí, dùng hạt đậu để nhận xét AI chi tiết và lưu kết quả vào hệ thống.

## Luồng Đăng Ký Giáo Viên

![Luồng đăng ký giáo viên](public/use-case-diagrams/use-case-flow-teacher-application.svg)

Luồng này mô tả quy trình admin mở đăng ký giáo viên, ứng viên chọn ngôn ngữ, upload chứng chỉ, tạo hồ sơ, làm bài test đầu vào nếu có, hệ thống autosave/ghi anti-cheat, admin review và duyệt hoặc từ chối hồ sơ.

## Luồng Doanh Thu Và Rút Tiền Giáo Viên

![Luồng doanh thu và rút tiền giáo viên](public/use-case-diagrams/use-case-flow-revenue.svg)

Luồng này mô tả quá trình học viên nạp ví, mua khóa học, hệ thống chia doanh thu 70/30, giáo viên xem doanh thu khả dụng, tạo yêu cầu rút tiền và admin duyệt/thanh toán hoặc từ chối kèm lý do.

## Ghi Chú Đọc Sơ Đồ

- Đường liền thể hiện tác nhân sử dụng trực tiếp use-case hoặc bước tiếp theo trong luồng chính.
- Đường nét đứt thể hiện phụ thuộc, điều kiện, include/extend hoặc tích hợp hệ thống ngoài.
- Các hình ellipse là use-case; các hình chữ nhật bo góc trong sơ đồ luồng là bước nghiệp vụ quan trọng.
- Các sơ đồ sequence chi tiết nằm trong `SEQUENCE_DIAGRAMS.md` nếu dự án cần đối chiếu thêm.
