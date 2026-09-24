import { ScrollViewStyleReset } from "expo-router/html";
import * as WebBrowser from "expo-web-browser";
import type { ReactNode } from "react";

WebBrowser.maybeCompleteAuthSession();

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body { background-color: #fff; }
@media (prefers-color-scheme: dark) { body { background-color: #000; } }
`;
