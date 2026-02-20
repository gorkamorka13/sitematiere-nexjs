# Site Matière - Bridge Construction Management System

A comprehensive web application for managing bridge construction projects with geolocation, media management, and team collaboration features.

## Overview

Site Matière is a Next.js-based project management system designed specifically for bridge construction companies. It provides tools for tracking projects across different phases (prospection, studies, fabrication, transport, construction), managing media assets, handling document workflows, and coordinating team activities.

## Features

### Project Management
- **Interactive Map Visualization**: View all projects on an interactive map with custom pins and filtering.
- **Project Lifecycle Tracking**: Track projects through phases: Prospection → Studies → Fabrication → Transport → Construction.
- **Detailed Project Views**: Access comprehensive project information including coordinates, descriptions, and progress tracking.
- **Pins System**: Custom map pins based on project status or type.

### Media & Document Management
- **Photo Gallery**: Slideshow functionality with fullscreen viewing and dynamic loading from Cloudflare R2.
- **Video Management**: Organize and preview project-related videos with optimized streaming.
- **Document Explorer**: Global file management system with folder structures and integrated PDF viewer.
- **Image Processing**: Built-in image retouching, cropping, and optimization tools.

### User Management
- **Role-Based Access**: Three-tier system (Admin, User, Visitor) with strictly enforced permissions.
- **Account Protection**: Built-in protection against deletion of core administrative accounts.
- **Authentication**: Secure login system with NextAuth.js v5.

### Modern Interface & Responsive Design
- **adaptive Dialogs**: Management modals optimized for all screen sizes with sticky headers and scrolling content.
- **Floating Controls**: Intelligent floating close buttons and action triggers for mobile usability.
- **Glassmorphism**: Premium UI aesthetics using backdrop blurs and modern color palettes.

## Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Edge Runtime**: Fully compatible with Cloudflare Workers/Pages
- **Language**: TypeScript (Strict Mode)
- **Database**: PostgreSQL via [Neon](https://neon.tech/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Storage**: [Cloudflare R2](https://www.cloudflare.com/products/r2/) for assets and documents
- **Authentication**: [NextAuth.js v5 (Auth.js)](https://authjs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Maps**: [React-Leaflet](https://react-leaflet.js.org/)

## Getting Started

### Prerequisites
- Node.js 20+
- Neon Database (PostgreSQL)
- Cloudflare R2 Bucket
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sitematiere-nexjs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file based on your environment:
```env
DATABASE_URL="postgresql://user:password@hostname/dbname?sslmode=require"
NEXTAUTH_SECRET="your-secret-key"
R2_BUCKET_NAME="your-bucket-name"
# ... other R2 and Auth configs
```

### Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run lint            # Run ESLint check

# Database (Drizzle)
npm run db:push         # Push schema changes to the database
npm run db:studio       # Open Drizzle interactive UI
npm run db:generate     # Generate migrations

# Deployment (Cloudflare)
npm run build:worker    # Build for Cloudflare environment
npm run deploy          # Deploy to Cloudflare Pages
```

## Project Structure

```
├── app/                    # Next.js App Router (Pages, API, Server Actions)
├── components/            # React Components
│   ├── dashboard/         # Dashboard & Table components
│   ├── settings/          # Management Dialogs (Users, Projects, Files)
│   ├── ui/                # Core UI primitives
│   └── files/             # File Upload & Explorer logic
├── lib/                   # Database schema, Auth, and Utilities
├── hooks/                 # Custom React Hooks
├── public/                # Static assets (Pins, Logos)
└── scripts/               # Migration and maintenance scripts
```

## Security

- Role-based access control (RBAC).
- Secure password hashing with bcrypt.
- Input validation via Zod schemas.
- Edge-compatible authentication.
- Protected "Admin" core account against accidental deletion.

## Support

Built and maintained for high-performance bridge construction follow-up.

---

Built with ❤️ using Next.js and Cloudflare.
