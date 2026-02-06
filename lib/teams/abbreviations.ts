/**
 * Team name to 3-letter abbreviation mapping for compact displays.
 */

const TEAM_ABBREVIATIONS: Record<string, string> = {
  "Arsenal": "ARS",
  "Aston Villa": "AVL",
  "Bournemouth": "BOU",
  "Brentford": "BRE",
  "Brighton & Hove Albion": "BRI",
  "Brighton": "BRI",
  "Burnley": "BUR",
  "Chelsea": "CHE",
  "Crystal Palace": "CRY",
  "Everton": "EVE",
  "Fulham": "FUL",
  "Ipswich Town": "IPS",
  "Leicester City": "LEI",
  "Liverpool": "LIV",
  "Luton Town": "LUT",
  "Manchester City": "MCI",
  "Manchester United": "MUN",
  "Newcastle United": "NEW",
  "Newcastle": "NEW",
  "Nottingham Forest": "NFO",
  "Southampton": "SOU",
  "Tottenham Hotspur": "TOT",
  "Tottenham": "TOT",
  "West Ham United": "WHU",
  "West Ham": "WHU",
  "Wolverhampton Wanderers": "WOL",
  "Wolves": "WOL",
};

export function getTeamAbbreviation(teamName: string): string {
  return TEAM_ABBREVIATIONS[teamName] || teamName.slice(0, 3).toUpperCase();
}
