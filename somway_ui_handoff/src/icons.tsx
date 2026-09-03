import React from 'react';

export type IconName =
  | 'dashboard' | 'plane' | 'box' | 'passport' | 'users' | 'wallet' | 'chart'
  | 'settings' | 'building' | 'shield' | 'ticket' | 'search' | 'calendar' | 'bell'
  | 'plus' | 'download' | 'mail' | 'phone' | 'map' | 'clock' | 'check' | 'alert'
  | 'edit' | 'trash' | 'eye' | 'filter' | 'menu' | 'arrow' | 'receipt' | 'money'
  | 'lock' | 'database' | 'upload' | 'user' | 'file' | 'route' | 'briefcase'
  | 'globe' | 'headset' | 'trend' | 'refresh' | 'x' | 'more' | 'chevron';

type Props = { name: IconName; size?: number; className?: string; strokeWidth?: number };

const P: Record<IconName, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  plane: <path d="M2 16l8-4-8-4V5l10 4 6-6 2 1-4 7 5 2v2l-5 2 4 7-2 1-6-6-10 4z"/>,
  box: <><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></>,
  passport: <><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="11" r="3"/><path d="M9 11h6M12 8c1 2 1 4 0 6M8 17h8"/></>,
  users: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c0-4 3-6 6-6s6 2 6 6M15 15c3 0 5 2 5 5"/></>,
  wallet: <><path d="M3 6h16a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M3 7l2-3h12l2 3"/><path d="M16 12h5v4h-5a2 2 0 010-4z"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="M3 15l6-5 5 3 7-8"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5l2 1.5-2 3-2.5-1a8 8 0 01-2 1l-.5 3h-4l-.5-3a8 8 0 01-2-1L5 18l-2-3 2-1.5a8 8 0 010-3L3 9l2-3 2.5 1a8 8 0 012-1L10 3h4l.5 3a8 8 0 012 1L19 6l2 3-2 1.5a8 8 0 010 3z"/></>,
  building: <><path d="M4 21V7l8-4 8 4v14"/><path d="M8 10h2M14 10h2M8 14h2M14 14h2M8 18h2M14 18h2M2 21h20"/></>,
  shield: <><path d="M12 3l8 3v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/><path d="M8 12l3 3 5-6"/></>,
  ticket: <><path d="M4 6h16v4a2 2 0 000 4v4H4v-4a2 2 0 000-4z"/><path d="M12 6v12"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  bell: <><path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>,
  phone: <path d="M5 3l4 2-2 5a16 16 0 007 7l5-2 2 4-3 2C10 19 5 14 3 6z"/>,
  map: <><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3z"/><path d="M9 3v15M15 6v15"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>,
  check: <path d="M5 12l4 4 10-10"/>,
  alert: <><path d="M12 3l10 18H2z"/><path d="M12 9v5M12 18h.01"/></>,
  edit: <><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
  eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z"/>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  arrow: <path d="M5 12h14M14 7l5 5-5 5"/>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  money: <><circle cx="12" cy="12" r="9"/><path d="M15 8h-5a2 2 0 000 4h4a2 2 0 010 4H9M12 6v12"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 2 4 3 8 3s8-1 8-3V5M4 11v6c0 2 4 3 8 3s8-1 8-3v-6"/></>,
  upload: <><path d="M12 21V9M7 14l5-5 5 5M5 3h14"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
  route: <><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h3a4 4 0 014 4v4a4 4 0 004 4h-1"/></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9"/></>,
  headset: <><path d="M4 14v-2a8 8 0 0116 0v2"/><path d="M4 14v4h4v-6H6a2 2 0 00-2 2M20 14v4h-4v-6h2a2 2 0 012 2M16 20c-1 1-2 1-4 1"/></>,
  trend: <><path d="M3 18l6-6 4 4 8-10"/><path d="M15 6h6v6"/></>,
  refresh: <><path d="M20 6v6h-6"/><path d="M4 18v-6h6"/><path d="M6 8a8 8 0 0113-2l1 2M18 16a8 8 0 01-13 2l-1-2"/></>,
  x: <path d="M6 6l12 12M18 6L6 18"/>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  chevron: <path d="M9 6l6 6-6 6"/>
};

export function Icon({ name, size = 20, className = '', strokeWidth = 1.8 }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}
