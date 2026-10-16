import { appStrings } from './constants/strings/app';
import { canvasStrings } from './constants/strings/canvas';
import { commandsStrings } from './constants/strings/commands';
import { commonStrings1 } from './constants/strings/common1';
import { commonStrings2 } from './constants/strings/common2';
import { defaultsStrings } from './constants/strings/defaults';
import { editorStrings1 } from './constants/strings/editor1';
import { editorStrings2 } from './constants/strings/editor2';
import { exportStrings } from './constants/strings/export';
import { geometryStrings } from './constants/strings/geometry';
import { homeStrings } from './constants/strings/home';
import { imagesStrings } from './constants/strings/images';
import { inputsStrings } from './constants/strings/inputs';
import { persistenceStrings } from './constants/strings/persistence';
import { presenterStrings } from './constants/strings/presenter';
import { rendererStrings } from './constants/strings/renderer';
import { slidesStrings } from './constants/strings/slides';
import { storeStrings } from './constants/strings/store';
import { textStrings } from './constants/strings/text';
import { themeStrings } from './constants/strings/theme';
import { uiStrings1 } from './constants/strings/ui1';
import { uiStrings2 } from './constants/strings/ui2';

/** Runtime strings only; module specifiers, type literals, and directives remain syntax. */
export const strings = {
  app: appStrings,
  canvas: canvasStrings,
  commands: commandsStrings,
  common: { ...commonStrings1, ...commonStrings2 },
  defaults: defaultsStrings,
  editor: { ...editorStrings1, ...editorStrings2 },
  export: exportStrings,
  geometry: geometryStrings,
  home: homeStrings,
  images: imagesStrings,
  inputs: inputsStrings,
  persistence: persistenceStrings,
  presenter: presenterStrings,
  renderer: rendererStrings,
  slides: slidesStrings,
  store: storeStrings,
  text: textStrings,
  theme: themeStrings,
  ui: { ...uiStrings1, ...uiStrings2 },
} as const;
