/** Classic F1 circuits that get a scarcity/prestige bonus. */
export const CLASSIC_CIRCUITS: Record<string, string> = {
  monaco: 'Monaco',
  spa: 'Spa-Francorchamps',
  monza: 'Monza',
  silverstone: 'Silverstone',
  suzuka: 'Suzuka',
}

export function isClassicCircuit(circuitId?: string): string | null {
  if (!circuitId) return null
  const key = circuitId.toLowerCase()
  return CLASSIC_CIRCUITS[key] ?? null
}
