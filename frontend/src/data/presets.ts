export interface PresetInfo {
  id: string;
  label: string;
  description: string;
}

export const QUANT_PRESETS: PresetInfo[] = [
  { id: "conservative", label: "Conservative", description: "PE ≤ 25, D/E ≤ 2, FCF/share ≥ $1" },
  { id: "default",      label: "Default",      description: "PE ≤ 60, D/E ≤ 5, FCF/share ≥ $0.10" },
  { id: "aggressive",   label: "Aggressive",   description: "PE ≤ 100, D/E ≤ 10, FCF/share ≥ $0.01" },
];

export const VALUATION_PRESETS: PresetInfo[] = [
  { id: "balanced",  label: "Balanced",  description: "Equal weight across DCF, P/FCF, Graham" },
  { id: "dcf_heavy", label: "DCF-heavy", description: "60% DCF, 25% P/FCF, 15% Graham" },
  { id: "graham",    label: "Graham",    description: "70% Graham, 20% P/FCF, 10% DCF" },
];

export const DEFAULT_QUANT_PRESET = "default";
export const DEFAULT_VALUATION_PRESET = "balanced";
