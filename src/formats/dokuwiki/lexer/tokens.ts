export interface TokenPosition {
  line: number;
  column: number;
}

export interface HeadingToken extends TokenPosition {
  type: "heading";
  level: number;
  text: string;
}

export interface ListItemToken extends TokenPosition {
  type: "listItem";
  ordered: boolean;
  depth: number;
  text: string;
}

export interface BlockquoteToken extends TokenPosition {
  type: "blockquote";
  depth: number;
  text: string;
}

export interface CodeFenceOpenToken extends TokenPosition {
  type: "codeOpen";
  language: string | null;
}

export interface CodeFenceCloseToken extends TokenPosition {
  type: "codeClose";
}

export interface CodeLineToken extends TokenPosition {
  type: "codeLine";
  text: string;
}

export interface HorizontalRuleToken extends TokenPosition {
  type: "horizontalRule";
}

export interface TableRowToken extends TokenPosition {
  type: "tableRow";
  cells: { header: boolean; text: string }[];
}

export interface TextToken extends TokenPosition {
  type: "text";
  text: string;
}

export interface BlankToken extends TokenPosition {
  type: "blank";
}

export type Token =
  | HeadingToken
  | ListItemToken
  | BlockquoteToken
  | CodeFenceOpenToken
  | CodeFenceCloseToken
  | CodeLineToken
  | HorizontalRuleToken
  | TableRowToken
  | TextToken
  | BlankToken;

export interface LexerWarning {
  line: number;
  column?: number;
  message: string;
}
