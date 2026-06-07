# FinnCenter Design System v1.0

## Mục đích
Tài liệu này định nghĩa các tiêu chuẩn thiết kế, component patterns, và layout rules cho tất cả các pages trong FinnCenter. Sử dụng tài liệu này để đảm bảo tính nhất quán qua toàn bộ dự án.

---

## 1. COLOR PALETTE

### Primary Colors (Sử dụng từ OKLch color system)
```
--primary: oklch(0.55 0.2 250)          # Xanh dương chính
--primary-foreground: oklch(1 0 0)      # Text trên primary

--accent: oklch(0.65 0.15 160)          # Xanh lục (teal accent)
--accent-foreground: oklch(1 0 0)       # Text trên accent

--secondary: oklch(0.96 0.01 240)       # Xám nhạt
--secondary-foreground: oklch(0.15 0.02 250)  # Text trên secondary
```

### Neutral Colors
```
--background: oklch(0.985 0.002 240)    # Nền chính
--foreground: oklch(0.15 0.02 250)      # Text mặc định

--card: oklch(1 0 0)                    # Màu card
--card-foreground: oklch(0.15 0.02 250) # Text trong card

--muted: oklch(0.94 0.01 240)           # Placeholder, secondary text
--muted-foreground: oklch(0.45 0.02 250) # Text trên muted

--border: oklch(0.9 0.01 240)           # Đường viền
--input: oklch(0.92 0.01 240)           # Input background

--destructive: oklch(0.577 0.245 27.325) # Màu lỗi/xóa (đỏ)
--destructive-foreground: oklch(1 0 0)   # Text trên destructive
```

### Usage Rules
- **Không sử dụng** màu trực tiếp (ví dụ: `text-blue-500`, `bg-red-400`)
- **Luôn sử dụng** semantic colors: `text-foreground`, `bg-background`, `border-border`, `bg-primary`, etc.
- **Dark mode** tự động áp dụng các giá trị khác (định nghĩa trong `:root` và `.dark`)

---

## 2. TYPOGRAPHY

### Fonts
```
Font Sans (Body):    Inter - Mặc định cho tất cả text
Font Display:        Playfair Display - Dùng cho headings lớn (h1, hero titles)
Font Mono:           Geist Mono - Code, technical text

Variable names:
--font-inter      (dùng với class: font-sans)
--font-playfair   (dùng với class: font-serif)
```

### Type Scale
```
h1:  text-4xl md:text-5xl font-bold leading-tight
h2:  text-3xl md:text-4xl font-bold leading-snug
h3:  text-2xl md:text-3xl font-semibold
h4:  text-xl md:text-2xl font-semibold
h5:  text-lg font-semibold
h6:  text-base font-semibold

body: text-base leading-relaxed
small: text-sm leading-relaxed
```

### Line Heights & Spacing
```
heading: leading-tight (1.2)
body: leading-relaxed (1.625)
compact: leading-normal (1.5)
```

### Usage Rules
- Headings: Sử dụng Playfair Display cho tác động mạnh (`font-serif`)
- Body text: Sử dụng Inter (`font-sans`) cho đọc dễ
- Luôn wrap titles dài trong `<span className="text-balance">` hoặc `<h className="text-pretty">`
- Các link/button text nên rõ ràng, dùng semantic HTML tags

---

## 3. LAYOUT & SPACING

### Layout Method Priority
1. **Flexbox** (90% cases): `flex items-center justify-between`, `flex flex-col gap-4`
2. **CSS Grid** (complex 2D): `grid grid-cols-3 gap-4` cho dashboards, galleries
3. Không dùng floats hoặc absolute positioning

### Spacing Scale (Tailwind)
```
xs: 2px (gap-0.5)
sm: 4px (gap-1)
md: 8px (gap-2)
lg: 12px (gap-3)
xl: 16px (gap-4)
2xl: 24px (gap-6)
3xl: 32px (gap-8)
4xl: 48px (gap-12)
5xl: 64px (gap-16)
```

### Container & Max-Width
```
.container: max-w-7xl (1280px) - standard pages
.container-lg: max-w-4xl (896px) - narrower sections
.container-md: max-w-2xl (672px) - forms, modals

Usage: <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
```

### Responsive Breakpoints
```
sm: 640px   (mobile landscape)
md: 768px   (tablet)
lg: 1024px  (desktop)
xl: 1280px  (large desktop)

Pattern: md:grid-cols-2 lg:grid-cols-3 (mobile-first)
```

### Padding & Margins
- **Section padding**: `py-12 md:py-16 lg:py-20` (vertical spacing between sections)
- **Container padding**: `px-4 sm:px-6 lg:px-8` (horizontal, inside container)
- **Card padding**: `p-4 md:p-6 lg:p-8` (inside cards)
- **Gap**: Luôn dùng `gap-` thay vì margin cho children

---

## 4. COMPONENT PATTERNS

### Buttons
```tsx
// Primary action
<Button>Start Learning</Button>

// Secondary
<Button variant="outline">Learn More</Button>

// Ghost (link-like)
<Button variant="ghost">Cancel</Button>

// Sizes
<Button size="sm">Small</Button>
<Button>Default</Button>
<Button size="lg">Large</Button>

// Icon + Text
<Button><Icon className="h-4 w-4 mr-2" />Start</Button>
```

### Cards
```tsx
<Card>
  <div className="p-4 md:p-6">
    <h3 className="text-lg font-semibold">Title</h3>
    <p className="text-muted-foreground">Description</p>
  </div>
</Card>

// Card Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => <Card key={item.id}>...</Card>)}
</div>
```

### Sections
```tsx
<section className="py-12 md:py-16 lg:py-20 bg-background">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <h2 className="text-3xl font-bold text-center mb-12">Section Title</h2>
    {/* Content */}
  </div>
</section>
```

### Badge / Tag
```tsx
<Badge variant="default">Pro</Badge>
<Badge variant="secondary">Beginner</Badge>
<Badge variant="outline">Pending</Badge>

// Usage: CEFR levels, status tags, language labels
<Badge className="bg-amber-100 text-amber-900">A1</Badge>
<Badge className="bg-blue-100 text-blue-900">B2</Badge>
```

### Input Groups
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" placeholder="your@email.com" />
</div>
```

### Lists / Tables
```tsx
// For admin/dashboard: use <Table> component from shadcn
// For content: use grid or flex + cards
```

---

## 5. ANIMATION & INTERACTIONS

### Hover States
```
Links/Buttons:    transition-colors duration-200 hover:text-primary
Cards:            transition-all duration-300 hover:shadow-lg hover:scale-105
Icons:            transition-transform hover:scale-110
```

### Transitions
```
Fast:   duration-200  (small interactive elements)
Normal: duration-300  (cards, sections)
Slow:   duration-500  (major transitions)
```

### No Animations
- Không dùng gradients nếu không cần (sử dụng solid colors)
- Không dùng blurs hoặc decorative effects nếu chưa được yêu cầu
- Keep animations subtle, professional

---

## 6. LAYOUT TEMPLATES

### Full-Width Section Template
```tsx
export function SectionName() {
  return (
    <section className="py-12 md:py-16 lg:py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-pretty mb-4">
          Section Title
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Description text here
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Cards/Items */}
        </div>
      </div>
    </section>
  )
}
```

### Hero Section Template
```tsx
export function Hero() {
  return (
    <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-pretty mb-4">
              Main Heading
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Supporting paragraph
            </p>
            <div className="flex gap-4">
              <Button>Primary Action</Button>
              <Button variant="outline">Secondary Action</Button>
            </div>
          </div>
          <div>
            {/* Image or visual */}
          </div>
        </div>
      </div>
    </section>
  )
}
```

### Grid + Cards Template
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item) => (
    <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-all">
      {/* Image */}
      <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20" />
      
      <div className="p-4 md:p-6">
        <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
        <Button variant="outline" size="sm" className="w-full">Learn More</Button>
      </div>
    </Card>
  ))}
</div>
```

---

## 7. DARK MODE

### Automatic Handling
- Tất cả màu sắc tự động chuyển đổi thông qua CSS variables
- Không cần viết `dark:` classes cho màu cơ bản
- Chỉ sử dụng `dark:` cho styling đặc biệt (ví dụ: `dark:shadow-2xl`)

### Testing Dark Mode
```bash
# Add class="dark" to <html> tag để test dark mode
```

---

## 8. COMMON PATTERNS

### Status Badges
```tsx
<div className="flex gap-2">
  <Badge className="bg-emerald-100 text-emerald-900">Active</Badge>
  <Badge className="bg-amber-100 text-amber-900">Pending</Badge>
  <Badge className="bg-red-100 text-red-900">Failed</Badge>
</div>
```

### Language Pills
```tsx
<div className="flex gap-2 flex-wrap">
  {languages.map(lang => (
    <span key={lang.code} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
      {lang.flag} {lang.name}
    </span>
  ))}
</div>
```

### Stats / Highlights
```tsx
<div className="grid grid-cols-3 gap-4 py-8">
  <div className="text-center">
    <div className="text-3xl font-bold text-primary">50K+</div>
    <div className="text-sm text-muted-foreground">Students</div>
  </div>
  {/* More stats */}
</div>
```

### Empty State
```tsx
<div className="text-center py-12">
  <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
  <h3 className="text-lg font-semibold mb-2">No Results</h3>
  <p className="text-muted-foreground mb-6">Try adjusting your filters</p>
  <Button>Reset Filters</Button>
</div>
```

---

## 9. ACCESSIBILITY

### Must Have
- Semantic HTML: `<header>`, `<main>`, `<section>`, `<nav>`
- Alt text cho tất cả images (trừ decorative images)
- `aria-label` cho icons-only buttons
- Proper heading hierarchy (h1 → h2 → h3, không skip levels)
- Labels cho input fields

### Best Practices
- Contrast ratio ≥ 4.5:1 cho body text
- Focus states trên interactive elements
- Keyboard navigation support
- Mobile-friendly tap targets (≥ 44px)

---

## 10. FILE STRUCTURE

```
app/
  layout.tsx           # Root layout (fonts, metadata, Header)
  globals.css          # Theme variables, base styles
  page.tsx             # Homepage
  
  auth/
    layout.tsx         # Auth centered layout
    login/page.tsx
    register/page.tsx
  
  admin/
    layout.tsx         # Admin sidebar layout
    page.tsx
  
  teacher/
    layout.tsx         # Teacher layout
    page.tsx
  
  student/
    layout.tsx         # Student dashboard layout
    page.tsx

components/
  # Reusable full-section components
  hero.tsx
  footer.tsx
  
  # Reusable partial components
  sections/
    courses-grid.tsx
    testimonials.tsx
  
  # UI library (shadcn)
  ui/
    button.tsx
    card.tsx
    ... etc

lib/
  utils.ts             # Helper functions (cn, etc.)
  constants.ts         # App constants
```

---

## 11. COMMON MISTAKES TO AVOID

❌ **DON'T:**
- Sử dụng các màu trực tiếp (text-blue-500, bg-red-400)
- Viết custom CSS khi có thể dùng Tailwind
- Tạo component mới khi shadcn có sẵn
- Lạm dụng absolute positioning
- Quên wrap long titles trong text-balance
- Không responsive (chỉ desktop design)
- Sử dụng emojis làm icons

✅ **DO:**
- Sử dụng semantic color tokens (text-foreground, bg-primary, border-border)
- Tối đa hóa Tailwind utility classes
- Reuse components từ shadcn
- Flexbox/Grid cho layout
- Text balance cho headings
- Mobile-first responsive design
- Lucide icons cho icons

---

## 12. UPDATING THIS DOCUMENT

Khi thêm quy tắc thiết kế mới:
1. Cập nhật phần thích hợp trong tài liệu
2. Cung cấp ví dụ code rõ ràng
3. Giải thích khi nào và tại sao sử dụng pattern
4. Cập nhật trong tất cả các pages có liên quan

---

**Phiên bản:** 1.0  
**Cập nhật lần cuối:** June 2026  
**Cho Codex:** Sử dụng tài liệu này làm reference khi thiết kế hoặc cập nhật bất kỳ page nào
