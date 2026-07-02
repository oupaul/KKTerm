import { isTauriRuntime, pickAndSaveFile, type WidgetFilePickFilter } from "../../lib/tauri";
import type { Rack, RackItem, Site } from "../../types";
import { groupRackTopology, topologyGroupKey } from "./rackTopology";
import { normalizeRackItemMetadata, summarizeRackDeviceMetadata } from "./rackInventory";

export type ItOpsExportFormat = "pdf" | "excel";

export interface ItOpsExportSection {
  heading: string;
  rows: string[];
}

export interface ItOpsPdfDocument {
  title: string;
  sections: ItOpsExportSection[];
}

export interface ItOpsExportLabels {
  devices: string;
  noRacks: string;
  noDevices: string;
  inventory: string;
  rack: string;
  group: string;
  ungrouped: string;
  startU: string;
  heightU: string;
  type: string;
  label: string;
  status: string;
  connection: string;
  specs: string;
  tags: string;
  deviceCount: (count: number) => string;
  statusLabel: (status: string) => string;
}

const PDF_LINES_PER_PAGE = 48;

const encoder = new TextEncoder();

function asciiPdfText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function pdfLineCommands(lines: string[]): string {
  return [
    "BT",
    "/F1 11 Tf",
    "14 TL",
    "52 790 Td",
    ...lines.map((line) => `(${asciiPdfText(line)}) Tj T*`),
    "ET",
  ].join("\n");
}

export function createItOpsPdfBytes(doc: ItOpsPdfDocument): Uint8Array {
  const lines = [
    doc.title,
    "",
    ...doc.sections.flatMap((section) => [
      section.heading,
      ...section.rows.map((row) => `  ${row}`),
      "",
    ]),
  ];
  const pages = Array.from(
    { length: Math.max(1, Math.ceil(lines.length / PDF_LINES_PER_PAGE)) },
    (_, index) => lines.slice(index * PDF_LINES_PER_PAGE, (index + 1) * PDF_LINES_PER_PAGE),
  );

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];

  for (const pageLines of pages) {
    const stream = pdfLineCommands(pageLines);
    const contentId = addObject(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(encoder.encode(output).length);
    output += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(output).length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return encoder.encode(output);
}

function downloadBytes(filename: string, bytes: Uint8Array, mime: string) {
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function saveExportBytes(
  filename: string,
  bytes: Uint8Array,
  filters: WidgetFilePickFilter[],
  mime: string,
): Promise<string | null> {
  if (isTauriRuntime()) {
    return pickAndSaveFile(filename, bytes, filters);
  }
  downloadBytes(filename, bytes, mime);
  return filename;
}

function safeFilename(value: string): string {
  const invalid = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);
  const cleaned = [...value]
    .map((char) => (char.charCodeAt(0) < 32 || invalid.has(char) ? "-" : char))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "it-ops";
}

export function pdfFilename(name: string): string {
  return `${safeFilename(name)}.pdf`;
}

export function excelFilename(name: string): string {
  return `${safeFilename(name)}.xls`;
}

function itemDisplayName(item: RackItem, kindLabel: (kind: RackItem["kind"]) => string): string {
  return item.label || kindLabel(item.kind);
}

function itemSummary(
  item: RackItem,
  labels: ItOpsExportLabels,
  kindLabel: (kind: RackItem["kind"]) => string,
): string {
  const metadata = normalizeRackItemMetadata(item.metadata ?? {});
  const status = metadata.status ?? "online";
  const specs = summarizeRackDeviceMetadata(item.metadata ?? {});
  const span = item.heightU > 1 ? `U${item.startU}-${item.startU + item.heightU - 1}` : `U${item.startU}`;
  return `${span}: ${itemDisplayName(item, kindLabel)} (${kindLabel(item.kind)}, ${labels.statusLabel(status)})${specs.length ? ` - ${specs.join(", ")}` : ""}`;
}

export function sitePdfDocument({
  site,
  racks,
  unassignedLabel,
  labels,
  kindLabel,
}: {
  site: Site;
  racks: Rack[];
  unassignedLabel: string;
  labels: ItOpsExportLabels;
  kindLabel: (kind: RackItem["kind"]) => string;
}): ItOpsPdfDocument {
  const topology = groupRackTopology(racks);
  return {
    title: site.name,
    sections: topology.map((room) => ({
      heading: room.key || unassignedLabel,
      rows: room.racks.length
        ? room.racks.map((rack) => `${rack.name}: ${rack.heightU}U, ${labels.deviceCount(rack.items.length)}`)
        : [labels.noRacks],
    })).concat([
      {
        heading: labels.inventory,
        rows: racks.flatMap((rack) =>
          rack.items.map((item) => `${rack.name} - ${itemSummary(item, labels, kindLabel)}`),
        ),
      },
    ]),
  };
}

export function serverRoomPdfDocument({
  site,
  roomName,
  racks,
  unassignedLabel,
  labels,
  kindLabel,
}: {
  site: Site;
  roomName: string;
  racks: Rack[];
  unassignedLabel: string;
  labels: ItOpsExportLabels;
  kindLabel: (kind: RackItem["kind"]) => string;
}): ItOpsPdfDocument {
  const title = `${site.name} / ${roomName || unassignedLabel}`;
  return {
    title,
    sections: racks.map((rack) => ({
      heading: rack.name,
      rows: rack.items.length
        ? rack.items.map((item) => itemSummary(item, labels, kindLabel))
        : [labels.noDevices],
    })),
  };
}

export function rackPdfDocument({
  site,
  rack,
  roomName,
  unassignedLabel,
  labels,
  kindLabel,
}: {
  site: Site;
  rack: Rack;
  roomName: string;
  unassignedLabel: string;
  labels: ItOpsExportLabels;
  kindLabel: (kind: RackItem["kind"]) => string;
}): ItOpsPdfDocument {
  return {
    title: `${site.name} / ${roomName || unassignedLabel} / ${rack.name}`,
    sections: [
      {
        heading: labels.rack,
        rows: [
          `${rack.heightU}U`,
          labels.deviceCount(rack.items.length),
          `${labels.group}: ${rack.rackGroup || labels.ungrouped}`,
        ],
      },
      {
        heading: labels.devices,
        rows: rack.items.length
          ? rack.items.map((item) => itemSummary(item, labels, kindLabel))
          : [labels.noDevices],
      },
    ],
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function rackExcelBytes({
  site,
  rack,
  roomName,
  unassignedLabel,
  labels,
  kindLabel,
}: {
  site: Site;
  rack: Rack;
  roomName: string;
  unassignedLabel: string;
  labels: ItOpsExportLabels;
  kindLabel: (kind: RackItem["kind"]) => string;
}): Uint8Array {
  const rows = rack.items.map((item) => {
    const metadata = normalizeRackItemMetadata(item.metadata ?? {});
    const specs = summarizeRackDeviceMetadata(item.metadata ?? {});
    return [
      item.startU.toString(),
      item.heightU.toString(),
      kindLabel(item.kind),
      item.label || kindLabel(item.kind),
      labels.statusLabel(metadata.status ?? "online"),
      item.connectionId ?? "",
      specs.join(", "),
      (metadata.tags ?? []).join(", "),
    ];
  });
  const tableRows = [
    [labels.startU, labels.heightU, labels.type, labels.label, labels.status, labels.connection, labels.specs, labels.tags],
    ...rows,
  ];
  const title = `${site.name} / ${roomName || unassignedLabel} / ${rack.name}`;
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    table { border-collapse: collapse; font-family: Segoe UI, Arial, sans-serif; }
    th, td { border: 1px solid #999; padding: 4px 8px; }
    th { background: #e8eef8; font-weight: 700; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <table>${tableRows
    .map((row, index) => {
      const tag = index === 0 ? "th" : "td";
      return `<tr>${row.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join("")}</tr>`;
    })
    .join("")}</table>
</body>
</html>`;
  return encoder.encode(html);
}

// Both spatial room layouts (floor plan + 2.5D) store grid cells (col/row)
// under this one scope; facing and room objects reuse the same scope string.
export function roomIsoLayoutScope(siteId: string, serverRoom: string): string {
  return `roomIso:${siteId}:${topologyGroupKey(serverRoom)}`;
}

export function siteLayoutScope(siteId: string): string {
  return `site:${siteId}`;
}
