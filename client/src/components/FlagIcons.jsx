import React from 'react';

/**
 * High-quality vector flag icons for US, BR, ES, and FR.
 * Renders cleanly and consistently across all operating systems.
 */

export function FlagUS({ className = "w-4 h-3", ...props }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={`shrink-0 overflow-hidden rounded-[2px] shadow-xs ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="United States Flag"
      {...props}
    >
      {/* 13 Red and White Stripes */}
      <rect width="24" height="16" fill="#ffffff" />
      <path
        fill="#b22234"
        d="M0,0 h24 v1.23 h-24 z 
           M0,2.46 h24 v1.23 h-24 z 
           M0,4.92 h24 v1.23 h-24 z 
           M0,7.38 h24 v1.23 h-24 z 
           M0,9.85 h24 v1.23 h-24 z 
           M0,12.31 h24 v1.23 h-24 z 
           M0,14.77 h24 v1.23 h-24 z"
      />
      {/* Navy Blue Canton */}
      <rect width="10" height="8.62" fill="#1e3a8a" />
      {/* Stars Grid */}
      <g fill="#ffffff">
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(1.8, 1.4)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(3.8, 1.4)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(5.8, 1.4)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(7.8, 1.4)" />

        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(2.8, 2.8)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(4.8, 2.8)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(6.8, 2.8)" />

        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(1.8, 4.3)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(3.8, 4.3)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(5.8, 4.3)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(7.8, 4.3)" />

        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(2.8, 5.8)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(4.8, 5.8)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(6.8, 5.8)" />

        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(1.8, 7.2)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(3.8, 7.2)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(5.8, 7.2)" />
        <polygon points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.09 0.42,0.54 0,0.26 -0.42,0.54 -0.28,0.09 -0.65,-0.2 -0.19,-0.2" transform="translate(7.8, 7.2)" />
      </g>
    </svg>
  );
}

export function FlagBR({ className = "w-4 h-3", ...props }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={`shrink-0 overflow-hidden rounded-[2px] shadow-xs ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bandeira do Brasil"
      {...props}
    >
      {/* Green Field */}
      <rect width="24" height="16" fill="#009c3b" />
      {/* Yellow Rhombus */}
      <polygon points="12,2.2 21.8,8 12,13.8 2.2,8" fill="#ffdf00" />
      {/* Blue Celestial Globe */}
      <circle cx="12" cy="8" r="3.6" fill="#002776" />
      {/* White Celestial Band */}
      <path
        d="M 8.8,8.2 C 10.2,7.1 13.5,7.4 15.2,8.8"
        fill="none"
        stroke="#ffffff"
        strokeWidth="0.85"
        strokeLinecap="round"
      />
      {/* Star dots */}
      <circle cx="12.4" cy="6.6" r="0.32" fill="#ffffff" />
      <circle cx="11.2" cy="9.3" r="0.38" fill="#ffffff" />
      <circle cx="12.2" cy="9.8" r="0.32" fill="#ffffff" />
      <circle cx="12.8" cy="9.2" r="0.32" fill="#ffffff" />
      <circle cx="11.8" cy="8.6" r="0.32" fill="#ffffff" />
      <circle cx="12.3" cy="9.1" r="0.25" fill="#ffffff" />
    </svg>
  );
}

export function FlagES({ className = "w-4 h-3", ...props }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={`shrink-0 overflow-hidden rounded-[2px] shadow-xs ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bandera de España"
      {...props}
    >
      {/* Red Top Stripe */}
      <rect width="24" height="4" y="0" fill="#c60b1e" />
      {/* Yellow Middle Stripe */}
      <rect width="24" height="8" y="4" fill="#ffc400" />
      {/* Red Bottom Stripe */}
      <rect width="24" height="4" y="12" fill="#c60b1e" />
      {/* Spanish Coat of Arms */}
      <g transform="translate(6.5, 8)">
        {/* Crown */}
        <path d="M-1.8,-2.6 L1.8,-2.6 L1.4,-1.8 L-1.4,-1.8 Z" fill="#c60b1e" />
        <circle cx="-1.5" cy="-3" r="0.35" fill="#ffc400" />
        <circle cx="0" cy="-3.3" r="0.4" fill="#ffc400" />
        <circle cx="1.5" cy="-3" r="0.35" fill="#ffc400" />
        {/* Shield */}
        <path d="M-1.6,-1.6 H1.6 V1.2 Q1.6,2.4 0,2.8 Q-1.6,2.4 -1.6,1.2 Z" fill="#c60b1e" stroke="#ffc400" strokeWidth="0.3" />
        <rect width="1.4" height="2" x="-0.7" y="-1.2" fill="#ffc400" />
        {/* Pillars of Hercules */}
        <rect width="0.4" height="3.2" x="-2.5" y="-1.2" fill="#e2e8f0" />
        <rect width="0.4" height="3.2" x="2.1" y="-1.2" fill="#e2e8f0" />
        {/* Pillar bases & capitals */}
        <rect width="0.8" height="0.4" x="-2.7" y="1.8" fill="#cbd5e1" />
        <rect width="0.8" height="0.4" x="1.9" y="1.8" fill="#cbd5e1" />
        <rect width="0.8" height="0.4" x="-2.7" y="-1.5" fill="#cbd5e1" />
        <rect width="0.8" height="0.4" x="1.9" y="-1.5" fill="#cbd5e1" />
      </g>
    </svg>
  );
}

export function FlagFR({ className = "w-4 h-3", ...props }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={`shrink-0 overflow-hidden rounded-[2px] shadow-xs ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Drapeau Français"
      {...props}
    >
      {/* French Tricolor: Blue, White, Red */}
      <rect width="8" height="16" x="0" fill="#002654" />
      <rect width="8" height="16" x="8" fill="#ffffff" />
      <rect width="8" height="16" x="16" fill="#ed2939" />
    </svg>
  );
}
