import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

const backgroundColor = '#000000';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko" style={{ backgroundColor }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no"
        />
        <meta name="theme-color" content={backgroundColor} />
        <meta name="color-scheme" content="dark" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-navbutton-color" content={backgroundColor} />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                background: ${backgroundColor} !important;
              }
              html {
                color-scheme: dark;
              }
              body {
                margin: 0;
                overscroll-behavior: none;
              }
              #root {
                min-height: 100dvh;
              }
              @supports (height: 100svh) {
                #root {
                  min-height: 100svh;
                }
              }
            `,
          }}
        />
      </head>
      <body style={{ backgroundColor }}>{children}</body>
    </html>
  );
}
