# Minimal Design System Export

A clean, glassmorphic dark-themed design system with reusable React components.

## 📦 What's Included

### Components (6 files)
- **Glass Components** (5): Button, Card, Input, Select, Textarea
- **Layout**: MinimalSidebar with collapsible navigation

### Pages (3 templates)
- **IndexMinimal**: Landing page with hero section
- **CreateMinimal**: Content creation interface
- **StoryboardMinimal**: Storyboard builder

### Styling & Utils (3 files)
- **index.css**: Typography, animations, CSS variables
- **utils.ts**: className merging utility
- **tailwind.config.ts**: Complete Tailwind configuration

## 🚀 Quick Start

### 1. Create New React + Vite Project
```bash
npm create vite@latest my-minimal-site -- --template react-ts
cd my-minimal-site
```

### 2. Install Dependencies
```bash
npm install react-router-dom lucide-react
npm install -D tailwindcss postcss autoprefixer tailwindcss-animate
npm install clsx tailwind-merge class-variance-authority
npx tailwindcss init -p
```

### 3. Copy Files
```
Copy from minimal-export/ to your project:

minimal-export/components/     → src/components/
minimal-export/pages/          → src/pages/
minimal-export/lib/            → src/lib/
minimal-export/index.css       → src/index.css
minimal-export/tailwind.config.ts → ./tailwind.config.ts
```

### 4. Update main.tsx
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

### 5. Update App.tsx
```typescript
import { Routes, Route } from 'react-router-dom'
import IndexMinimal from './pages/IndexMinimal'
import CreateMinimal from './pages/CreateMinimal'
import StoryboardMinimal from './pages/StoryboardMinimal'

function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexMinimal />} />
      <Route path="/create" element={<CreateMinimal />} />
      <Route path="/storyboard" element={<StoryboardMinimal />} />
    </Routes>
  )
}

export default App
```

### 6. Run Dev Server
```bash
npm run dev
```

## 🎨 Design System

### Color Palette (HSL)
- **Primary Yellow**: `hsl(38, 98%, 57%)`
- **Primary Orange**: `hsl(25, 100%, 67%)`
- **Accent Purple**: `hsl(270, 68%, 68%)`
- **Accent Pink**: `hsl(327, 100%, 68%)`
- **Background**: `hsl(0, 0%, 0%)`

### Typography Classes
- `.minimal-title` - 32px, bold, white
- `.minimal-heading` - 16px, medium, white
- `.minimal-label` - 14px, medium, gray
- `.minimal-body` - 14px, regular, light gray

### Glass Effect
```css
backdrop-blur-xl bg-white/5 border border-white/10
```

## 📝 Component Usage

### GlassButton
```typescript
import { GlassButton } from '@/components/glass/GlassButton'

<GlassButton variant="primary" size="md" loading={false}>
  Click Me
</GlassButton>
```

### GlassCard
```typescript
import { GlassCard } from '@/components/glass/GlassCard'

<GlassCard variant="solid" hover>
  Your content here
</GlassCard>
```

### GlassInput
```typescript
import { GlassInput } from '@/components/glass/GlassInput'

<GlassInput 
  label="Email"
  placeholder="Enter your email"
  type="email"
/>
```

## 🔧 Customization

### Update Colors
Edit `index.css` CSS variables:
```css
:root {
  --primary-yellow: 38 98% 57%;
  --primary-orange: 25 100% 67%;
  /* Add your brand colors */
}
```

### Update Tailwind Config
Edit `tailwind.config.ts` to add custom colors:
```typescript
theme: {
  extend: {
    colors: {
      'brand-blue': 'hsl(220, 90%, 56%)',
    }
  }
}
```

## ⚠️ What to Update After Export

1. **Remove Backend Dependencies** (if any)
   - Remove Supabase imports
   - Remove authentication hooks
   - Remove data fetching logic

2. **Update Navigation Links**
   - Replace `/dashboard/*` routes
   - Update internal links
   - Fix broken route references

3. **Add Your Assets**
   - Logo files
   - Brand images
   - Icons

4. **Configure Environment**
   - Update `vite.config.ts` if needed
   - Add `.env` file for your API keys

## 📦 Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "lucide-react": "^0.462.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "class-variance-authority": "^0.7.1"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

## 📄 License

Free to use in your projects. No attribution required.

## 🆘 Support

For issues or questions about integration, refer to:
- [React Router Docs](https://reactrouter.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [Vite Docs](https://vitejs.dev/)
