export const DEFAULT_TERMINAL_ENCODING = "utf-8";

export const TERMINAL_ENCODING_OPTIONS = [
  { value: "utf-8", label: "UTF-8" },
  { value: "gbk", label: "GBK" },
  { value: "gb18030", label: "GB18030" },
  { value: "big5", label: "Big5" },
  { value: "shift_jis", label: "Shift_JIS" },
  { value: "euc-jp", label: "EUC-JP" },
  { value: "euc-kr", label: "EUC-KR" },
  { value: "windows-1252", label: "Windows-1252" },
  { value: "windows-1251", label: "Windows-1251" },
  { value: "koi8-r", label: "KOI8-R" },
] as const;

export function normalizeTerminalEncoding(value: string | undefined) {
  return TERMINAL_ENCODING_OPTIONS.some((option) => option.value === value)
    ? value ?? DEFAULT_TERMINAL_ENCODING
    : DEFAULT_TERMINAL_ENCODING;
}
