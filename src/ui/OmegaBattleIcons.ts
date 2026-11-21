export type OmegaBattleIconKind =
  | 'retreat'
  | 'timer'
  | 'bossCrown'
  | 'skyDrop'
  | 'invulAegis'
  | 'armorShield'
  | 'clashBlades'
  | 'parryClash'
  | 'crackShield'
  | 'breakBolt'
  | 'shatterPrism'
  | 'squadPower'
  | 'trophyStar';

const OMEGA_BATTLE_ICON_BODIES: Readonly<Record<OmegaBattleIconKind, string>> = {
  // Tactical escape portal + kinetic return arrow
  retreat: `
    <path d="M11 4H18C19.1 4 20 4.9 20 6V18C20 19.1 19.1 20 18 20H11" stroke="#14111d" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M11 4H18C19.1 4 20 4.9 20 6V18C20 19.1 19.1 20 18 20H11" stroke="#fde047" stroke-width="1.4" stroke-linecap="round"/>
    <rect x="12" y="6.2" width="6" height="11.6" rx="1.4" fill="#1e293b" stroke="#14111d" stroke-width="1.3"/>
    <path d="M9.5 6.5L3.2 12L9.5 17.5V14.2H15.8V9.8H9.5Z" fill="#38bdf8" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/>
    <path d="M8.7 9L5.6 12L8.7 11.4H14.3" stroke="#e0f2fe" stroke-width="1.2" stroke-linecap="round"/>
  `,

  // Battle chrono-stopwatch with crimson danger sector
  timer: `
    <path d="M9.5 2.4H14.5M12 2.4V4.8M18.2 5.2L20 7" stroke="#14111d" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="12" cy="13" r="8.2" fill="#fde047" stroke="#14111d" stroke-width="2"/>
    <circle cx="12" cy="13" r="5.9" fill="#fffbeb" stroke="#14111d" stroke-width="1.3"/>
    <path d="M12 7.1A5.9 5.9 0 0 1 17.9 13L12 13Z" fill="#fda4af"/>
    <path d="M12 8.8V13L15.3 14.8" stroke="#dc2626" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="13" r="1.4" fill="#14111d"/>
  `,

  // Crowned crimson raid boss crest (Game-Icons crowned-skull + ZZZ hazard style)
  bossCrown: `
    <polygon points="5.5,9.4 7,4.1 10.2,7.1 12,2.8 13.8,7.1 17,4.1 18.5,9.4" fill="#fde047" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M5.5 9.8C5.5 8.7 6.5 7.9 7.8 7.9H16.2C17.5 7.9 18.5 8.7 18.5 9.8V15.2C18.5 17.8 16 20 12 21.2C8 20 5.5 17.8 5.5 15.2V9.8Z" fill="#e11d48" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/>
    <path d="M12 7.9H16.2C17.5 7.9 18.5 8.7 18.5 9.8V15.2C18.5 17.8 16 20 12 21.2V7.9Z" fill="#9f1239" fill-opacity="0.48"/>
    <polygon points="7.5,12.3 10.8,13.9 7.8,15.1" fill="#fef08a" stroke="#14111d" stroke-width="1.2" stroke-linejoin="round"/>
    <polygon points="16.5,12.3 13.2,13.9 16.2,15.1" fill="#fef08a" stroke="#14111d" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M9.7 18.1V19.6M12 17.9V20M14.3 18.1V19.6" stroke="#14111d" stroke-width="1.4" stroke-linecap="round"/>
  `,

  // Orbital meteor sky-drop warning comet + impact shockwave
  skyDrop: `
    <path d="M4.5 4.2L9.2 8.8M19.5 4.2L14.8 8.8" stroke="#f97316" stroke-width="2.1" stroke-linecap="round"/>
    <path d="M12 2.2L17.6 11.2L14.5 10.2L12 18.4L9.5 10.2L6.4 11.2Z" fill="#ef4444" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="12,5 14.5,10.7 12,15.8 9.5,10.7" fill="#fde047"/>
    <path d="M3.6 19.2C6.4 21.2 17.6 21.2 20.4 19.2" stroke="#fde047" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M4.6 21.3H19.4" stroke="#14111d" stroke-width="1.7" stroke-linecap="round"/>
  `,

  // Faceted hexagonal Invulnerability Aegis shield (WuWa Vibro-Shield)
  invulAegis: `
    <polygon points="12,2.2 20.4,6.8 20.4,17.2 12,21.8 3.6,17.2 3.6,6.8" fill="#38bdf8" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="12,2.2 20.4,6.8 20.4,17.2 12,21.8" fill="#0284c7" fill-opacity="0.58"/>
    <polygon points="12,5.1 17.7,8.3 17.7,15.7 12,18.9 6.3,15.7 6.3,8.3" fill="none" stroke="#e0f2fe" stroke-width="1.4" stroke-linejoin="round"/>
    <polygon points="12,7.7 14.9,12 12,16.3 9.1,12" fill="#ffffff" stroke="#14111d" stroke-width="1.4" stroke-linejoin="round"/>
  `,

  // Obsidian Armor-Reduce bastion crest
  armorShield: `
    <path d="M12 2.4L19.6 5.4V11.8C19.6 16.7 16.4 20.2 12 21.8C7.6 20.2 4.4 16.7 4.4 11.8V5.4L12 2.4Z" fill="#c084fc" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/>
    <path d="M12 2.4L19.6 5.4V11.8C19.6 16.7 16.4 20.2 12 21.8V2.4Z" fill="#7e22ce" fill-opacity="0.58"/>
    <path d="M12 5.4L16.6 7.4V11.6C16.6 14.8 14.5 17.2 12 18.4C9.5 17.2 7.4 14.8 7.4 11.6V7.4L12 5.4Z" fill="none" stroke="#fae8ff" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M8.8 11L12 13.9L15.2 11" stroke="#fde047" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  `,

  // Sculpted twin katana blades + golden clash flare
  clashBlades: `
    <path d="M3.6 20.4L7.2 16.8" stroke="#14111d" stroke-width="4" stroke-linecap="round"/>
    <path d="M3.6 20.4L7.2 16.8" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M7.6 16.4L19.8 4.2L20.5 3.5L18.1 7L9.2 16.8Z" fill="#e2e8f0" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M20.4 20.4L16.8 16.8" stroke="#14111d" stroke-width="4" stroke-linecap="round"/>
    <path d="M20.4 20.4L16.8 16.8" stroke="#0284c7" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M16.4 16.4L4.2 4.2L3.5 3.5L5.9 7L14.8 16.8Z" fill="#f8fafc" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M5.6 14.6L9.4 18.4M18.4 14.6L14.6 18.4" stroke="#14111d" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M5.6 14.6L9.4 18.4M18.4 14.6L14.6 18.4" stroke="#fde047" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M12 4.5L13.4 9L17.9 10.4L13.4 11.8L12 16.3L10.6 11.8L6.1 10.4L10.6 9Z" fill="#fde047" stroke="#14111d" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="12" cy="10.4" r="1.5" fill="#ffffff"/>
  `,

  // Enlarged floating Boss Parry Ring centerpiece w/ WuWa 4-point glint
  parryClash: `
    <circle cx="12" cy="12" r="9.6" fill="none" stroke="#fde047" stroke-width="1.3" stroke-dasharray="3.5 2.5"/>
    <path d="M4.2 19.8L7.6 16.4M19.8 19.8L16.4 16.4" stroke="#14111d" stroke-width="4" stroke-linecap="round"/>
    <path d="M8 16L19.4 4.6L17.4 7.8L9.6 16.4Z" fill="#f8fafc" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M16 16L4.6 4.6L6.6 7.8L14.4 16.4Z" fill="#e2e8f0" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M6.2 14.4L9.8 18M17.8 14.4L14.2 18" stroke="#fde047" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M12 3.2L13.7 8.8L19.3 10.5L13.7 12.2L12 17.8L10.3 12.2L4.7 10.5L10.3 8.8Z" fill="#fde047" stroke="#14111d" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="12" cy="10.5" r="1.8" fill="#ffffff"/>
  `,

  // ZZZ-inspired tactical corner-bracket lock-on & shield-crack crystal reticle
  crackShield: `
    <path d="M4.2 8.2V4.2H8.2M15.8 4.2H19.8V8.2M19.8 15.8V19.8H15.8M8.2 19.8H4.2V15.8" stroke="#14111d" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4.2 8.2V4.2H8.2M15.8 4.2H19.8V8.2M19.8 15.8V19.8H15.8M8.2 19.8H4.2V15.8" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <polygon points="12,5.8 18.2,12 12,18.2 5.8,12" fill="#fde047" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="2.6" fill="#ef4444" stroke="#14111d" stroke-width="1.4"/>
    <path d="M12 2.2V5M12 19V21.8M2.2 12H5M19 12H21.8" stroke="#14111d" stroke-width="1.9" stroke-linecap="round"/>
  `,

  // OMEGA BREAK resonance impact bolt + starburst flash
  breakBolt: `
    <path d="M12 2L14 7.3L19.4 5.9L16.4 10.8L21.4 13.8L16 15.7L17.4 21.3L12 18L6.6 21.3L8 15.7L2.6 13.8L7.6 10.8L4.6 5.9L10 7.3Z" fill="#f97316" fill-opacity="0.4"/>
    <polygon points="13.8,2.2 5.3,12.8 11.2,12.8 9.2,21.8 18.7,10.3 12.6,10.3" fill="#fde047" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="12.9,5.3 8.4,11.6 11.7,11.6 10.7,17 15.3,11.5 12.2,11.5" fill="#fffbeb"/>
  `,

  // Fractured crystal shards exploding (Shatter / Pillar Break)
  shatterPrism: `
    <polygon points="11.1,3 5,11.5 9.8,19.4 11.4,12.2 9.4,9.8" fill="#38bdf8" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <polygon points="13.2,3.4 19.2,11.2 14.5,19.1 12.9,12.4 15,9.5" fill="#e879f9" stroke="#14111d" stroke-width="1.8" stroke-linejoin="round"/>
    <polygon points="3.2,6.4 5.8,5.1 5,8.2" fill="#fde047" stroke="#14111d" stroke-width="1.1" stroke-linejoin="round"/>
    <polygon points="20.8,16.6 18.2,17.9 19,14.8" fill="#fde047" stroke="#14111d" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M12 6.8L12.9 11L12 15.5L11.1 11Z" fill="#ffffff"/>
  `,

  // Squad kinetic slash arc + 4-point star core (Squad DPS / Damage Dealt)
  squadPower: `
    <path d="M4.2 17.6C6.8 9.4 12.8 4.8 20.5 3.8C18 10.4 14 15.6 7.4 19.6Z" fill="#38bdf8" stroke="#14111d" stroke-width="1.9" stroke-linejoin="round"/>
    <path d="M7.3 16.4C9.6 11.1 13.3 8.1 18 6.8" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M15.6 11.4L17.1 15.2L20.9 16.7L17.1 18.2L15.6 22L14.1 18.2L10.3 16.7L14.1 15.2Z" fill="#fde047" stroke="#14111d" stroke-width="1.4" stroke-linejoin="round"/>
  `,

  // Golden champion chalice w/ ruby star (Victory / Raid Style)
  trophyStar: `
    <path d="M6.2 4.5H17.8V10.4C17.8 13.8 15.2 16.4 12 16.4C8.8 16.4 6.2 13.8 6.2 10.4V4.5Z" fill="#fde047" stroke="#14111d" stroke-width="2" stroke-linejoin="round"/>
    <path d="M6.2 6.2H3.6C3.3 9.5 4.3 11.4 6.2 11.6M17.8 6.2H20.4C20.7 9.5 19.7 11.4 17.8 11.6" stroke="#14111d" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M12 16.4V19.8M8.2 20.5H15.8" stroke="#14111d" stroke-width="2.2" stroke-linecap="round"/>
    <polygon points="12,6.9 13,9.3 15.5,9.5 13.6,11.2 14.2,13.7 12,12.3 9.8,13.7 10.4,11.2 8.5,9.5 11,9.3" fill="#ef4444" stroke="#14111d" stroke-width="1" stroke-linejoin="round"/>
  `,
};

/** Renders a stylized Sticker-Pop / WuWa-inspired SVG icon for the Omega Boss battle HUD. */
export function omegaBattleIconHtml(
  kind: OmegaBattleIconKind,
  sizePx = 16,
  extraClass = ''
): string {
  const body = OMEGA_BATTLE_ICON_BODIES[kind];
  const cls = extraClass ? `shrink-0 ${extraClass}` : 'shrink-0';
  return `<svg viewBox="0 0 24 24" width="${sizePx}" height="${sizePx}" fill="none" class="${cls}" data-omega-icon="${kind}" aria-hidden="true">${body}</svg>`;
}
