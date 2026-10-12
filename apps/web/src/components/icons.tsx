import type { SVGProps } from 'react';

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="Nimbus"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
      }}
    />
  );
}

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function IconFiles(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </Icon>
  );
}

export function IconFolder(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="1.6" {...props}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </Icon>
  );
}

export function IconFile(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="1.6" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </Icon>
  );
}

export function IconListView(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="2" {...props}>
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </Icon>
  );
}

export function IconGridView(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="2" {...props}>
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </Icon>
  );
}

export function IconUpload(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </Icon>
  );
}

export function IconNewFolder(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      <line x1="12" y1="11" x2="12" y2="17"></line>
      <line x1="9" y1="14" x2="15" y2="14"></line>
    </Icon>
  );
}

export function IconLogout(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </Icon>
  );
}

export function IconEye(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="1.6" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </Icon>
  );
}

export function IconEyeOff(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="1.6" {...props}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.4 19.4 0 0 1 4.22-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a19.5 19.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </Icon>
  );
}

export function IconMoreVertical(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="2" fill="currentColor" stroke="none" {...props}>
      <circle cx="12" cy="5" r="1.6"></circle>
      <circle cx="12" cy="12" r="1.6"></circle>
      <circle cx="12" cy="19" r="1.6"></circle>
    </Icon>
  );
}

export function IconDownload(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </Icon>
  );
}

export function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </Icon>
  );
}

export function IconUsers(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </Icon>
  );
}

export function IconUserPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="8.5" cy="7" r="4"></circle>
      <line x1="20" y1="8" x2="20" y2="14"></line>
      <line x1="17" y1="11" x2="23" y2="11"></line>
    </Icon>
  );
}

export function IconEdit(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"></path>
    </Icon>
  );
}

export function IconKey(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L17 4"></path>
    </Icon>
  );
}

export function IconChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="2" {...props}>
      <polyline points="6 9 12 15 18 9"></polyline>
    </Icon>
  );
}

export function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </Icon>
  );
}

export function IconStar(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="1.6" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </Icon>
  );
}

export function IconStarFilled(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="1.6" fill="currentColor" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </Icon>
  );
}

export function IconRestore(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <polyline points="1 4 1 10 7 10"></polyline>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </Icon>
  );
}

export function IconPanelLeftClose(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="1.8" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
      <polyline points="14 9 11 12 14 15"></polyline>
    </Icon>
  );
}

export function IconPanelLeftOpen(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="1.8" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
      <polyline points="12 9 15 12 12 15"></polyline>
    </Icon>
  );
}

export function IconBell(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </Icon>
  );
}

export function IconUser(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4"></circle>
      <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"></path>
    </Icon>
  );
}

export function IconChevronLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="1.9" {...props}>
      <polyline points="15 18 9 12 15 6"></polyline>
    </Icon>
  );
}

export function IconChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="2" {...props}>
      <polyline points="9 18 15 12 9 6"></polyline>
    </Icon>
  );
}

export function IconChevronUp(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="1.9" {...props}>
      <polyline points="18 15 12 9 6 15"></polyline>
    </Icon>
  );
}

export function IconCamera(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </Icon>
  );
}

export function IconImage(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </Icon>
  );
}

// Icones de type de fichier vendorisees depuis file-icon-vectors (MIT), style "vivid" :
// https://www.npmjs.com/package/file-icon-vectors — composants autonomes (pas le
// wrapper Icon() : multi-couleurs, fill-based plutot que stroke-based).
export function IconFilePsd(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 72 96" {...props}>
      <path
        fill="#03c"
        d="M0 2v92c0 1.1.9 2 2 2h68c1.1 0 2-.9 2-2V28H50c-1.1 0-2-.9-2-2V0H2C.9 0 0 .9 0 2z"
      ></path>
      <path fill="#03c" d="M71.9 24c-.1-.4-.2-.7-.4-1L52 1.2V24h19.9z"></path>
      <path
        fill="#fff"
        d="M6 41h60v49H6zm.6-34.6h4.5c2.6 0 4.4 2 4.4 4.9 0 2.9-1.7 5-4.4 5H9.9v4.4H6.6V6.4zm3.9 7c1 0 1.6-.9 1.6-2.1s-.7-2-1.6-2h-.6v4.1h.6zm8.6 3.3c.6.6 1.4 1.2 2.3 1.2.9 0 1.3-.6 1.3-1.2 0-2-4.8-2.1-4.8-6.2 0-2.4 1.7-4.3 4.5-4.3 1.2 0 2.4.3 3.4 1l-1.2 2.9c-.5-.4-1.4-.9-2.2-.9-.9 0-1.3.6-1.3 1.2 0 2.1 4.8 2 4.8 6.1 0 2.3-1.5 4.4-4.4 4.4-1.4 0-2.9-.5-4-1.4l1.6-2.8zM29 6.4h4.2c3.7 0 5.9 2.6 5.9 7.1s-2.2 7.2-5.9 7.2H29V6.4zm4.1 11.4c1.7 0 2.6-1.5 2.6-4.3s-1-4.2-2.6-4.2h-.8v8.5h.8z"
      ></path>
      <path
        fill="#03c"
        stroke="#03c"
        strokeWidth="1.25"
        strokeMiterlimit="10"
        d="M25.9 68.5c-1 0-2-.1-2.8-.3v12.1h-3.8V52.6c1.9-.9 4.5-1.6 7.2-1.6 6.8 0 9.9 3.6 9.9 8.7 0 4.9-3.2 8.8-10.5 8.8zm.6-15.2c-1.3 0-2.5.3-3.4.6V66c.8.1 1.8.2 2.8.2 5 0 6.8-2.9 6.8-6.5 0-3.9-1.8-6.4-6.2-6.4zM46 80.8c-2.2 0-4.7-.6-6.1-1.6l1-2.4c1.3.8 3.1 1.3 4.7 1.3 2.6 0 4.4-1.7 4.4-3.9 0-5.5-9.6-3.3-9.6-10.8 0-3.5 2.8-6.2 7-6.2 2.2 0 4.2.5 5.7 1.6l-1 2.2c-1.2-.8-2.7-1.3-4.2-1.3-2.6 0-3.8 1.6-3.8 3.6 0 5.2 9.7 3.1 9.7 10.8-.1 3.6-3.2 6.7-7.8 6.7z"
      ></path>
    </svg>
  );
}

export function IconFileAi(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 72 96" {...props}>
      <path
        fill="#fea500"
        d="M0 2v92c0 1.1.9 2 2 2h68c1.1 0 2-.9 2-2V28H50c-1.1 0-2-.9-2-2V0H2C.9 0 0 .9 0 2z"
      ></path>
      <path fill="#fea500" d="M71.9 24c-.1-.4-.2-.7-.4-1L52 1.2V24h19.9z"></path>
      <path
        fill="#fff"
        d="M6 41h60v49H6zM9 6.4h3.6l3.6 14.3h-3.3l-.6-3h-3l-.6 3H5.4L9 6.4zm2.8 8.6l-.6-2.8c-.2-.9-.4-2.5-.4-2.5h-.1s-.2 1.5-.4 2.5L9.8 15h2zm6.9-8.6H22v14.3h-3.3V6.4z"
      ></path>
      <path
        fill="#fea500"
        stroke="#fea500"
        strokeWidth="1.25"
        strokeMiterlimit="10"
        d="M37.8 80.3l-2.7-8.7H25l-2.7 8.7h-3.7l9.7-28.9H32l9.8 28.9h-4zM31 58.4c-.3-1.1-.7-2.6-.8-3.7h-.1c-.2 1-.5 2.5-.9 3.7l-3.4 10.9h8.6L31 58.4zm16.7-5c-1.2 0-2.2-.9-2.2-2.1s1-2.1 2.2-2.1 2.2.9 2.2 2.1-1 2.1-2.2 2.1zm-1.8 26.9V57.7h3.7v22.6h-3.7z"
      ></path>
    </svg>
  );
}

export function IconFilePdf(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 72 96" {...props}>
      <path
        fill="#c11e07"
        d="M0 2v92c0 1.1.9 2 2 2h68c1.1 0 2-.9 2-2V28H50c-1.1 0-2-.9-2-2V0H2C.9 0 0 .9 0 2z"
      ></path>
      <path fill="#c11e07" d="M71.9 24c-.1-.4-.2-.7-.4-1L52 1.2V24h19.9z"></path>
      <path
        fill="#fff"
        d="M6 41h60v49H6zm.6-34.6h4.5c2.6 0 4.4 2 4.4 4.9 0 2.9-1.7 5-4.4 5H9.9v4.4H6.6V6.4zm3.9 7c1 0 1.6-.9 1.6-2.1s-.7-2-1.6-2h-.6v4.1h.6zm7.9-7h4.2c3.7 0 5.9 2.6 5.9 7.1s-2.2 7.2-5.9 7.2h-4.2V6.4zm4.1 11.4c1.7 0 2.6-1.5 2.6-4.3s-1-4.2-2.6-4.2h-.8v8.5h.8zm9.1-11.4h7.1v2.9h-3.8v3.1H38v2.9h-3.1v5.4h-3.3V6.4z"
      ></path>
      <path
        fill="#c11e07"
        stroke="#c11e07"
        strokeWidth=".75"
        strokeMiterlimit="10"
        d="M33.5 46.538c-2.3 0-4.1 1.9-4.1 4.1 0 2.8 1.6 6.3 3.2 9.6-1.3 4-2.7 8.3-4.6 11.9-3.8 1.5-7.2 2.6-9.2 4.3l-.1.1c-.7.8-1.2 1.8-1.2 2.9 0 2.3 1.9 4.1 4.1 4.1 1.1 0 2.2-.4 2.9-1.2 0 0 .1 0 .1-.1 1.5-1.8 3.3-5.1 4.9-8 3.6-1.4 7.5-2.9 11.1-3.8 2.7 2.2 6.6 3.6 9.8 3.6 2.3 0 4.1-1.9 4.1-4.1 0-2.3-1.9-4.1-4.1-4.1-2.6 0-6.3.9-9.1 1.9-2.3-2.2-4.4-4.9-6-7.8 1.1-3.4 2.4-6.7 2.4-9.3-.1-2.3-1.9-4.1-4.2-4.1zm0 2.4c.9 0 1.6.7 1.6 1.6 0 1.2-.7 3.5-1.4 5.9-1-2.4-1.9-4.7-1.9-5.9.1-.8.8-1.6 1.7-1.6zm.7 14.1c1.2 2 2.7 3.8 4.3 5.4-2.4.7-4.8 1.5-7.2 2.4 1.2-2.5 2.1-5.2 2.9-7.8zm16.2 5.3c.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-1.9 0-4.5-.8-6.6-2 2.4-.6 5.1-1.2 6.6-1.2zm-24.5 7.3c-1.2 2.1-2.3 4-3.1 5-.3.3-.6.4-1.1.4-.9 0-1.6-.7-1.6-1.6 0-.4.2-.9.4-1.1.9-.8 3-1.7 5.4-2.7z"
      ></path>
    </svg>
  );
}
