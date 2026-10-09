// Our own logo: a briefing page with a red "live" dot. It's deliberately original and does
// not use Capital One's logo or swoosh, which are trademarks.
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo">
      <rect width="32" height="32" rx="8" fill="#ffffff" fillOpacity="0.12" />
      <rect x="8" y="7" width="16" height="19" rx="2.5" fill="#ffffff" />
      <rect x="11" y="11" width="10" height="2" rx="1" fill="#0b2a4a" />
      <rect x="11" y="15" width="10" height="1.5" rx="0.75" fill="#0b2a4a" fillOpacity="0.45" />
      <rect x="11" y="18.5" width="7" height="1.5" rx="0.75" fill="#0b2a4a" fillOpacity="0.45" />
      <circle cx="24" cy="8" r="4" fill="#e03a3e" stroke="#0b2a4a" strokeWidth="1.5" />
    </svg>
  );
}
