Slideshow Data Migration Guide
This document tracks the migration of existing slideshow images (numbered files like 1.jpg, 2.jpg) to the new
SlideshowImage
 database table.

Migration Script
The script
scripts/migrate-slideshows.ts
 automates the process:

Scans all projects
Finds images linked to the project with numeric filenames (e.g., "1.jpg", "2.png")
Sorts them numerically
Creates
SlideshowImage
 records with:
order
: based on the filename number (1 -> order 0)
isPublished: true (to maintain visibility)
Usage
1. Dry Run (Preview)
Check what will be migrated without making changes:

bash
npx tsx scripts/migrate-slideshows.ts --dry-run
2. Execute Migration
Apply changes to the database:

bash
npx tsx scripts/migrate-slideshows.ts
Migration Log
Status: Completed
Script created: Yes
Dry run executed: Yes (109 images identified initially)
Migration executed: Yes (447 images migrated)
Success: Yes
Verification
Verified total records: 447 (as of 2026-02-12)
Verified sample data: Project name, Image URL, Order, Published status
Rollback
If issues occur, you can delete all
SlideshowImage
 records (resetting the feature):

sql
DELETE FROM slideshow_images;

Comment
Ctrl+Alt+M
