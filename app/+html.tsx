import type { PropsWithChildren } from 'react';

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
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                background: ${backgroundColor} !important;
                box-sizing: border-box;
                height: 100%;
                margin: 0;
                max-height: 100%;
                min-height: 100%;
                overflow: hidden !important;
                overscroll-behavior: none;
                width: 100%;
              }
              html {
                color-scheme: dark;
              }
              body {
                position: fixed;
                inset: 0;
              }
              #root {
                background: ${backgroundColor} !important;
                display: flex;
              }
              @supports (height: 100dvh) {
                html, body, #root {
                  height: 100dvh;
                  max-height: 100dvh;
                  min-height: 100dvh;
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
