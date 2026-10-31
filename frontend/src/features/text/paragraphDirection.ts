import { Extension } from '@tiptap/core';

/** Direction follows each paragraph's first strong character, independently of UI language. */
export const paragraphDirection = Extension.create({
  name: 'paragraphDirection',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading', 'blockquote', 'listItem'],
      attributes: {
        dir: {
          default: 'auto',
          parseHTML: (element: HTMLElement) => element.getAttribute('dir') ?? 'auto',
          renderHTML: (attributes: Record<string, unknown>) => ({ dir: attributes.dir }),
        },
      },
    }];
  },
});
