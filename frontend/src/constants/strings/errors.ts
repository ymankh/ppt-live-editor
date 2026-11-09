// Failure messages shown to people. They never mention status codes, URLs, or server wording;
// technical details stay on the thrown error for the browser console.
export const errorStrings = {
  // Why a server request failed, when the cause is known.
  offline: "Can't connect to Folio. Check your internet connection and try again.",
  serverProblem: "Something went wrong on our side. Please try again in a moment.",
  tooLarge: "This file is too large to upload.",
  // What failed, when there is no more specific explanation.
  loadLibrary: "We couldn't load your presentations. Please try again.",
  createPresentation: "We couldn't create the presentation. Please try again.",
  importPresentation: "We couldn't import this file. Choose a Folio project or PowerPoint file and try again.",
  renamePresentation: "We couldn't rename the presentation. Please try again.",
  duplicatePresentation: "We couldn't duplicate the presentation. Please try again.",
  deletePresentation: "We couldn't delete the presentation. Please try again.",
  openPresentation: "We couldn't open this presentation. Please try again.",
  openLatestPresentation: "We couldn't open your latest presentation. Please try again.",
  loadPresentationFonts: "We couldn't load the fonts for this presentation. Please try again.",
  loadFontLibrary: "We couldn't load your fonts. Please try again.",
  uploadFont: "We couldn't upload this font. Please try again.",
  saveChanges: "We couldn't save your changes. Please try again.",
  addImage: "We couldn't add this image. Please try again.",
  openPresenterView: "We couldn't open the presenter view. Please try again.",
  unexpected: "An unexpected problem stopped the app. Reload to continue working.",
} as const;
