import type { Components as ReactMarkdownComponents } from "react-markdown";
import type { ReactNode } from "react";

// Extend the ReactMarkdown Components type to include our custom components
declare module "react-markdown" {
  interface Components extends ReactMarkdownComponents {
    "ternary-write"?: (props: {
      children?: ReactNode;
      node?: any;
      path?: string;
      description?: string;
    }) => JSX.Element;
    "ternary-rename"?: (props: {
      children?: ReactNode;
      node?: any;
      from?: string;
      to?: string;
    }) => JSX.Element;
    "ternary-delete"?: (props: {
      children?: ReactNode;
      node?: any;
      path?: string;
    }) => JSX.Element;
    "ternary-add-dependency"?: (props: {
      children?: ReactNode;
      node?: any;
      package?: string;
    }) => JSX.Element;
  }
}
