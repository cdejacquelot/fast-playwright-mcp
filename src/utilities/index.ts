/**
 * Utilities module exports
 *
 * This module provides utility classes and functions for HTML inspection
 * and analysis, optimized for integration with the browser tools.
 */

// Re-export types for convenience
export type {
  ElementInspectionMetadata,
  ElementInspectionResult,
  HTMLExtractionOptions,
  HTMLInspectionOptions,
  HTMLInspectionResult,
  SizeLimitConfig,
} from '../types/html-inspection.js';
export { HTMLInspector } from './html-inspector.js';
