# AI Writing Evaluation - Essay Test Integration

**Last Updated**: May 19, 2026  
**Status**: ✅ Integrated & Ready

---

## 📋 Tóm Tắt Thay Đổi

Hệ thống AI Writing Evaluation đã được tích hợp **tự động vào phần bài test** cho học viên. Khi học viên **hoàn thành bài test có câu hỏi ESSAY**, hệ thống sẽ:

✅ **Tự động đánh giá** bài viết bằng AI  
✅ **Tính điểm tự động** dựa trên đánh giá AI  
✅ **Hiển thị feedback chi tiết** cho học viên

---

## 🎯 Cách Hoạt Động

### 1️⃣ Học Viên Làm Bài Test

```
Học viên → Vào bài test → Trả lời câu hỏi ESSAY → Click "Nộp bài"
```

### 2️⃣ Hệ Thống Xử Lý Tự Động

```
POST /api/student/tests/[testId]/submit
    ↓
Phát hiện câu hỏi ESSAY
    ↓
Gọi AI evaluation: POST /api/ai/essay-evaluation
    ↓
AI đánh giá và trả về:
  - Điểm (0-10)
  - Ngôn ngữ
  - Điểm mạnh
  - Điểm cần cải thiện
  - Gợi ý cải thiện
    ↓
Tính điểm:
  - Nếu AI score >= 7 → Đúng (full điểm)
  - Nếu AI score < 7 → Sai (percentage score)
    ↓
Lưu kết quả + AI feedback
```

### 3️⃣ Học Viên Xem Kết Quả

```
Kết quả test page
    ├─ Điểm tổng cộng (tính từ tất cả câu hỏi)
    ├─ Kết quả từng câu hỏi
    │   └─ Câu ESSAY:
    │       ├─ Điểm AI: X/10 
    │       ├─ Tóm tắt đánh giá
    │       ├─ Điểm mạnh
    │       ├─ Điểm cần cải thiện
    │       └─ Gợi ý cải thiện
    └─ Nút "Làm lại" (nếu chưa đạt)
```

---

## 📝 Ví Dụ Cụ Thể

### Câu Hỏi Test
```
Loại: Essay (Viết bài văn)
Nội dung: "Viết một đoạn văn về tầm quan trọng của giáo dục"
Điểm tối đa: 10 điểm
```

### Bài Viết Của Học Viên
```
"The importance of education is undeniable. Education provides 
knowledge and skills for success. It develops critical thinking. 
Moreover, it opens many career opportunities. In conclusion, 
education is essential for personal development."
```

### AI Evaluation Result
```
{
  "language": "English",
  "overallScore": 8,
  "summary": "Strong essay with clear structure and good vocabulary",
  "strengths": [
    "Well organized with introduction and conclusion",
    "Good use of transition phrases",
    "Appropriate vocabulary for academic writing"
  ],
  "weaknesses": [
    "Could include more specific examples",
    "Some sentences are a bit repetitive"
  ],
  "suggestions": [
    "Add concrete examples to support each point",
    "Vary sentence structure for better flow",
    "Include personal perspective or case study"
  ]
}
```

### Điểm Được Tính
```
AI Score: 8/10
Điểm câu hỏi: (8/10) × 10 = 8 điểm
Trạng thái: ✓ Đúng (vì score >= 7)
```

### Hiển Thị Cho Học Viên
```
┌─────────────────────────────────────────────────────┐
│ Câu 2: Viết bài văn - 8/10 điểm                     │
├─────────────────────────────────────────────────────┤
│ Câu trả lời:                                         │
│ "The importance of education is undeniable..."     │
├─────────────────────────────────────────────────────┤
│ 📊 Đánh giá từ AI                                    │
│ Ngôn ngữ: English • Điểm: 8/10                      │
│                                                      │
│ Tóm tắt:                                             │
│ "Strong essay with clear structure and good..."     │
│                                                      │
│ ✓ Điểm mạnh:                                         │
│ • Well organized with introduction...                │
│ • Good use of transition phrases                     │
│ • Appropriate vocabulary...                          │
│                                                      │
│ ⚠️ Điểm cần cải thiện:                               │
│ • Could include more specific examples               │
│ • Some sentences are a bit repetitive                │
│                                                      │
│ 💡 Gợi ý cải thiện:                                  │
│ • Add concrete examples...                           │
│ • Vary sentence structure...                         │
│ • Include personal perspective...                    │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Các File Được Thay Đổi

### 1. **`app/api/student/tests/[testId]/submit/route.ts`** (API Submit)

**Thay đổi:**
- ➕ Thêm hàm `evaluateEssayWithAI()` để gọi AI evaluation
- ➕ Sửa logic xử lý ESSAY questions
- ➕ Tự động tính điểm dựa trên AI score
- ➕ Thêm `aiEvaluation` vào response

**Cách hoạt động:**
```typescript
// Khi gặp ESSAY question
if (question.type === "ESSAY" && studentAnswer) {
  // 1. Gọi AI evaluation
  const aiResult = await evaluateEssayWithAI(studentAnswerDisplay);
  
  // 2. Convert AI score (0-10) → điểm câu hỏi (0-questionScore)
  const scorePercentage = aiResult.aiScore / 10;
  earnedScore = Math.round(question.score * scorePercentage);
  
  // 3. Tính tổng điểm
  totalScore += earnedScore;
  
  // 4. Lưu AI feedback
  aiEvaluation = { language, overallScore, summary, ... }
}
```

### 2. **`app/student/tests/[testId]/result/[attemptId]/page.tsx`** (Result Page)

**Thay đổi:**
- ➕ Thêm type `AiEvaluation`
- ➕ Thêm `aiEvaluation` field vào `QuestionResult`
- ➕ Thêm UI section hiển thị AI feedback
- ➕ Hiển thị: Ngôn ngữ, Điểm, Tóm tắt, Điểm mạnh, Điểm cần cải thiện, Gợi ý

**Hiển thị AI Feedback:**
```
📊 Đánh giá từ AI
├─ Ngôn ngữ + Điểm
├─ Tóm tắt
├─ ✓ Điểm mạnh (danh sách)
├─ ⚠️ Điểm cần cải thiện (danh sách)
└─ 💡 Gợi ý cải thiện (danh sách)
```

---

## ⚙️ Cấu Hình Cần Thiết

### 1. Đảm bảo AI Service Đang Chạy

```bash
# Kiểm tra Ollama
curl http://127.0.0.1:11434/api/tags
# Nếu OK → Ollama đang chạy

# Kiểm tra Next.js dev server
curl http://localhost:3000/api/ai/essay-evaluation
# Nếu OK → API available
```

### 2. Kiểm Tra `.env.local`

```env
# Phải có:
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

### 3. Điều Chỉnh Điểm (Optional)

Nếu muốn thay đổi ngưỡng điểm đúng/sai:

```typescript
// app/api/student/tests/[testId]/submit/route.ts
// Dòng ~65
isCorrect = aiResult.aiScore >= 7; // Thay 7 bằng giá trị khác (0-10)
```

---

## 📊 Cách Tính Điểm Chi Tiết

### Ví Dụ 1: Essay Đạt Yêu Cầu

```
Câu hỏi ESSAY
├─ Điểm tối đa: 10
├─ Bài viết học viên: "..."
├─ AI Evaluation: 8/10
├─ Tính toán:
│  ├─ Score percentage: 8/10 = 0.8
│  ├─ Earned score: 10 × 0.8 = 8 điểm
│  └─ Status: ✓ Đúng (vì 8 >= 7)
└─ Result: Học viên được 8/10 điểm

Tổng test: 8 + (các câu khác) = Điểm cuối
```

### Ví Dụ 2: Essay Không Đạt

```
Câu hỏi ESSAY
├─ Điểm tối đa: 10
├─ Bài viết học viên: "Short answer"
├─ AI Evaluation: 5/10
├─ Tính toán:
│  ├─ Score percentage: 5/10 = 0.5
│  ├─ Earned score: 10 × 0.5 = 5 điểm
│  └─ Status: ✗ Sai (vì 5 < 7)
└─ Result: Học viên được 5/10 điểm

Tổng test: 5 + (các câu khác) = Điểm cuối
```

---

## 🎓 Tính Năng Cho Học Viên

### Xem Đánh Giá Chi Tiết

Khi hoàn thành test với câu ESSAY, học viên sẽ thấy:

✅ **Điểm AI** (0-10)  
✅ **Tóm tắt đánh giá**  
✅ **Điểm mạnh** - Những điểm tốt của bài viết  
✅ **Điểm cần cải thiện** - Những điểm yếu  
✅ **Gợi ý cải thiện** - Hướng dẫn làm tốt hơn  

### Cải Thiện Viết Văn

Học viên có thể:

1. Đọc feedback chi tiết từ AI
2. Hiểu những điểm mạnh để giữ
3. Biết điểm yếu cần sửa
4. Theo gợi ý để viết tốt hơn
5. **Làm lại bài test** (nếu còn lần) với kỹ năng tốt hơn

---

## ⏱️ Thời Gian Xử Lý

| Quá Trình | Thời Gian |
|-----------|----------|
| Nhận bài test từ học viên | <1 giây |
| AI evaluation (ESSAY) | 5-15 giây |
| Xử lý câu hỏi khác | <1 giây |
| **Tổng cộng** | **5-20 giây** |

> **Lưu ý:** Lần đầu tiên có thể chậm hơn (20-45 giây) vì AI model cần load.

---

## 🐛 Xử Lý Lỗi

### Nếu AI Evaluation Không Khả Dụng

```
Status: Fallback Mode
├─ Vẫn nhận bài test bình thường
├─ Cho điểm mặc định: 5/10 (nếu có nội dung)
├─ Không có feedback từ AI
└─ Học viên vẫn thấy kết quả test
```

**Cách khắc phục:**
1. Kiểm tra Ollama: `curl http://127.0.0.1:11434/api/tags`
2. Kiểm tra `.env.local` có đúng `OLLAMA_URL`
3. Kiểm tra logs của Next.js

### Nếu Bài Viết Quá Ngắn

```
Yêu cầu AI evaluation:
├─ Tối thiểu 50 ký tự
├─ Nếu dưới 50: Không đánh giá (earnedScore = 0)
└─ Học viên được 0 điểm cho câu ESSAY
```

---

## 🔍 Kiểm Tra Hoạt Động

### 1. Tạo Bài Test Có ESSAY

```
Khóa học → Tạo test mới
├─ Thêm câu hỏi ESSAY
│  └─ Loại: "Viết bài văn"
│     Nội dung: "Viết về..."
│     Điểm: 10
└─ Lưu test
```

### 2. Học Viên Làm Bài

```
Đăng nhập → Khóa học → Làm test
├─ Trả lời các câu hỏi
├─ Viết bài cho câu ESSAY
└─ Click "Nộp bài"
```

### 3. Xem Kết Quả

```
Result page sẽ hiển thị:
├─ Điểm tổng cộng
├─ Chi tiết từng câu
│  ├─ Câu trắc nghiệm: Đúng/Sai
│  └─ Câu ESSAY:
│      ├─ 📊 Đánh giá từ AI
│      ├─ Ngôn ngữ: English/Japanese/...
│      ├─ Điểm: X/10
│      ├─ Tóm tắt
│      ├─ Điểm mạnh
│      ├─ Điểm cần cải thiện
│      └─ Gợi ý cải thiện
└─ Nút "Làm lại" (nếu cần)
```

---

## 📞 Hỗ Trợ

### Nếu Có Vấn Đề

1. **Check logs:**
   ```bash
   # Terminal chạy Next.js
   # Tìm lỗi liên quan đến "evaluateEssay" hoặc "aiEvaluation"
   ```

2. **Check Ollama:**
   ```bash
   curl http://127.0.0.1:11434/api/tags
   # Phải thấy qwen2.5:7b trong danh sách
   ```

3. **Check API:**
   ```bash
   curl http://localhost:3000/api/ai/essay-evaluation
   # Phải trả về status: "healthy"
   ```

### Tài Liệu Liên Quan

- 📖 [AI_INTEGRATION.md](./AI_INTEGRATION.md) - Toàn bộ tài liệu AI system
- 🚀 [QUICK_START.md](./QUICK_START.md) - Setup AI service
- 💻 [FRONTEND_EXAMPLES.md](./FRONTEND_EXAMPLES.md) - Ví dụ integration

---

## ✨ Tóm Tắt

### Trước Khi Tích Hợp
```
Câu ESSAY → Không có điểm tự động → Manual grading
```

### Sau Khi Tích Hợp
```
Câu ESSAY 
  ↓
AI đánh giá tự động (5-15 giây)
  ↓
Tính điểm tự động
  ↓
Hiển thị feedback chi tiết
  ↓
Học viên nhận được điểm + hướng dẫn cải thiện
```

**Kết quả:** Học viên có thể:
- ✅ Biết điểm ngay sau khi nộp bài
- ✅ Hiểu vì sao được điểm đó
- ✅ Biết cách cải thiện
- ✅ Làm lại bài để học tốt hơn

---

**Created**: May 19, 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
