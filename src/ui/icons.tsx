import type { JSX } from 'preact';

type IconProps = { size?: number };

const svg = (path: JSX.Element, size = 24) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {path}
  </svg>
);

export const RoostIcon = ({ size }: IconProps) =>
  svg(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></>, size);

export const MapIcon = ({ size }: IconProps) =>
  svg(<><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></>, size);

export const DragonIcon = ({ size }: IconProps) =>
  svg(<><path d="M4 18c2-7 7-12 15-13-2 2-3 4-2 6 2-1 4-1 5 0-3 1-5 3-5 6-3-2-8-1-13 1z" /><circle cx="16" cy="9" r="0.8" fill="currentColor" /></>, size);

export const BagIcon = ({ size }: IconProps) =>
  svg(<><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 016 0v2" /></>, size);

export const GearIcon = ({ size }: IconProps) =>
  svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>, size);

export const BackIcon = ({ size }: IconProps) => svg(<path d="M15 18l-6-6 6-6" />, size);

export const MenuIcon = ({ size }: IconProps) =>
  svg(<><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>, size);
