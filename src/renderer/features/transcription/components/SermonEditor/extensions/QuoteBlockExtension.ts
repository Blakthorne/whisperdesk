/**
 * Quote Block TipTap Extension
 *
 * Custom extension for rendering and editing quote_block nodes in the editor.
 * Preserves quote metadata (reference, verification status, etc.) while
 * providing interactive features like drag-to-edit boundaries, quick actions, etc.
 *
 * This extension works with the AST-based DocumentState to maintain consistency
 * between the data model and the visual representation in TipTap.
 */

import { Node as TipTapNode, mergeAttributes } from '@tiptap/core';

export interface QuoteBlockAttrs {
  /** Unique identifier from the AST */
  quoteId?: string;
  /** Bible reference (e.g., "John 3:16") */
  reference?: string;
  /** Book name (e.g., "John") */
  book?: string;
  /** Chapter number */
  chapter?: number;
  /** Verse number or range */
  verse?: string;
  /** Whether user verified this quote */
  userVerified?: boolean;
  /** Whether this quote contains text interjected by the speaker */
  hasInterjections?: boolean;
  /** Confidence score from whisper.cpp analysis (0-1) */
  confidence?: number;
  /** Whether marked as non-biblical */
  isNonBiblical?: boolean;
  /** Additional notes */
  notes?: string;
  /** Start character offset in original text */
  startOffset?: number;
  /** End character offset in original text */
  endOffset?: number;
  /** Last modified timestamp */
  modifiedAt?: string;
}

// Augment TipTap's Commands interface to include our custom commands
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    quote_block: {
      createQuoteBlock: (attrs: Partial<QuoteBlockAttrs>) => ReturnType;
      toggleQuoteBlock: () => ReturnType;
      updateQuoteAttrs: (attrs: Partial<QuoteBlockAttrs>) => ReturnType;
      verifyQuote: () => ReturnType;
      unverifyQuote: () => ReturnType;
      markNonBiblical: () => ReturnType;
      unmarkNonBiblical: () => ReturnType;
    };
  }
}

/**
 * Quote Block Node for TipTap
 *
 * Renders as a blockquote with data attributes for metadata preservation.
 * Metadata is stored in node.attrs and used by interactive overlays
 * (SelectionAdder, QuoteBoundaryEditor, FloatingEditBar).
 */
export const QuoteBlockExtension = TipTapNode.create({
  name: 'quote_block',

  group: 'block',

  // Allow inline content (text, marks, interjections)
  content: 'inline*',

  // Allow marks inside quotes (bold, italic, etc.)
  marks: '_',

  draggable: false,

  selectable: true,

  /**
   * Configure node options
   */
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'quote-block',
      },
    };
  },

  /**
   * Define node attributes for metadata
   */
  addAttributes() {
    return {
      quoteId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-quote-id'),
        renderHTML: (attrs) => {
          if (!attrs.quoteId) return {};
          return {
            'data-quote-id': attrs.quoteId,
          };
        },
      },
      reference: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-reference'),
        renderHTML: (attrs) => {
          if (!attrs.reference) return {};
          return {
            'data-reference': attrs.reference,
          };
        },
      },
      book: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-book'),
        renderHTML: (attrs) => {
          if (!attrs.book) return {};
          return {
            'data-book': attrs.book,
          };
        },
      },
      chapter: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-chapter');
          return val ? parseInt(val, 10) : null;
        },
        renderHTML: (attrs) => {
          if (attrs.chapter === null) return {};
          return {
            'data-chapter': String(attrs.chapter),
          };
        },
      },
      verse: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-verse'),
        renderHTML: (attrs) => {
          if (!attrs.verse) return {};
          return {
            'data-verse': attrs.verse,
          };
        },
      },
      userVerified: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute('data-user-verified') === 'true',
        renderHTML: (attrs) => {
          return {
            'data-user-verified': attrs.userVerified ? 'true' : 'false',
          };
        },
      },
      hasInterjections: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute('data-has-interjections') === 'true',
        renderHTML: (attrs) => {
          return {
            'data-has-interjections': attrs.hasInterjections
              ? 'true'
              : 'false',
          };
        },
      },
      confidence: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-confidence');
          return val ? parseFloat(val) : null;
        },
        renderHTML: (attrs) => {
          if (attrs.confidence === null) return {};
          return {
            'data-confidence': String(attrs.confidence),
          };
        },
      },
      isNonBiblical: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute('data-non-biblical') === 'true',
        renderHTML: (attrs) => {
          return {
            'data-non-biblical': attrs.isNonBiblical ? 'true' : 'false',
          };
        },
      },
      notes: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-notes'),
        renderHTML: (attrs) => {
          if (!attrs.notes) return {};
          return {
            'data-notes': attrs.notes,
          };
        },
      },
      startOffset: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-start-offset');
          return val ? parseInt(val, 10) : null;
        },
        renderHTML: (attrs) => {
          if (attrs.startOffset === null) return {};
          return {
            'data-start-offset': String(attrs.startOffset),
          };
        },
      },
      endOffset: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-end-offset');
          return val ? parseInt(val, 10) : null;
        },
        renderHTML: (attrs) => {
          if (attrs.endOffset === null) return {};
          return {
            'data-end-offset': String(attrs.endOffset),
          };
        },
      },
      modifiedAt: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-modified-at'),
        renderHTML: (attrs) => {
          if (!attrs.modifiedAt) return {};
          return {
            'data-modified-at': attrs.modifiedAt,
          };
        },
      },
    };
  },

  /**
   * Parse HTML into this node type
   * Handles both blockquote and our custom quote-block markup
   */
  parseHTML() {
    return [
      {
        tag: 'blockquote[data-quote-id]',
        preserveAttributes: true,
      },
      {
        tag: 'blockquote.quote-block',
        preserveAttributes: true,
      },
      {
        tag: 'blockquote',
        // Only parse regular blockquotes if no data attributes
        getAttrs: (element) => {
          const el = element as HTMLElement;
          // Skip if it has our quote-specific attributes
          if (
            el.hasAttribute('data-quote-id') ||
            el.hasAttribute('data-reference')
          ) {
            return false;
          }
          // Regular blockquotes become quote blocks (convert them)
          return {
            reference: null,
            userVerified: false,
          };
        },
      },
    ];
  },

  /**
   * Render node as HTML
   */
  renderHTML({ HTMLAttributes }) {
    // Merge default attributes with any passed attrs
    const attrs = mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes
    );

    // Add CSS classes based on verification state
    const classes = ['quote-block'];
    if (HTMLAttributes['data-user-verified'] === 'true') {
      classes.push('quote-verified');
    }
    if (HTMLAttributes['data-non-biblical'] === 'true') {
      classes.push('quote-non-biblical');
    }
    if (HTMLAttributes['data-has-interjections'] === 'true') {
      classes.push('quote-has-interjections');
    }

    return [
      'blockquote',
      {
        ...attrs,
        class: classes.join(' '),
      },
      0, // Content placeholder
    ];
  },

  /**
   * Add keyboard shortcuts for quote operations
   */
  addKeyboardShortcuts() {
    return {
      // Cmd+/ to toggle quote block
      'Mod-/': () => this.editor.commands.toggleNode('quote_block', 'paragraph'),
    };
  },

  /**
   * Commands for quote operations
   */
  addCommands() {
    return {
      /**
       * Create a quote block from selected text
       */
      createQuoteBlock:
        (attrs: Partial<QuoteBlockAttrs>) =>
        ({ commands }: { commands: any }) => {
          return commands.wrapIn(this.name, {
            reference: attrs.reference || null,
            book: attrs.book || null,
            chapter: attrs.chapter || null,
            verse: attrs.verse || null,
            userVerified: false,
            isNonBiblical: false,
          });
        },

      /**
       * Toggle quote block on/off
       */
      toggleQuoteBlock:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.toggleNode(this.name, 'paragraph');
        },

      /**
       * Update quote metadata
       */
      updateQuoteAttrs:
        (attrs: Partial<QuoteBlockAttrs>) =>
        ({ commands }: { commands: any }) => {
          return commands.updateAttributes(this.name, attrs);
        },

      /**
       * Mark quote as verified by user
       */
      verifyQuote:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.updateAttributes(this.name, { userVerified: true });
        },

      /**
       * Unmark quote verification
       */
      unverifyQuote:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.updateAttributes(this.name, {
            userVerified: false,
          });
        },

      /**
       * Mark quote as non-biblical
       */
      markNonBiblical:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.updateAttributes(this.name, { isNonBiblical: true });
        },

      /**
       * Unmark quote as non-biblical
       */
      unmarkNonBiblical:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.updateAttributes(this.name, {
            isNonBiblical: false,
          });
        },
    };
  },
});
