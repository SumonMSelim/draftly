/**
 * Not every DokuWiki installation has the same plugins available (spec §60).
 * The profile lets the DokuWiki serializer adapt its output accordingly.
 */
export interface DokuWikiProfile {
  supportsUnderline: boolean;
  supportsMath: boolean;
  supportsFootnotes: boolean;
  supportsTaskLists: boolean;
}

export const defaultProfile: DokuWikiProfile = {
  supportsUnderline: true,
  supportsMath: false,
  supportsFootnotes: false,
  supportsTaskLists: false,
};
