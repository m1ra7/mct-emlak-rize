export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`logo-lockup logo-signature ${light ? "light" : ""}`}>
      <svg
        className="logo-symbol"
        viewBox="0 0 80 80"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="40" cy="40" r="39" fill="#123e35" />
        <circle
          cx="40"
          cy="40"
          r="34.5"
          fill="none"
          stroke="#d6bb83"
          strokeWidth="1.5"
        />
        <path
          d="m16 38 12-14 9 10 9-17 18 21"
          fill="none"
          stroke="#d6bb83"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m23 45 17-14 17 14"
          fill="none"
          stroke="#f8f4e8"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M28 44v14h24V44M37 58V47h6v11"
          fill="none"
          stroke="#f8f4e8"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M20 62c7-4 13 4 20 0s13 4 20 0M26 67c5-3 9 3 14 0s9 3 14 0"
          fill="none"
          stroke="#8ccdb8"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="logo-type">
        <strong>MCT</strong>
        <small>
          EMLAK <span>RİZE</span>
        </small>
      </span>
    </span>
  );
}
