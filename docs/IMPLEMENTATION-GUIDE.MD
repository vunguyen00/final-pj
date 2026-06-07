# FinnCenter Design System Implementation Guide

## 📋 Overview

Tài liệu này tóm tắt cách sử dụng design system mới cho FinnCenter và cách nó hoạt động với các pages hiện tại.

---

## 📁 Files Đã Tạo

### Documentation Files
1. **`/docs/DESIGN-SYSTEM.md`** - Design system chi tiết (12 phần)
   - Color palette, typography, layout patterns
   - Component patterns, animations, accessibility
   - Common mistakes to avoid

2. **`/docs/CODEX-SPEC.md`** - Hướng dẫn cho Codex 5.3 (12 phần)
   - Cách sử dụng base components
   - Layout patterns với examples
   - Checklist cho new pages
   - Quick start template

### Base Components (Reusable)
1. **`components/base/section.tsx`**
   - `<Section>` - Full-width section wrapper
   - `<SectionHeader>` - Title + subtitle section header

2. **`components/base/grid.tsx`**
   - `<CardGrid>` - Responsive grid for cards
   - `<GridCard>` - Reusable card component

3. **`components/base/badge.tsx`**
   - `<Badge>` - Status/category badges
   - `<BadgeGroup>` - Container for multiple badges

4. **`components/base/hero.tsx`**
   - `<Hero>` - Full hero section with image, buttons

5. **`components/base/content.tsx`**
   - `<Stats>` - Statistics display
   - `<FeatureList>` - Features with icons

---

## 🎨 Design System Principles

### Color Usage
```
✅ Semantic colors (text-foreground, bg-primary, border-border)
❌ Direct colors (text-blue-500, bg-red-400)
```

### Layout
```
✅ Flexbox (90% of layouts)
✅ CSS Grid (complex 2D layouts)
❌ Floats, absolute positioning
```

### Typography
```
✅ Inter for body text (font-sans)
✅ Playfair Display for headings (font-serif)
❌ More than 2 font families
```

### Spacing
```
✅ Gap classes (gap-4, gap-6, gap-8)
❌ Margin classes mixed with gap
```

---

## 🚀 How to Use with Pages

### Approach 1: Update Existing Pages
For each page you want to update:

1. **Read the design system**
   - `docs/DESIGN-SYSTEM.md` → Color, typography, spacing rules

2. **Choose layout pattern**
   - `docs/CODEX-SPEC.md` → Find matching pattern

3. **Use base components**
   ```tsx
   import { Section, SectionHeader } from '@/components/base/section'
   import { CardGrid, GridCard } from '@/components/base/grid'
   
   export function MyPage() {
     return (
       <Section>
         <SectionHeader title="Title" />
         <CardGrid cols={3}>
           {/* Cards */}
         </CardGrid>
       </Section>
     )
   }
   ```

4. **Replace semantic colors**
   - `bg-background` instead of `bg-white`
   - `text-foreground` instead of `text-black`
   - `border-border` instead of `border-gray-200`

### Approach 2: Create New Pages
Use quick start template in `/docs/CODEX-SPEC.md`:
```tsx
import { Section, SectionHeader } from '@/components/base/section'
import { CardGrid, GridCard } from '@/components/base/grid'
import { Button } from '@/components/ui/button'

export function NewPage() {
  return (
    <>
      <section className="py-16 md:py-24 lg:py-32">
        {/* Hero content */}
      </section>
      
      <Section background="muted">
        <SectionHeader title="Section" />
        {/* Content */}
      </Section>
    </>
  )
}
```

---

## 🔄 Updating Existing Pages - Step by Step

### Step 1: Replace Colors
```tsx
// BEFORE
<div className="bg-white text-gray-900 border border-gray-200">

// AFTER
<div className="bg-background text-foreground border border-border">
```

### Step 2: Replace Section Wrappers
```tsx
// BEFORE
<section className="py-16">
  <div className="max-w-7xl mx-auto px-4">
    {/* Content */}
  </div>
</section>

// AFTER
import { Section } from '@/components/base/section'

<Section padding="lg">
  {/* Content - padding & container handled */}
</Section>
```

### Step 3: Replace Card Grids
```tsx
// BEFORE
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => <div key={item.id} className="rounded-lg border">...</div>)}
</div>

// AFTER
import { CardGrid, GridCard } from '@/components/base/grid'

<CardGrid cols={3} gap="md">
  {items.map(item => (
    <GridCard key={item.id} title={item.title} description={item.desc} />
  ))}
</CardGrid>
```

### Step 4: Wrap Long Titles
```tsx
// BEFORE
<h1>Long Title That Might Break on Mobile</h1>

// AFTER
<h1 className="text-pretty">Long Title That Might Break on Mobile</h1>
```

### Step 5: Use Semantic Tokens Everywhere
```tsx
// ✅ CORRECT - All pages should follow this pattern
<Card className="border-border bg-card">
  <h3 className="text-foreground font-semibold">Title</h3>
  <p className="text-muted-foreground">Description</p>
  <Button>Action</Button>
</Card>
```

---

## 📊 Page Update Priority

Based on the UI interfaces document, pages to update in order:

### Priority 1 (Most Visible)
- `app/page.tsx` (Homepage)
- `app/courses/page.tsx`
- `app/courses/[id]/page.tsx`

### Priority 2 (User Areas)
- `app/auth/login/page.tsx`
- `app/auth/register/page.tsx`
- `app/student/page.tsx`
- `app/teacher/page.tsx`

### Priority 3 (Content Pages)
- `app/about/page.tsx`
- `app/teachers/page.tsx`
- `app/top-students/page.tsx`

### Priority 4 (Admin/Dashboard)
- `app/admin/page.tsx`
- Admin management pages

---

## 🎯 Key Guidelines

### DO ✅
1. Always use `Section` component for full-width sections
2. Always use semantic color tokens
3. Always use `text-pretty` for titles
4. Always use base components (CardGrid, Hero, etc.)
5. Always follow mobile-first responsive (1col → 2col → 3col)
6. Always wrap text in proper heading hierarchy (h1 → h2 → h3)
7. Always use shadcn/ui components (Button, Card, Input, etc.)

### DON'T ❌
1. Don't use direct colors (text-blue-500, bg-red-400)
2. Don't create new card components (use CardGrid + GridCard)
3. Don't use absolute positioning
4. Don't create custom CSS when Tailwind works
5. Don't skip heading levels (h1 → h4 is bad)
6. Don't create UI components that shadcn already provides
7. Don't forget responsive design on mobile

---

## 🛠️ Available Base Components

All in `components/base/`:

```tsx
// section.tsx
<Section padding="sm|md|lg" background="default|muted|primary" />
<SectionHeader title="Title" subtitle="Subtitle" centered />

// grid.tsx
<CardGrid cols={1|2|3|4} gap="sm|md|lg" />
<GridCard title="Title" description="Desc" icon={Icon} badge="Badge" />

// badge.tsx
<Badge variant="default|secondary|success|warning|error|info" />
<BadgeGroup gap="sm|md|lg" />

// hero.tsx
<Hero
  title="Title"
  subtitle="Subtitle"
  description="Description"
  primaryAction={{ label: "Button", href: "/" }}
  image={<ImageComponent />}
/>

// content.tsx
<Stats stats={[{ value: "50K", label: "Users", icon: <Icon /> }]} />
<FeatureList items={[{ icon: <Icon />, title: "Title", description: "Desc" }]} />
```

---

## 🔗 How Pages Reference This System

### In Root Layout
```tsx
// app/layout.tsx already has:
- Font imports (Inter, Playfair Display)
- globals.css with design tokens
- Metadata setup
```

### In Any Page
```tsx
// 1. Import base components
import { Section, SectionHeader } from '@/components/base/section'

// 2. Use semantic colors from globals.css (automatic)

// 3. Follow patterns from CODEX-SPEC.md

// 4. Test in browser for mobile/tablet/desktop
```

---

## 📱 Testing Checklist

When updating pages:

- [ ] Mobile (375px - 640px)
  - [ ] Text is readable
  - [ ] Images scale down
  - [ ] Buttons are clickable (44px+)
  - [ ] Navigation works
  
- [ ] Tablet (641px - 1024px)
  - [ ] Layout changes appropriately
  - [ ] Grid shows 2 columns
  
- [ ] Desktop (1025px+)
  - [ ] Full layout displays
  - [ ] Grid shows 3 columns
  - [ ] Hover effects work

- [ ] Colors
  - [ ] Light mode looks good
  - [ ] Dark mode looks good (if enabled)
  - [ ] Contrast is sufficient

- [ ] Typography
  - [ ] Titles wrap nicely
  - [ ] Text is readable
  - [ ] Line heights are appropriate

---

## 🎓 Learning the System

1. **Start**: Read `/docs/DESIGN-SYSTEM.md` (10 mins)
2. **Learn**: Read `/docs/CODEX-SPEC.md` (15 mins)
3. **Practice**: Update one page using patterns
4. **Apply**: Use same patterns on other pages
5. **Master**: Create new pages from scratch

---

## 📞 Common Questions

**Q: Can I use custom CSS?**
A: No, use Tailwind utilities + base components instead.

**Q: Can I add new colors?**
A: No, use existing semantic tokens. If you need a status color (success/warning/error), use the badge color patterns.

**Q: Can I create a new UI component?**
A: Check shadcn first. If not there, check base components. Only create if truly unique.

**Q: How do I handle dark mode?**
A: Automatically! CSS variables in globals.css handle it.

**Q: When should I use CardGrid vs grid?**
A: Always use CardGrid for card layouts. Use grid for tables/dashboards.

---

## 🚀 Next Steps

1. **Bookmark these files:**
   - `docs/DESIGN-SYSTEM.md` - Design reference
   - `docs/CODEX-SPEC.md` - Implementation guide

2. **Review base components:**
   - Import from `components/base/*`
   - Use in your pages

3. **Update existing pages:**
   - Follow step-by-step guide above
   - Test on mobile/tablet/desktop

4. **Create new pages:**
   - Use quick start template
   - Follow design system
   - Test responsiveness

---

**Last Updated:** June 2026  
**Design System Version:** 1.0  
**For:** FinnCenter Project
