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
                box-sizing: border-box;
              }
              html {
                color-scheme: dark;
                min-height: 100%;
                height: auto !important;
              }
              body {
                margin: 0;
                min-height: 100%;
                height: auto !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                overscroll-behavior: none;
              }
              #root {
                background: ${backgroundColor} !important;
                display: flex;
                min-height: 100dvh;
                padding-bottom: 0;
              }
              @supports (height: 100svh) {
                #root {
                  min-height: 100svh;
                }
              }
              @media (max-width: 600px) {
                body {
                  min-height: calc(100dvh + 144px);
                }
                #root {
                  min-height: calc(100dvh + 144px);
                  padding-bottom: 144px;
                }
                @supports (height: 100svh) {
                  body {
                    min-height: calc(100svh + 144px);
                  }
                  #root {
                    min-height: calc(100svh + 144px);
                  }
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
