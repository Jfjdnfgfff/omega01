import type { SVGProps } from 'react';

/**
 * مجموعة أيقونات محدودة ومتسقة (خط واحد، حجم واحد).
 * مقصودة قليلة العدد: الواجهة تعتمد على النص أكثر من الأيقونات.
 */

export type IconName =
  | 'home'
  | 'target'
  | 'checkSquare'
  | 'clock'
  | 'repeat'
  | 'folder'
  | 'note'
  | 'review'
  | 'wallet'
  | 'sparkles'
  | 'settings'
  | 'plus'
  | 'trash'
  | 'edit'
  | 'search'
  | 'close'
  | 'chevronStart'
  | 'chevronEnd'
  | 'calendar'
  | 'alert'
  | 'sun'
  | 'moon'
  | 'menu'
  | 'play'
  | 'pause'
  | 'reset'
  | 'download'
  | 'upload'
  | 'check'
  | 'flame'
  | 'chart'
  | 'logout'
  | 'list'
  | 'board';

const PATHS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-6h5v6',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z',
  checkSquare: 'M4.5 5.5h15v13h-15zM8 12l2.5 2.5L16 9',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5V12l3.5 2',
  repeat: 'M4 9a5 5 0 0 1 5-5h9m0 0-3-3m3 3-3 3M20 15a5 5 0 0 1-5 5H6m0 0 3 3m-3-3 3-3',
  folder: 'M3.5 6.5h5l2 2.5h10v10h-17zM3.5 6.5v12',
  note: 'M6 3.5h9l4 4V20H6zM14.5 3.5V8H19M9 12h7M9 16h5',
  review: 'M4 6.5h16M4 12h16M4 17.5h10',
  wallet: 'M3.5 7.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-14zM3.5 7.5V6a1.5 1.5 0 0 1 1.5-1.5h11M16.5 13h1.5',
  sparkles: 'M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9-5.7-1.8L10.2 9zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm8-3.2-2-.6a6.4 6.4 0 0 0-.8-2l1-1.8-1.9-1.9-1.8 1a6.4 6.4 0 0 0-2-.8L12 4l-2.5.9a6.4 6.4 0 0 0-2 .8l-1.8-1L3.8 6.6l1 1.8a6.4 6.4 0 0 0-.8 2l-2 .6v2.6l2 .6c.2.7.5 1.4.8 2l-1 1.8 1.9 1.9 1.8-1c.6.4 1.3.6 2 .8L12 20l2.5-.9c.7-.2 1.4-.5 2-.8l1.8 1 1.9-1.9-1-1.8c.4-.6.6-1.3.8-2l2-.6z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5',
  edit: 'M4 20h4l10-10-4-4L4 16zM14.5 5.5l4 4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5 0 4.5 4.5',
  close: 'M6 6l12 12M18 6 6 18',
  chevronStart: 'M15 5l-7 7 7 7',
  chevronEnd: 'M9 5l7 7-7 7',
  calendar: 'M4 7h16v13H4zM4 11h16M8 4v4M16 4v4',
  alert: 'M12 4 2.8 20h18.4zM12 10v4.5M12 17.3v.2',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  play: 'M8 5.5 19 12 8 18.5z',
  pause: 'M9 5.5v13M15 5.5v13',
  reset: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4 4v4h4',
  download: 'M12 4v11m0 0 4-4m-4 4-4-4M5 19h14',
  upload: 'M12 16V5m0 0 4 4m-4-4-4 4M5 20h14',
  check: 'M5 12.5 10 17.5 19 7',
  flame: 'M12 21c3.3 0 6-2.5 6-5.7 0-4.3-4-6-4.6-9.8-2 1.4-2.7 3-2.4 4.8-1.3-.6-2-1.8-2-3.3C7 9 6 11.6 6 15.3 6 18.5 8.7 21 12 21Z',
  chart: 'M4 20V9m5.3 11V4m5.4 16v-7m5.3 7V7',
  logout: 'M15 5.5H6.5v13H15M18 12H10m8 0-3-3m3 3-3 3',
  list: 'M8 6.5h12M8 12h12M8 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01',
  board: 'M4 5h5v14H4zM15 5h5v9h-5z',
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
