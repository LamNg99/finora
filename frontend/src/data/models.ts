export interface ModelInfo {
  id: string;
  label: string;
  tags: string[];
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: "gpt-oss-20b",
    label: "GPT OSS 20B",
    tags: ["Fast", "Efficient", "Cost-effective"],
  },
  {
    id: "nemotron-3-super-120b-a12b",
    label: "Nemotron 3 Super 120B",
    tags: ["High Reasoning", "Large Context", "Slower"],
  },
];

export const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;
