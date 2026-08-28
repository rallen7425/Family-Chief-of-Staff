"use client"; // Must be a Client Component

/**
 * Catches errors thrown by the root layout itself — the one case app/error.tsx
 * can't cover, since it renders *inside* that layout. Replaces the whole
 * document, so it ships its own <html>/<body> and inline styles (globals.css
 * is imported by the layout that just failed).
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#F7F9FB",
          color: "#23262B",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 380, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            The app failed to load
          </h1>
          <p style={{ fontSize: 14, color: "#5C6570", lineHeight: 1.5, marginBottom: 16 }}>
            Something went wrong at startup. Reloading usually fixes it.
            {error.digest ? ` (Reference: ${error.digest})` : ""}
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              padding: "10px 16px",
              borderRadius: 9999,
              border: "none",
              background: "#3B6FE5",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
