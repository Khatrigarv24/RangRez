import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  listAllTags,
  addNewTag,
  removeTag
} from './../tag/controller-tag';
import { authenticate } from './../auth/services-user';
import { isAdmin } from './../admin/services-admin';

const tagRoutes = new Hono();

// Enable CORS
tagRoutes.use('*', cors());
// Tag management routes
tagRoutes.get('/tags', authenticate, isAdmin, listAllTags);
tagRoutes.post('/add-tag', authenticate, isAdmin, addNewTag);
tagRoutes.delete('/tags/:tagId', authenticate, isAdmin, removeTag);

export { tagRoutes };