import { BoldExtension, ItalicExtension, UnderlineExtension } from 'remirror/extensions';
import { PlaceholderExtension } from '@remirror/extension-placeholder';
import { EntityReferenceExtension } from 'remirror/extensions';
import { decorateHighlights } from '../../utils/decorateHighlights';

export const extensions = [
  new BoldExtension({}),
  new ItalicExtension({}),
  new UnderlineExtension({}),
  new PlaceholderExtension({
    placeholder: 'Start writing...',
  }),
  new EntityReferenceExtension({
    getStyle: decorateHighlights,
    extraAttributes: {
      labelType: {
        default: null,
      },
      type: {
        default: null,
      },
      name: {
        default: "entity-reference"
      },
      rank: {
        default: 0
      },
      schema: {
        default: "default"
      }
    }
  }),
]; 