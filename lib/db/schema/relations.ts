import { relations } from 'drizzle-orm';
import { users } from './users';
import { projects } from './projects';
import { images } from './images';
import { slideshowImages } from './slideshow-images';
import { videos } from './videos';
import { documents } from './documents';
import { files } from './files';

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  documents: many(documents),
  files: many(files),
  images: many(images),
  slideshowImages: many(slideshowImages),
  videos: many(videos),
}));

export const imagesRelations = relations(images, ({ one, many }) => ({
  project: one(projects, {
    fields: [images.projectId],
    references: [projects.id],
  }),
  slideshowImages: many(slideshowImages),
}));

export const slideshowImagesRelations = relations(slideshowImages, ({ one }) => ({
  image: one(images, {
    fields: [slideshowImages.imageId],
    references: [images.id],
  }),
  project: one(projects, {
    fields: [slideshowImages.projectId],
    references: [projects.id],
  }),
}));

export const videosRelations = relations(videos, ({ one }) => ({
  project: one(projects, {
    fields: [videos.projectId],
    references: [projects.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
  }),
}));