/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export interface ProLensLogoProps {
  className?: string;
  size?: number;
  "data-testid"?: string;
}

/**
 * The ProLens mark, drawn like the application icon (freelens/build/icon.svg):
 * a six-blade aperture on a blue-to-violet rounded square.
 */
// Fixed ids keep the markup the same on every render; a second logo on a page
// would define the same gradients again, which changes nothing.
const background = "prolens-logo-background";
const glow = "prolens-logo-glow";

export const ProLensLogo = ({ className, size = 200, ...rest }: ProLensLogoProps) => {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 400 400"
      role="img"
      aria-label="ProLens"
      data-testid={rest["data-testid"]}
    >
      <defs>
        <linearGradient id={background} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <radialGradient id={glow} cx="0.3" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="8" y="8" width="384" height="384" rx="88" fill={`url(#${background})`} />
      <rect x="8" y="8" width="384" height="384" rx="88" fill={`url(#${glow})`} />
      <circle cx="200" cy="200" r="138" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="6" />
      <path d="M211 156L281.91 115.06A118 118 0 0 1 316.76 217.06Z" fill="#ffffff" />
      <path d="M243.61 187.53L314.51 228.47A118 118 0 0 1 243.61 309.65Z" fill="#ffffff" fillOpacity="0.86" />
      <path d="M232.61 231.53L232.61 313.41A118 118 0 0 1 126.84 292.59Z" fill="#ffffff" />
      <path d="M189 244L118.09 284.94A118 118 0 0 1 83.24 182.94Z" fill="#ffffff" fillOpacity="0.86" />
      <path d="M156.39 212.47L85.49 171.53A118 118 0 0 1 156.39 90.35Z" fill="#ffffff" />
      <path d="M167.39 168.47L167.39 86.59A118 118 0 0 1 273.16 107.41Z" fill="#ffffff" fillOpacity="0.86" />
    </svg>
  );
};
