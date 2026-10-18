// Public emergency numbers shown on the Alerts page to everyone.
// Only numbers confirmed from official or multiple sources are switched on.
// Before adding a local number, CALL IT to check it is answered.
export interface EmergencyNumber {
  label: string
  detail: string
  phone: string // what the phone dials
  display: string // how it is written on screen
}

export const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  { label: 'Emergency (any)', detail: 'Police, fire or ambulance. Free, works from any network', phone: '112', display: '112' },
  { label: 'Police', detail: 'Nigeria Police Force emergency line', phone: '199', display: '199' },
  { label: 'Fire service', detail: 'Federal Fire Service, Abuja direct line', phone: '+2348032003557', display: '0803 200 3557' },
  { label: 'Road accident', detail: 'Federal Road Safety Corps', phone: '122', display: '122' },
  { label: 'Disaster (flood, collapse)', detail: 'NEMA, toll-free', phone: '080022556362', display: '0800 2255 6362' },
  // FCT Police Command control room: published numbers differ between
  // sources. Call them, then switch on the one that answers, e.g.:
  // { label: 'FCT Police control room', detail: 'Abuja', phone: '+2348032003913', display: '0803 200 3913' },
]
