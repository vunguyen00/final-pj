from pathlib import Path
import zipfile
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'prisma-fields-table.docx'

SECTIONS = [
    ("1. Tài khoản và xác thực", [
        ("User", "id, username, email, password, role, phoneNumber, isBanned, learningLanguageId, createdAt"),
        ("Session", "id, userId, tokenHash, expiresAt, createdAt"),
        ("PasswordResetOtp", "id, userId, email, codeHash, expiresAt, consumedAt, attempts, createdAt"),
        ("Wallet", "id, userId, balance, createdAt, updatedAt"),
        ("Notification", "id, userId, title, body, readAt, createdAt"),
        ("EmailLog", "id, userId, to, subject, status, error, sentAt, createdAt"),
    ]),
    ("2. Khóa học và học tập", [
        ("Course", "id, name, description, thumbnail, category, level, duration, lessons, status, price, languageId, instructorId, createdAt, updatedAt"),
        ("Module", "id, courseId, name, order"),
        ("Lesson", "id, moduleId, title, content, videoUrl"),
        ("Enrollment", "id, userId, courseId, createdAt"),
        ("Feedback", "id, userId, courseId, content, createdAt"),
        ("LearningLanguage", "id, name, code, isActive, createdAt, updatedAt"),
    ]),
    ("3. Bài test", [
        ("Test", "id, courseId, languageId, kind, assessmentMode, name, description, maxScore, passingScore, maxAttempts, timeLimit, shuffleQuestions, createdAt, updatedAt"),
        ("Question", "id, testId, type, content, audioUrl, order, score, explanation, hint, createdAt, updatedAt"),
        ("Answer", "id, questionId, content, isCorrect, order, feedback"),
        ("TestAttempt", "id, testId, userId, attemptNo, score, maxScore, answers, results, startedAt, submittedAt, isPassed"),
        ("CheatingLog", "id, attemptId, type, severity, createdAt"),
        ("AntiCheatLog", "id, applicationId, testAttemptId, eventType, detail, severity, serverTimestamp"),
    ]),
    ("4. AI và hoạt động học", [
        ("AiAssessment", "id, userId, courseId, type, taskType, title, prompt, submissionText, audioUrl, durationSeconds, score, bandSystem, bandLevel, bandScore, criteria, feedback, mistakes, improvements, sampleAnswer, submittedAt"),
        ("PointTransaction", "id, userId, courseId, type, amount, balanceAfter, sourceKey, description, metadata, createdAt"),
        ("LearningActivity", "id, userId, courseId, activityType, sourceKey, activityDate, createdAt"),
    ]),
    ("5. Thanh toán và giảng viên", [
        ("Order", "id, userId, createdAt"),
        ("OrderItem", "id, orderId, courseId, price, adminRevenue, teacherRevenue, revenueSplit"),
        ("Payment", "id, orderId, userId, provider, txnRef, amount, status, orderInfo, bankCode, transactionNo, responseCode, transactionStatus, payDate, createdAt"),
        ("CourseRefundRequest", "id, studentId, courseId, orderItemId, amount, reason, status, adminNote, reviewedById, processedAt, createdAt"),
        ("TeacherApplication", "id, userId, languageId, status, attemptNo, entranceTestId, entranceAttemptId, answerState, submittedAt, reviewedAt, reviewedById, rejectionReason, createdAt"),
        ("TeacherCertificate", "id, applicationId, fileName, fileUrl, fileType, fileSize, expiryDate, createdAt"),
        ("TeacherRevenueWithdrawal", "id, teacherId, amount, bankName, accountNumber, accountName, status, note, processedAt, createdAt"),
        ("TeacherRevenueWithdrawalComplaint", "id, withdrawalId, teacherId, reason, reportedAmount, message, status, adminNote, resolvedAt, createdAt"),
    ]),
]


def para(text, style=None):
    style_xml = f'<w:pStyle w:val="{style}"/>' if style else ''
    return f'<w:p><w:pPr>{style_xml}</w:pPr><w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'


def table(rows):
    def make_cell(text, bold=False):
        rpr = '<w:rPr><w:b/></w:rPr>' if bold else ''
        return f'<w:tc><w:p><w:r>{rpr}<w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p></w:tc>'

    rows_xml = []
    rows_xml.append(f'<w:tr>{make_cell("Bảng", True)}{make_cell("Các trường chính", True)}</w:tr>')
    for name, fields in rows:
        rows_xml.append(f'<w:tr>{make_cell(name)}{make_cell(fields)}</w:tr>')

    return f'''<w:tbl>
      <w:tblPr><w:tblBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders></w:tblPr>
      <w:tblGrid><w:gridCol w:w="1800"/><w:gridCol w:w="7800"/></w:tblGrid>
      {''.join(rows_xml)}
    </w:tbl>'''


body_xml = []
body_xml.append(para('ERD Prisma - Thống kê các trường chính', 'Title'))
body_xml.append(para('Tài liệu này tổng hợp các trường chính của các bảng trong Prisma để dùng cho báo cáo.', None))
for title, rows in SECTIONS:
    body_xml.append(para(title, 'Heading1'))
    body_xml.append(table(rows))
    body_xml.append(para(''))

body_xml_text = ''.join(body_xml)
document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body_xml_text}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>'''

content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>'''

styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:qFormat/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:qFormat/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:qFormat/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
</w:styles>'''

rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.writestr('[Content_Types].xml', content_types)
    zf.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
    zf.writestr('word/document.xml', document_xml)
    zf.writestr('word/styles.xml', styles)
    zf.writestr('word/_rels/document.xml.rels', rels)

print(f'Created {OUT}')
