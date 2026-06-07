# FinnCenter Design System - Documentation Index

## 📚 Quick Navigation

### 1️⃣ For Designers & Product Owners
**Start here:** `/docs/DESIGN-SYSTEM.md`
- Color palette & semantics
- Typography rules
- Layout patterns
- Component guidelines
- Accessibility standards

### 2️⃣ For Developers (Manual Implementation)
**Start here:** `/docs/IMPLEMENTATION-GUIDE.md`
- Step-by-step page updates
- How to use base components
- Page priority list
- Common mistakes to avoid
- Testing checklist

### 3️⃣ For AI/Codex 5.3 (Automated Pages)
**Start here:** `/docs/CODEX-SPEC.md`
- Codex-specific patterns
- Layout templates with code
- Component examples
- Color usage rules
- Responsive design patterns
- New page checklist

---

## 🗂️ Directory Structure

```
/docs/
├── DESIGN-SYSTEM.md          # Design tokens, patterns, rules
├── CODEX-SPEC.md             # For AI-generated pages
├── IMPLEMENTATION-GUIDE.md   # For manual updates
└── INDEX.md                  # This file

/components/
├── base/
│   ├── section.tsx           # <Section>, <SectionHeader>
│   ├── grid.tsx              # <CardGrid>, <GridCard>
│   ├── badge.tsx             # <Badge>, <BadgeGroup>
│   ├── hero.tsx              # <Hero>
│   └── content.tsx           # <Stats>, <FeatureList>
└── ui/
    └── ... (50+ shadcn components)

/app/
├── layout.tsx                # Root layout (fonts, metadata)
├── globals.css               # Color tokens, base styles
└── page.tsx                  # Homepage
```

---

## 🎯 Use Case Guide

### "I need to design a new page"
1. Read: `/docs/CODEX-SPEC.md` - Patterns section
2. Copy: Quick start template from CODEX-SPEC
3. Reference: Color usage examples
4. Test: Use browser preview

### "I need to update an existing page"
1. Read: `/docs/IMPLEMENTATION-GUIDE.md` - Step by step
2. Replace colors: Use semantic tokens
3. Replace sections: Use base components
4. Test: Mobile/tablet/desktop

### "Codex, generate/update this page"
1. Use: `/docs/CODEX-SPEC.md` as reference
2. Follow: Layout patterns section
3. Use: Base components (section.tsx, grid.tsx, etc.)
4. Check: Checklist for new pages

### "I'm building an admin dashboard"
1. Read: `/docs/DESIGN-SYSTEM.md` - Component patterns
2. Use: shadcn/ui Card, Badge, Table components
3. Reference: CODEX-SPEC for admin examples
4. Follow: Responsive grid patterns

### "I need to understand colors"
1. Read: `/docs/DESIGN-SYSTEM.md` - Color Palette section
2. See examples in: `/docs/CODEX-SPEC.md` - Color usage examples
3. Check: `app/globals.css` for actual token values
4. Never use direct colors: Always use semantic tokens

---

## 🚀 Implementation Priorities

Based on UI structure document (`docs/UI-Interfaces.md`):

### Phase 1: Public Pages (Most Visible)
- [ ] Homepage (`app/page.tsx`)
- [ ] Courses listing (`app/courses/page.tsx`)
- [ ] Course detail (`app/courses/[id]/page.tsx`)
- [ ] Teachers listing (`app/teachers/page.tsx`)
- [ ] Teacher detail (`app/teachers/[id]/page.tsx`)
- [ ] About page (`app/about/page.tsx`)

### Phase 2: User Authentication & Dashboards
- [ ] Login page (`app/auth/login/page.tsx`)
- [ ] Register page (`app/auth/register/page.tsx`)
- [ ] Student dashboard (`app/student/page.tsx`)
- [ ] Teacher dashboard (`app/teacher/page.tsx`)

### Phase 3: Student & Teacher Areas
- [ ] My Learning (`app/my-learning/page.tsx`)
- [ ] My Courses (`app/my-courses/page.tsx`)
- [ ] Tests section (`app/student/tests/page.tsx`)
- [ ] Course modules (`app/teacher/courses/[courseId]/page.tsx`)

### Phase 4: Admin & Analytics
- [ ] Admin dashboard (`app/admin/page.tsx`)
- [ ] User management
- [ ] Analytics dashboard

---

## 📖 Document Descriptions

### DESIGN-SYSTEM.md (464 lines)
The comprehensive design system defining:
- **Colors**: Full OKLch palette with semantic tokens
- **Typography**: Font families, scale, line heights
- **Layout**: Container sizes, breakpoints, spacing scale
- **Components**: Button, Card, Badge, Input patterns
- **Animations**: Hover states, transitions
- **Accessibility**: WCAG standards, semantic HTML
- **File structure**: Directory organization
- **Common mistakes**: What to avoid
- **Patterns**: Real code examples

### CODEX-SPEC.md (611 lines)
AI/Codex-specific implementation guide:
- **Import statements**: Exactly what to import
- **Layout patterns**: 4 ready-to-copy patterns with full code
- **Color examples**: ✅ Correct vs ❌ Wrong
- **Responsive rules**: Mobile-first approach
- **Text rules**: Typography hierarchy and wrapping
- **Spacing rules**: Gap vs margin, section spacing
- **Component examples**: Button, Form, Card variations
- **Common mistakes**: Specific to AI implementation
- **File naming**: Conventions for new files
- **Checklist**: Verification for new pages
- **Quick start template**: Copy-paste ready page template

### IMPLEMENTATION-GUIDE.md (388 lines)
Developer-focused implementation manual:
- **Overview**: What's been created
- **Files created**: All documentation and base components
- **Principles**: Design system at a glance
- **How to use**: Approach 1 (update) vs Approach 2 (new)
- **Step by step**: Detailed update instructions
- **Priority list**: Which pages to update first
- **Guidelines**: DO's and DON'Ts
- **Base components**: Reference for all available components
- **Testing checklist**: Mobile/tablet/desktop/colors/typography
- **Common questions**: FAQ section

---

## 🔗 File References

### Base Components Usage
```tsx
// Section wrapper - use for all full-width sections
import { Section, SectionHeader } from '@/components/base/section'

// Card grids - use for displaying items/cards
import { CardGrid, GridCard } from '@/components/base/grid'

// Badges - use for labels/tags/status
import { Badge, BadgeGroup } from '@/components/base/badge'

// Hero sections - use for main banner/header
import { Hero } from '@/components/base/hero'

// Content helpers - use for stats/features lists
import { Stats, FeatureList } from '@/components/base/content'
```

### Shadcn/UI Components
```tsx
// All available automatically - no install needed
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge as ShadcnBadge } from '@/components/ui/badge'
// ... and 50+ more components
```

### Design Tokens (in globals.css)
```css
/* All colors defined as CSS variables */
--primary: oklch(0.55 0.2 250)
--background: oklch(0.985 0.002 240)
--foreground: oklch(0.15 0.02 250)
/* ... and 20+ more tokens */

/* Used via Tailwind classes */
bg-primary, text-foreground, border-border, etc.
```

---

## 📋 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | June 2026 | Initial design system with documentation, base components, and Codex spec |

---

## ✅ Checklist for Getting Started

- [ ] Read all 3 documentation files (30 mins total)
- [ ] Review base components in `/components/base/`
- [ ] Check globals.css for color tokens
- [ ] Review quick start template in CODEX-SPEC.md
- [ ] Update 1 test page to verify workflow
- [ ] Update remaining pages by priority

---

## 💡 Pro Tips

1. **For Color Questions**: Check `/docs/DESIGN-SYSTEM.md` section 1 (Color Palette)
2. **For New Pages**: Copy template from `/docs/CODEX-SPEC.md` section XI
3. **For Updates**: Follow step-by-step in `/docs/IMPLEMENTATION-GUIDE.md`
4. **For AI/Codex**: Use `/docs/CODEX-SPEC.md` as primary reference
5. **For Dark Mode**: Automatic! No special handling needed
6. **For Mobile Design**: Always start with mobile (1 col), then add md/lg
7. **For Components**: Check shadcn/ui first, then base components, then create new

---

## 🎓 Learning Path

```
Day 1: Read all documentation (1-2 hours)
  ↓
Day 2: Review base components in code (30 mins)
  ↓
Day 3: Update 1 simple page as practice (1-2 hours)
  ↓
Day 4+: Update remaining pages by priority (parallel with other work)
```

---

## 🆘 Help & Support

### "How do I [thing]?"

- **Add a new section**: See CODEX-SPEC.md patterns
- **Use a color**: See DESIGN-SYSTEM.md colors or CODEX-SPEC.md examples
- **Make responsive**: See CODEX-SPEC.md responsive rules
- **Create a layout**: Copy template from CODEX-SPEC.md
- **Update existing page**: Follow IMPLEMENTATION-GUIDE.md step-by-step
- **Check accessibility**: See DESIGN-SYSTEM.md section 9

---

## 📞 Document Maintenance

These documents are living references. Update them when:
- Adding new design patterns
- Discovering common mistakes
- Creating new base components
- Changing color tokens or typography
- Adding new layout patterns

Keep all three docs in sync!

---

**Last Updated:** June 2026  
**System Version:** 1.0  
**Status:** Ready for implementation

**Quick Links:**
- 📖 [Design System](/docs/DESIGN-SYSTEM.md)
- 🤖 [Codex Specification](/docs/CODEX-SPEC.md)
- 🔧 [Implementation Guide](/docs/IMPLEMENTATION-GUIDE.md)
