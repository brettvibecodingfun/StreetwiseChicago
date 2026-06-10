// World Cup 2026 qualified nations, organized by pool tier
const FLAG_MAP: Record<string, string> = {
  // Tier 1 — FIFA ranks #1–6
  'france':      '🇫🇷',
  'spain':       '🇪🇸',
  'argentina':   '🇦🇷',
  'england':     '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'portugal':    '🇵🇹',
  'brazil':      '🇧🇷',

  // Tier 2 — FIFA ranks #7–17
  'netherlands': '🇳🇱',
  'morocco':     '🇲🇦',
  'belgium':     '🇧🇪',
  'germany':     '🇩🇪',
  'croatia':     '🇭🇷',
  'colombia':    '🇨🇴',
  'senegal':     '🇸🇳',
  'mexico':      '🇲🇽',
  'usa':         '🇺🇸',
  'united states': '🇺🇸',
  'uruguay':     '🇺🇾',

  // Tier 3 — FIFA ranks #18–31
  'japan':       '🇯🇵',
  'switzerland': '🇨🇭',
  'iran':        '🇮🇷',
  'türkiye':     '🇹🇷',
  'turkey':      '🇹🇷',
  'ecuador':     '🇪🇨',
  'austria':     '🇦🇹',
  'south korea': '🇰🇷',
  'korea republic': '🇰🇷',
  'australia':   '🇦🇺',
  'algeria':     '🇩🇿',
  'egypt':       '🇪🇬',
  'canada':      '🇨🇦',
  'norway':      '🇳🇴',

  // Tier 4 — Flyer (FIFA ranks #33+)
  'panama':            '🇵🇦',
  'ivory coast':       '🇨🇮',
  "côte d'ivoire":     '🇨🇮',
  'sweden':            '🇸🇪',
  'paraguay':          '🇵🇾',
  'czechia':           '🇨🇿',
  'czech republic':    '🇨🇿',
  'scotland':          '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'tunisia':           '🇹🇳',
  'dr congo':          '🇨🇩',
  'congo':             '🇨🇩',
  'uzbekistan':        '🇺🇿',
  'qatar':             '🇶🇦',
  'iraq':              '🇮🇶',
  'south africa':      '🇿🇦',
  'saudi arabia':      '🇸🇦',
  'jordan':            '🇯🇴',
  'bosnia & herz.':    '🇧🇦',
  'bosnia':            '🇧🇦',
  'bosnia & herzegovina': '🇧🇦',
  'cape verde':        '🇨🇻',
  'ghana':             '🇬🇭',
  'curaçao':           '🇨🇼',
  'curacao':           '🇨🇼',
  'haiti':             '🇭🇹',
  'new zealand':       '🇳🇿',
};

export function getFlag(team: string | null | undefined): string {
  if (!team) return '';
  return FLAG_MAP[team.toLowerCase().trim()] ?? '';
}
