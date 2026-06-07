# Codex 5.3 Specification for FinnCenter

## Dành cho AI/Codex Model - Hướng dẫn tự động thiết kế pages

Khi thiết kế hoặc cập nhật bất kỳ page nào trong FinnCenter, **luôn tuân theo quy tắc dưới đây**.

---

## I. NGUYÊN TẮC CHUNG

### 1. Luôn Đọc Design System Trước
- Tham khảo `/docs/DESIGN-SYSTEM.md` cho color palette, typography, spacing
- Không bao giờ sử dụng màu trực tiếp (ví dụ: `text-blue-500`)
- Sử dụng semantic tokens: `bg-background`, `text-foreground`, `border-border`

### 2. Sử Dụng Base Components
Các file base components có sẵn để reuse:

```typescript
// components/base/section.tsx
import { Section, SectionHeader } from '@/components/base/section'

// components/base/grid.tsx
import { CardGrid, GridCard } from '@/components/base/grid'

// components/base/badge.tsx
import { Badge, BadgeGroup } from '@/components/base/badge'

// components/base/hero.tsx
import { Hero } from '@/components/base/hero'

// components/base/content.tsx
import { Stats, FeatureList } from '@/components/base/content'
```

### 3. Shadcn/UI Components
Những component này sẵn có trong project:

```typescript
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
// ... và hơn 50 components khác từ shadcn
```

**Không cần** install thêm UI libraries khác.

---

## II. LAYOUT PATTERNS

### Pattern 1: Section with Cards Grid
```tsx
import { Section, SectionHeader } from '@/components/base/section'
import { CardGrid, GridCard } from '@/components/base/grid'

export function CoursesSection() {
  const courses = [
    { id: 1, title: 'Finnish Basics', description: 'Learn essentials', icon: <Icon /> },
    // ...
  ]

  return (
    <Section background="muted" padding="lg">
      <SectionHeader
        title="Our Courses"
        subtitle="Choose your learning path"
        centered
      />
      <CardGrid cols={3} gap="md">
        {courses.map(course => (
          <GridCard
            key={course.id}
            title={course.title}
            description={course.description}
            icon={course.icon}
            badge="Beginner"
          />
        ))}
      </CardGrid>
    </Section>
  )
}
```

### Pattern 2: Hero Section
```tsx
import { Hero } from '@/components/base/hero'
import { BookOpen } from 'lucide-react'

export function HeroSection() {
  return (
    <Hero
      title="Master Languages with FinnCenter"
      subtitle="Expert-Led Courses"
      description="Join thousands of students learning real-world language skills"
      primaryAction={{
        label: 'Start Learning',
        href: '/courses',
      }}
      secondaryAction={{
        label: 'Learn More',
        href: '#courses',
      }}
    />
  )
}
```

### Pattern 3: Features Section
```tsx
import { Section, SectionHeader } from '@/components/base/section'
import { FeatureList } from '@/components/base/content'
import { Mic, BookOpen, Users, Award } from 'lucide-react'

export function FeaturesSection() {
  const features = [
    {
      icon: <Mic className="h-6 w-6" />,
      title: 'Speaking Practice',
      description: 'AI-powered speaking feedback'
    },
    // ...
  ]

  return (
    <Section padding="lg">
      <SectionHeader title="Why Choose FinnCenter" centered />
      <FeatureList items={features} layout="grid" />
    </Section>
  )
}
```

### Pattern 4: Stats Section
```tsx
import { Section } from '@/components/base/section'
import { Stats } from '@/components/base/content'
import { Users, BookOpen, Trophy } from 'lucide-react'

export function StatsSection() {
  const stats = [
    { value: '50K+', label: 'Active Students', icon: <Users /> },
    { value: '100+', label: 'Courses', icon: <BookOpen /> },
    // ...
  ]

  return (
    <Section background="primary" padding="lg">
      <Stats stats={stats} layout="grid" />
    </Section>
  )
}
```

---

## III. COLOR USAGE EXAMPLES

### ✅ CORRECT (Semantic Colors)
```tsx
<div className="bg-background text-foreground border border-border">
  <h1 className="text-primary font-bold">Primary Action</h1>
  <p className="text-muted-foreground">Secondary text</p>
  <Button className="bg-accent text-accent-foreground">Action</Button>
  <span className="bg-destructive text-destructive-foreground">Error</span>
</div>
```

### ❌ WRONG (Direct Colors)
```tsx
<div className="bg-blue-500 text-gray-700">  {/* BAD */}
  <h1 className="text-blue-900">Title</h1>  {/* BAD */}
  <Button className="bg-red-600">Action</Button>  {/* BAD */}
</div>
```

### ✅ Status Badge Colors (Exception)
```tsx
// These are acceptable for status-specific colors:
<Badge className="bg-emerald-100 text-emerald-900">Active</Badge>
<Badge className="bg-amber-100 text-amber-900">Pending</Badge>
<Badge className="bg-red-100 text-red-900">Failed</Badge>
<Badge className="bg-blue-100 text-blue-900">B2 Level</Badge>
```

---

## IV. RESPONSIVE DESIGN RULES

### Mobile-First Approach
```tsx
// ✅ CORRECT
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* 1 column mobile → 2 tablet → 3 desktop */}
</div>

<h1 className="text-2xl md:text-3xl lg:text-4xl">
  {/* 24px mobile → 30px tablet → 36px desktop */}
</h1>

<div className="px-4 md:px-6 lg:px-8">
  {/* Responsive padding */}
</div>

// ❌ WRONG
<div className="grid grid-cols-3 sm:grid-cols-2 xs:grid-cols-1">
  {/* Desktop-first (BAD) */}
</div>
```

### Container Padding
```tsx
// Use inside Section wrapper (already has this):
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
  {/* Padding automatically handled */}
</div>
```

---

## V. TEXT & TYPOGRAPHY RULES

### Heading Hierarchy
```tsx
<h1 className="text-4xl md:text-5xl font-bold leading-tight text-pretty">
  Page Title
</h1>

<h2 className="text-3xl md:text-4xl font-bold mb-12">
  Section Title
</h2>

<h3 className="text-2xl font-semibold mb-6">
  Card Title
</h3>

// Never skip levels: h1 → h2 → h3, etc.
```

### Text Wrapping
```tsx
// ✅ Long titles should wrap nicely
<h1 className="text-4xl font-bold text-pretty">
  Master Languages with Expert Teachers and Real-World Practice
</h1>

// ✅ Use text-balance for balanced line breaks
<h2 className="text-2xl font-bold text-balance">
  Why Thousands Choose FinnCenter
</h2>
```

### Body Text
```tsx
<p className="text-base leading-relaxed text-foreground">
  Standard paragraph text
</p>

<p className="text-sm leading-relaxed text-muted-foreground">
  Secondary/muted text (descriptions, helper text)
</p>
```

---

## VI. SPACING RULES

### Margin vs Gap
```tsx
// ✅ Use gap for spacing between children
<div className="flex flex-col gap-4">
  <Item />
  <Item />
  <Item />
</div>

// ✅ Use gap for grid
<div className="grid grid-cols-3 gap-6">
  <Item />
  <Item />
  <Item />
</div>

// ❌ Don't mix margin + gap
<div className="flex gap-4">
  <Item className="mb-4" />  {/* BAD - don't mix */}
  <Item />
</div>
```

### Section Spacing
```tsx
// Always use Section component for consistency
<Section padding="lg">  {/* py-16 md:py-20 lg:py-24 */}
  {/* Content */}
</Section>

<Section padding="md">  {/* py-12 md:py-14 lg:py-16 */}
  {/* Content */}
</Section>

<Section padding="sm">  {/* py-8 md:py-10 lg:py-12 */}
  {/* Content */}
</Section>
```

### Card Internal Spacing
```tsx
<Card>
  <div className="p-4 md:p-6">  {/* Responsive card padding */}
    <h3 className="font-semibold mb-2">Title</h3>
    <p className="text-muted-foreground mb-4">Description</p>
  </div>
</Card>
```

---

## VII. COMPONENT EXAMPLES

### Button Usage
```tsx
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

// Primary button
<Button>Start Learning</Button>

// Secondary button
<Button variant="outline">Learn More</Button>

// Ghost button
<Button variant="ghost">Cancel</Button>

// With icon
<Button>
  Get Started
  <ArrowRight className="h-4 w-4 ml-2" />
</Button>

// Size variants
<Button size="sm">Small</Button>
<Button>Default</Button>
<Button size="lg">Large</Button>
```

### Form Inputs
```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

<div className="space-y-2">
  <Label htmlFor="email">Email Address</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    className="bg-background"
  />
</div>

<div className="space-y-2">
  <Label htmlFor="message">Message</Label>
  <Textarea
    id="message"
    placeholder="Enter your message"
    rows={4}
    className="bg-background"
  />
</div>
```

### Card Variations
```tsx
import { Card } from '@/components/ui/card'

// Simple card
<Card className="p-6">
  <h3 className="font-semibold mb-2">Title</h3>
  <p className="text-muted-foreground">Description</p>
</Card>

// Card with hover effect
<Card className="p-6 hover:shadow-lg transition-all duration-300">
  <h3 className="font-semibold mb-2">Interactive Card</h3>
</Card>

// Card grid (use CardGrid component)
<CardGrid cols={3} gap="md">
  <GridCard title="Item 1" description="Description" />
  <GridCard title="Item 2" description="Description" />
  <GridCard title="Item 3" description="Description" />
</CardGrid>
```

---

## VIII. COMMON MISTAKES TO AVOID

### ❌ Mistake 1: Using Direct Colors
```tsx
// BAD
<div className="bg-blue-500 text-white">Content</div>

// GOOD
<div className="bg-primary text-primary-foreground">Content</div>
```

### ❌ Mistake 2: Mixing Layout Methods
```tsx
// BAD - mixing absolute + flexbox
<div className="flex">
  <div className="absolute">Item</div>
</div>

// GOOD
<div className="flex gap-4">
  <div>Item</div>
  <div>Item</div>
</div>
```

### ❌ Mistake 3: Non-responsive Design
```tsx
// BAD
<div className="grid grid-cols-3">Single size</div>
<h1 className="text-4xl">No responsive</h1>

// GOOD
<div className="grid grid-cols-1 md:grid-cols-3">Responsive</div>
<h1 className="text-2xl md:text-4xl">Scales properly</h1>
```

### ❌ Mistake 4: Breaking Hierarchy
```tsx
// BAD
<h1>Main Title</h1>
<h4>Skipped h2 and h3!</h4>

// GOOD
<h1>Main Title</h1>
<h2>Section Title</h2>
<h3>Subsection</h3>
```

### ❌ Mistake 5: Forgetting Text Wrapping
```tsx
// BAD - breaks on mobile
<h1>Master Languages with Expert Teachers</h1>

// GOOD - wraps nicely
<h1 className="text-pretty">Master Languages with Expert Teachers</h1>
```

---

## IX. FILE NAMING & ORGANIZATION

### New Page Example
```
pages/
  courses/
    page.tsx          # Main page
    layout.tsx        # Page layout (if different from root)
    
components/
  courses/
    courses-hero.tsx        # Hero section for courses page
    courses-grid.tsx        # Courses list grid
    course-filters.tsx      # Filter component
```

### Component Naming Convention
```
// Section components (full-width sections)
components/[feature]/[feature]-section.tsx
components/courses/courses-section.tsx
components/pricing/pricing-section.tsx

// Partial components
components/[feature]/[component].tsx
components/courses/course-card.tsx
components/courses/course-filters.tsx

// Base/reusable
components/base/[base-component].tsx
components/base/section.tsx
components/base/grid.tsx
```

---

## X. CHECKLIST FOR NEW PAGES

When creating a new page, ensure:

```
✅ Typography
  - [ ] Headings follow h1 → h2 → h3 hierarchy (no skipping)
  - [ ] Long titles use text-pretty or text-balance
  - [ ] Body text uses text-base leading-relaxed
  - [ ] Secondary text uses text-muted-foreground

✅ Colors
  - [ ] Only semantic color tokens used (no direct colors)
  - [ ] Status badges use appropriate colors (emerald/amber/red)
  - [ ] Dark mode contrast tested

✅ Layout
  - [ ] Mobile-first responsive (1 col → 2 col → 3 col)
  - [ ] Uses Section component for full-width sections
  - [ ] Proper spacing with gap, not margin
  - [ ] Max-width container applied (mx-auto max-w-7xl)

✅ Components
  - [ ] Uses shadcn/ui components (Button, Card, Input, etc.)
  - [ ] Uses base components (Section, CardGrid, Hero, etc.)
  - [ ] No duplicate component creation
  - [ ] Consistent button styles

✅ Accessibility
  - [ ] Semantic HTML (header, main, section, nav)
  - [ ] Images have alt text
  - [ ] Icon buttons have aria-label
  - [ ] Forms have proper labels
  - [ ] Links/buttons obvious and clickable

✅ Performance
  - [ ] No unnecessary re-renders
  - [ ] "use client" only when needed
  - [ ] Images optimized
  - [ ] No console errors or warnings
```

---

## XI. QUICK START TEMPLATE

When starting a new page:

```tsx
import { Section, SectionHeader } from '@/components/base/section'
import { CardGrid, GridCard } from '@/components/base/grid'
import { Button } from '@/components/ui/button'

export function PageName() {
  const items = [
    { id: 1, title: 'Item 1', description: 'Description' },
    // ...
  ]

  return (
    <>
      {/* Hero Section */}
      <section className="py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-pretty mb-4">
            Page Title
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Subtitle or description
          </p>
          <Button size="lg">Primary Action</Button>
        </div>
      </section>

      {/* Content Section */}
      <Section background="muted" padding="lg">
        <SectionHeader title="Section Title" centered />
        <CardGrid cols={3} gap="md">
          {items.map(item => (
            <GridCard
              key={item.id}
              title={item.title}
              description={item.description}
            />
          ))}
        </CardGrid>
      </Section>
    </>
  )
}
```

---

## XII. UPDATING THIS SPECIFICATION

When updating this document:
1. Edit `/docs/CODEX-SPEC.md`
2. Add examples for new patterns
3. Update the checklist if new requirements added
4. Keep it concise and practical

---

**Version:** 1.0 (Codex 5.3)  
**Last Updated:** June 2026  
**For:** Automated page design and updates

Use this as your reference when:
- Creating new pages
- Updating existing pages
- Designing new sections
- Adding new features to existing pages
