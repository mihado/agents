export interface Finding {
  file: string;
  label: string;
  snippet: string;
  lineNum?: number;
  fingerprint: string;
}

export interface BaselineFingerprintEntry {
  hash: string;
  rule_id: string;
  file: string;
  reason: string;
}

export interface BaselineRule {
  rule_id?: string;
  file_glob?: string;
}

export interface Baseline {
  rules: BaselineRule[];
  fingerprints: BaselineFingerprintEntry[];
}
