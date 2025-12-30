/**
 * InterjectionMark TipTap Extension
 *
 * Mark extension for highlighting interjections (e.g., "Amen", "Hallelujah")
 * within sermon transcripts. Interjections are detected during AST processing
 * and marked for visual distinction in the editor.
 *
 * ## Usage:
 * ```typescript
 * const editor = useEditor({
 *   extensions: [StarterKit, InterjectionMark],
 * });
 * ```
 *
 * ## Attributes:
 * - nodeId: Unique identifier for the interjection node (optional)
 * - metadataId: Reference to interjection metadata (optional)
 *
 * ## Rendering:
 * Interjections are rendered as <span class="interjection"> with optional
 * data attributes for node and metadata IDs.
 */

import { Mark } from '@tiptap/core';

export interface InterjectionMarkAttrs {
  nodeId?: string;
  metadataId?: string;
}

/**
 * TipTap Mark extension for sermon interjections.
 * Renders as <span class="interjection"> with styling hooks.
 */
export const InterjectionMark = Mark.create({
  name: 'interjection',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'interjection',
      },
    };
  },

  addAttributes() {
    return {
      nodeId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-node-id'),
        renderHTML: (attributes) => {
          if (!attributes.nodeId) {
            return {};
          }
          return {
            'data-node-id': attributes.nodeId,
          };
        },
      },
      metadataId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-metadata-id'),
        renderHTML: (attributes) => {
          if (!attributes.metadataId) {
            return {};
          }
          return {
            'data-metadata-id': attributes.metadataId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.interjection',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...this.options.HTMLAttributes, ...HTMLAttributes }, 0];
  },
});
