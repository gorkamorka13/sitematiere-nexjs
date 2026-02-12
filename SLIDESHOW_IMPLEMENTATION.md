# Slideshow Management Feature - Implementation Plan

A comprehensive slideshow management system that allows administrators to curate and reorder images for project presentations. This feature enables dynamic slideshow creation with drag-and-drop reordering and a dedicated viewer interface.

## Key Features

- **Draft/Published Workflow**: Prepare slideshows privately before publishing
- **Drag-and-Drop Reordering**: Intuitive image ordering with @dnd-kit
- **Admin-Only Management**: Secure access control
- **Public Viewer**: Display published slideshows to all users

## Database Schema

New `SlideshowImage` model with draft/published state:
- `isPublished` field for workflow control
- Unique constraint preventing duplicate images
- Indexed for performance

## Server Actions

- `getSlideshowImages()` - Fetch with draft/published filter
- `addSlideshowImage()` - Add as draft
- `removeSlideshowImage()` - Remove from slideshow
- `reorderSlideshowImages()` - Update order
- `publishSlideshow()` - Publish all drafts
- `saveDraftSlideshow()` - Save without publishing

## UI Components

1. **SlideshowManager**: Admin interface with project selector, image grid, drag-and-drop, save/publish buttons
2. **SlideshowViewer**: Public slideshow presentation with navigation controls

## Routes

- `/slideshow` - Management interface (ADMIN only)
- `/slideshow/view/[projectId]` - Public viewer

## Dependencies

- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

See `implementation_plan.md` for full details.
