// The preview picture shown when someone shares a link to the site (Slack, Teams, texts, LinkedIn…).
// Next.js draws it once at build time from the layout below; it's 1200×630, the standard size.
import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME}: ${SITE_DESCRIPTION}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same colors as the site (see the top of app/globals.css).
const NAVY = "#0b2a4a";
const NAVY_2 = "#164573";
const RED = "#d8343a";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_2} 100%)`,
          borderBottom: `14px solid ${RED}`,
          color: "#ffffff",
        }}
      >
        {/* The site's logo (components/Logo.tsx), drawn larger. */}
        <svg width="120" height="120" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="#ffffff" fillOpacity="0.12" />
          <rect x="8" y="7" width="16" height="19" rx="2.5" fill="#ffffff" />
          <rect x="11" y="11" width="10" height="2" rx="1" fill={NAVY} />
          <rect x="11" y="15" width="10" height="1.5" rx="0.75" fill={NAVY} fillOpacity="0.45" />
          <rect x="11" y="18.5" width="7" height="1.5" rx="0.75" fill={NAVY} fillOpacity="0.45" />
          <circle cx="24" cy="8" r="4" fill="#e03a3e" stroke={NAVY} strokeWidth="1.5" />
        </svg>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>{SITE_NAME}</div>
          <div style={{ fontSize: 38, marginTop: 20, color: "rgba(255, 255, 255, 0.8)" }}>{SITE_DESCRIPTION}</div>
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 30 }}>
          {["Capital One", "AI Policy", "Updated every 2 hours"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "10px 24px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
