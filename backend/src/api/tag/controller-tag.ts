import { Context } from 'hono';
import { createTag, getAllTags, getTagById, deleteTag } from './services-tags';

// List all tags
export const listAllTags = async (c: Context) => {
  try {
    const tags = await getAllTags();
    
    return c.json({
      success: true,
      tags,
      count: tags.length
    });
  } catch (error) {
    console.error("❌ Error fetching tags:", error);
    return c.json({
      success: false,
      error: "Failed to fetch tags",
      details: error.message
    }, 500);
  }
};

// Add a new tag
export const addNewTag = async (c: Context) => {
  try {
    const { name, description } = await c.req.json();
    
    // Get admin info from context
    const admin = c.get('user');
    
    // Validate required fields
    if (!name) {
      return c.json({
        success: false,
        error: "Tag name is required"
      }, 400);
    }
    
    // Validate name format (alphanumeric with hyphens and spaces)
    const namePattern = /^[a-zA-Z0-9\s\-]+$/;
    if (!namePattern.test(name)) {
      return c.json({
        success: false,
        error: "Tag name should only contain letters, numbers, spaces, and hyphens"
      }, 400);
    }
    
    // Create tag
    const tag = await createTag(
      name,
      description || '',
      admin?.userId || 'system'
    );
    
    return c.json({
      success: true,
      message: "Tag created successfully",
      tag
    }, 201);
  } catch (error) {
    console.error("❌ Error creating tag:", error);
    
    // Handle duplicate tag error
    if (error.message && error.message.includes('already exists')) {
      return c.json({
        success: false,
        error: error.message
      }, 409);
    }
    
    return c.json({
      success: false,
      error: "Failed to create tag",
      details: error.message
    }, 500);
  }
};

// Delete a tag
export const removeTag = async (c: Context) => {
  try {
    const tagId = c.req.param('tagId');
    
    // Check if tag exists
    const tag = await getTagById(tagId);
    
    if (!tag) {
      return c.json({
        success: false,
        error: "Tag not found"
      }, 404);
    }
    
    // Delete tag
    await deleteTag(tagId);
    
    return c.json({
      success: true,
      message: "Tag deleted successfully",
      tagId
    });
  } catch (error) {
    console.error("❌ Error deleting tag:", error);
    return c.json({
      success: false,
      error: "Failed to delete tag",
      details: error.message
    }, 500);
  }
};