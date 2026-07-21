import type { Sport } from '../types'

export type RivalryTier = 1 | 2

export interface Rivalry {
  sport: Sport
  a: string
  b: string
  tier: RivalryTier
  label: string
}

/** Names normalized to lowercase for matching against ESPN display names. */
export const RIVALRIES: Rivalry[] = [
  // MLB
  { sport: 'mlb', a: 'new york yankees', b: 'boston red sox', tier: 1, label: 'Yankees–Red Sox' },
  { sport: 'mlb', a: 'los angeles dodgers', b: 'san francisco giants', tier: 1, label: 'Dodgers–Giants' },
  { sport: 'mlb', a: 'chicago cubs', b: 'st. louis cardinals', tier: 1, label: 'Cubs–Cardinals' },
  { sport: 'mlb', a: 'new york mets', b: 'new york yankees', tier: 2, label: 'Subway Series' },
  { sport: 'mlb', a: 'los angeles dodgers', b: 'los angeles angels', tier: 2, label: 'Freeway Series' },

  // NBA
  { sport: 'nba', a: 'los angeles lakers', b: 'boston celtics', tier: 1, label: 'Lakers–Celtics' },
  { sport: 'nba', a: 'los angeles lakers', b: 'los angeles clippers', tier: 1, label: 'Lakers–Clippers' },
  { sport: 'nba', a: 'boston celtics', b: 'philadelphia 76ers', tier: 1, label: 'Celtics–76ers' },
  { sport: 'nba', a: 'golden state warriors', b: 'cleveland cavaliers', tier: 2, label: 'Warriors–Cavaliers' },
  { sport: 'nba', a: 'golden state warriors', b: 'los angeles lakers', tier: 2, label: 'Warriors–Lakers' },
  { sport: 'nba', a: 'new york knicks', b: 'brooklyn nets', tier: 2, label: 'Knicks–Nets' },

  // NFL
  { sport: 'nfl', a: 'green bay packers', b: 'chicago bears', tier: 1, label: 'Packers–Bears' },
  { sport: 'nfl', a: 'dallas cowboys', b: 'philadelphia eagles', tier: 1, label: 'Cowboys–Eagles' },
  { sport: 'nfl', a: 'pittsburgh steelers', b: 'baltimore ravens', tier: 1, label: 'Steelers–Ravens' },
  { sport: 'nfl', a: 'kansas city chiefs', b: 'las vegas raiders', tier: 1, label: 'Chiefs–Raiders' },
  { sport: 'nfl', a: 'san francisco 49ers', b: 'seattle seahawks', tier: 2, label: '49ers–Seahawks' },
  { sport: 'nfl', a: 'new york giants', b: 'dallas cowboys', tier: 2, label: 'Giants–Cowboys' },
  { sport: 'nfl', a: 'green bay packers', b: 'minnesota vikings', tier: 2, label: 'Packers–Vikings' },

  // NHL
  { sport: 'nhl', a: 'boston bruins', b: 'montreal canadiens', tier: 1, label: 'Bruins–Canadiens' },
  { sport: 'nhl', a: 'pittsburgh penguins', b: 'washington capitals', tier: 1, label: 'Penguins–Capitals' },
  { sport: 'nhl', a: 'edmonton oilers', b: 'calgary flames', tier: 1, label: 'Battle of Alberta' },
  { sport: 'nhl', a: 'new york rangers', b: 'new york islanders', tier: 2, label: 'Rangers–Islanders' },
  { sport: 'nhl', a: 'toronto maple leafs', b: 'montreal canadiens', tier: 2, label: 'Leafs–Habs' },
  { sport: 'nhl', a: 'chicago blackhawks', b: 'detroit red wings', tier: 2, label: 'Blackhawks–Red Wings' },

  // Soccer
  { sport: 'soccer', a: 'barcelona', b: 'real madrid', tier: 1, label: 'El Clásico' },
  { sport: 'soccer', a: 'fc barcelona', b: 'real madrid', tier: 1, label: 'El Clásico' },
  { sport: 'soccer', a: 'manchester city', b: 'manchester united', tier: 1, label: 'Manchester Derby' },
  { sport: 'soccer', a: 'manchester city', b: 'liverpool', tier: 1, label: 'City–Liverpool' },
  { sport: 'soccer', a: 'barcelona', b: 'espanyol', tier: 2, label: 'Derbi Barceloní' },
  { sport: 'soccer', a: 'fc barcelona', b: 'espanyol', tier: 2, label: 'Derbi Barceloní' },
  { sport: 'soccer', a: 'arsenal', b: 'tottenham hotspur', tier: 1, label: 'North London Derby' },
  { sport: 'soccer', a: 'liverpool', b: 'everton', tier: 1, label: 'Merseyside Derby' },
  { sport: 'soccer', a: 'ac milan', b: 'inter milan', tier: 1, label: 'Derby della Madonnina' },
  { sport: 'soccer', a: 'minnesota united fc', b: 'sporting kansas city', tier: 2, label: 'MLS Midwest rivalry' },
  { sport: 'soccer', a: 'minnesota united fc', b: 'chicago fire fc', tier: 2, label: 'MLS regional rivalry' },
  { sport: 'soccer', a: 'la galaxy', b: 'lafc', tier: 1, label: 'El Tráfico' },
  { sport: 'soccer', a: 'seattle sounders fc', b: 'portland timbers', tier: 1, label: 'Cascadia Cup' },
]

function norm(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function namesMatch(a: string, b: string): boolean {
  const na = norm(a)
  const nb = norm(b)
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  const aTokens = na.split(' ').filter((t) => t.length > 2)
  const bTokens = new Set(nb.split(' ').filter((t) => t.length > 2))
  const overlap = aTokens.filter((t) => bTokens.has(t))
  return overlap.length >= 2 || (overlap.length === 1 && aTokens.length <= 2)
}

export function findRivalry(
  sport: Sport,
  homeName?: string,
  awayName?: string,
): Rivalry | null {
  if (!homeName || !awayName || sport === 'f1') return null
  for (const r of RIVALRIES) {
    if (r.sport !== sport) continue
    const match =
      (namesMatch(homeName, r.a) && namesMatch(awayName, r.b)) ||
      (namesMatch(homeName, r.b) && namesMatch(awayName, r.a))
    if (match) return r
  }
  return null
}
