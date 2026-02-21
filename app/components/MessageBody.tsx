"use client";

import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";

type Props = {
  bodyHtml: string;
  bodyText: string;
};

function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6} |^\*\*|^- |\[.+\]\(.+\)|^```/m.test(text);
}

export default function MessageBody({ bodyHtml, bodyText }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Use HTML if available — render it isolated in an iframe so it can't
  // break the app's own styles, and sanitize before writing.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!bodyHtml || !iframe) {
      return;
    }

    const clean = DOMPurify.sanitize(bodyHtml, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["script", "style"],
      FORBID_ATTR: ["onerror", "onload", "onclick"],
    });

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            html, body {
              margin: 0; padding: 0;
              background: transparent;
              color: #e4e4e7;
              font-family: ui-sans-serif, system-ui, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              word-break: break-word;
            }
            a { color: #60a5fa; }
            img { max-width: 100%; height: auto; }
            blockquote {
              border-left: 3px solid #52525b;
              margin: 0;
              padding-left: 12px;
              color: #a1a1aa;
            }
            pre, code {
              background: #18181b;
              border-radius: 4px;
              padding: 2px 5px;
              font-size: 13px;
            }
          </style>
        </head>
        <body>${clean}</body>
      </html>
    `);
    doc.close();

    // Auto-resize iframe to content height
    const resize = () => {
      if (iframe.contentDocument?.body) {
        iframe.style.height = iframe.contentDocument.body.scrollHeight + "px";
      }
    };

    iframe.onload = resize;
    setTimeout(resize, 100);
  }, [bodyHtml]);

  if (bodyHtml) {
    return (
      <iframe
        ref={iframeRef}
        title="Message body"
        sandbox="allow-same-origin"
        className="w-full rounded border-0"
        style={{ minHeight: "200px" }}
      />
    );
  }

  if (bodyText && looksLikeMarkdown(bodyText)) {
    return (
      <div className="prose prose-sm prose-invert max-w-none">
        <ReactMarkdown>{bodyText}</ReactMarkdown>
      </div>
    );
  }

  return (
    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-200">
      {bodyText || "(No message body available)"}
    </pre>
  );
}
