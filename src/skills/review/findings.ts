export const INJECTION_PATTERNS: [RegExp, string][] = [
  [/ignore (all |any )?(previous|prior|above) instructions/i, "instruction override"],
  [/disregard (the |your |all )?(system prompt|previous|prior)/i, "instruction override"],
  [/you are (now|no longer) (bound|restricted|limited)/i, "role/constraint override"],
  [/do not (tell|inform|mention|warn) the user/i, "conceal from user"],
  [/without (the user|user's|the human)('s)? (knowledge|consent|awareness)/i, "conceal from user"],
  [/(send|post|upload|exfiltrat\w*)\s+(the\s+)?(contents?|file|data|key|token|secret|credential)s?\s+(to|via)\s+https?:\/\//i, "possible exfiltration instruction"],
  [/read\s+(the\s+)?(~\/\.ssh|\.env|id_rsa|credentials|\.aws\/credentials|\.netrc)/i, "credential/secret access instruction"],
  [/curl\s+[^\n]*\|\s*(sh|bash|zsh)/i, "remote-script execution"],
  [/base64\s+-d/i, "encoded payload decode"],
  [/\u200b|\u200c|\u200d|\ufeff/, "zero-width/invisible character"],
];

export const PROSE_EXTS = new Set([".md", ".mdx", ".txt"]);
export const CODE_EXTS = new Set([".sh", ".py", ".js", ".mjs", ".cjs", ".ts"]);
