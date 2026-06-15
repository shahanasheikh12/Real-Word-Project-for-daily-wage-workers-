/**
 * skillMeta.js
 * Centralised metadata for skill categories:
 *   label, emoji, map pin colour, badge colour.
 * Used in job cards, map pins, filter chips, and skill badges.
 */

export const SKILLS = [
  { value: 'construction', label: 'Construction', emoji: '🏗️', color: '#E74C3C', light: '#FADBD8' },
  { value: 'plumbing',     label: 'Plumbing',     emoji: '🔧', color: '#2980B9', light: '#D6EAF8' },
  { value: 'electrical',   label: 'Electrical',   emoji: '⚡', color: '#F39C12', light: '#FEF9E7' },
  { value: 'painting',     label: 'Painting',     emoji: '🖌️', color: '#8E44AD', light: '#F5EEF8' },
  { value: 'carpentry',    label: 'Carpentry',    emoji: '🪚', color: '#D35400', light: '#FDEBD0' },
  { value: 'cleaning',     label: 'Cleaning',     emoji: '🧹', color: '#27AE60', light: '#D5F5E3' },
  { value: 'gardening',    label: 'Gardening',    emoji: '🌿', color: '#1E8449', light: '#D4EFDF' },
  { value: 'delivery',     label: 'Delivery',     emoji: '📦', color: '#2471A3', light: '#D6EAF8' },
  { value: 'domestic',     label: 'Domestic Help',emoji: '🏠', color: '#B7950B', light: '#FEF3CD' },
  { value: 'other',        label: 'Other',        emoji: '⚙️', color: '#566573', light: '#EAECEE' },
]

/** Map: skill value → full metadata object */
export const SKILL_MAP = Object.fromEntries(SKILLS.map(s => [s.value, s]))

/** Returns metadata for a skill, falls back to 'other' */
export function getSkillMeta(value) {
  return SKILL_MAP[value] ?? SKILL_MAP['other']
}

/** Duration display labels */
export const DURATION_LABELS = {
  half_day:  'Half Day',
  full_day:  'Full Day',
  multi_day: 'Multi Day',
}

/** Application status display */
export const APP_STATUS = {
  pending:   { label: 'Pending',   chipClass: 'chip-pending',   icon: '🕐' },
  confirmed: { label: 'Confirmed', chipClass: 'chip-confirmed', icon: '✅' },
  declined:  { label: 'Declined',  chipClass: 'chip-cancelled', icon: '❌' },
  completed: { label: 'Completed', chipClass: 'chip-completed', icon: '🏁' },
}

/** Job status display */
export const JOB_STATUS = {
  open:      { label: 'Open',      chipClass: 'chip-open' },
  filled:    { label: 'Filled',    chipClass: 'chip-confirmed' },
  completed: { label: 'Completed', chipClass: 'chip-completed' },
  cancelled: { label: 'Cancelled', chipClass: 'chip-cancelled' },
}
