import CodeBlock from "@tiptap/extension-code-block";

/**
 * Draftly's code block accepts any language identifier (bash, python, go,
 * yaml, terraform, ...) rather than a fixed list, per spec §32.
 */
export const CodeBlockLanguage = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: null,
        parseHTML: (element) => {
          const codeElement = element.querySelector("code");
          const classAttribute = codeElement?.getAttribute("class") ?? "";
          const match = /language-([^\s]+)/.exec(classAttribute);
          return match ? match[1] : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.language) {
            return {};
          }
          return { "data-language": attributes.language };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setCodeBlockLanguage:
        (language: string | null) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { language }),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    codeBlockLanguage: {
      setCodeBlockLanguage: (language: string | null) => ReturnType;
    };
  }
}

export default CodeBlockLanguage;
