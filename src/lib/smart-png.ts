/**
 * Smart PNG Utility: Embeds and extracts editable canvas state into/from standard PNG files.
 * Uses PNG tEXt and iTXt chunks adhering to the W3C PNG specification.
 * Fully compatible with all standard image viewers, social platforms, and browsers.
 */

// CRC-32 lookup table for fast PNG checksum calculation
let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c >>> 0;
  }
  crcTable = table;
  return table;
}

function calculateCrc32(bytes: Uint8Array, offset: number, length: number): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = offset; i < offset + length; i++) {
    const b = bytes[i] ?? 0;
    crc = (crc >>> 8) ^ table[(crc ^ b) & 0xff]!;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const SMART_CANVAS_KEYWORD = "SmartCanvas";
const ALT_CANVAS_KEYWORD = "WhiteboardData";
const PAYLOAD_SIGNATURE_PREFIX = "__HBIBO_SMART_CANVAS_V1__:";

export interface SmartCanvasPayload {
  version: number;
  appName: string;
  exportedAt: number;
  name?: string;
  elements: any[];
  bgColor?: string;
  theme?: string;
  gridStyle?: string;
  gridSpacing?: number;
  camera?: { x: number; y: number; zoom: number };
  [key: string]: any;
}

/**
 * Creates a PNG tEXt chunk containing a keyword and text data.
 */
function createTextChunk(keyword: string, textData: string): Uint8Array {
  const encoder = new TextEncoder();
  const keywordBytes = encoder.encode(keyword);
  const textBytes = encoder.encode(textData);

  // Chunk data = Keyword + Null separator (0x00) + Text
  const dataLength = keywordBytes.length + 1 + textBytes.length;
  const chunkData = new Uint8Array(dataLength);
  chunkData.set(keywordBytes, 0);
  chunkData[keywordBytes.length] = 0; // null separator
  chunkData.set(textBytes, keywordBytes.length + 1);

  // Chunk structure: 4 bytes length + 4 bytes type ('tEXt') + data + 4 bytes CRC
  const chunkTotalLength = 4 + 4 + dataLength + 4;
  const chunk = new Uint8Array(chunkTotalLength);
  const view = new DataView(chunk.buffer);

  // 1. Length
  view.setUint32(0, dataLength, false);

  // 2. Type ('tEXt')
  chunk[4] = 116; // 't'
  chunk[5] = 69;  // 'E'
  chunk[6] = 88;  // 'X'
  chunk[7] = 116; // 't'

  // 3. Data
  chunk.set(chunkData, 8);

  // 4. CRC32 (computed over Type + Data = bytes 4 to 8 + dataLength)
  const crc = calculateCrc32(chunk, 4, 4 + dataLength);
  view.setUint32(8 + dataLength, crc, false);

  return chunk;
}

/**
 * Checks if a byte sequence starts with the PNG signature.
 */
export function isPngBuffer(buffer: Uint8Array): boolean {
  if (buffer.length < 8) return false;
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

/**
 * Embeds canvas state metadata into a PNG blob or buffer, returning a new Smart PNG Blob.
 */
export async function embedSmartPngMetadata(
  pngInput: Blob | ArrayBuffer | Uint8Array,
  boardData: Partial<SmartCanvasPayload> & { elements: any[]; name?: string }
): Promise<Blob> {
  let sourceBytes: Uint8Array;
  if (pngInput instanceof Blob) {
    const arrayBuf = await pngInput.arrayBuffer();
    sourceBytes = new Uint8Array(arrayBuf);
  } else if (pngInput instanceof ArrayBuffer) {
    sourceBytes = new Uint8Array(pngInput);
  } else {
    sourceBytes = pngInput;
  }

  if (!isPngBuffer(sourceBytes)) {
    // If not a valid PNG, return original blob or wrap as image/png
    return new Blob([sourceBytes.slice().buffer as ArrayBuffer], { type: "image/png" });
  }

  // Build clean payload without circular references or ephemeral runtime DOM properties
  const cleanElements = (boardData.elements || []).map((el: any) => {
    if (!el) return el;
    const { img, _handles, _fadeInterval, fireStarted, _fresh, ...clean } = el;
    if (clean.type === "vanishing") {
      return { ...clean, opacity: 1 };
    }
    return { ...clean };
  });

  const payload: SmartCanvasPayload = {
    version: 1,
    appName: "Smart Canvas",
    exportedAt: Date.now(),
    name: boardData.name || "Untitled Whiteboard",
    bgColor: boardData.bgColor || "#ffffff",
    theme: boardData.theme || "classlight",
    gridStyle: boardData.gridStyle || "none",
    gridSpacing: boardData.gridSpacing || 24,
    camera: boardData.camera || { x: 0, y: 0, zoom: 1 },
    elements: cleanElements,
  };

  const jsonString = JSON.stringify(payload);
  const textPayload = PAYLOAD_SIGNATURE_PREFIX + jsonString;

  // Create chunk
  const customChunk = createTextChunk(SMART_CANVAS_KEYWORD, textPayload);

  // Find standard insertion point: immediately after IHDR chunk
  // IHDR starts at offset 8, length is 13, plus 4 bytes len + 4 bytes type + 13 bytes data + 4 bytes crc = 25 bytes
  // So offset 8 + 25 = 33 is right after IHDR.
  let insertOffset = 33;
  
  // Verify IHDR location dynamically just in case
  const view = new DataView(sourceBytes.buffer, sourceBytes.byteOffset, sourceBytes.byteLength);
  if (sourceBytes.length > 16) {
    const chunkType = String.fromCharCode(
      sourceBytes[12] ?? 0,
      sourceBytes[13] ?? 0,
      sourceBytes[14] ?? 0,
      sourceBytes[15] ?? 0
    );
    if (chunkType === "IHDR") {
      const ihdrLen = view.getUint32(8, false);
      insertOffset = 8 + 4 + 4 + ihdrLen + 4;
    }
  }

  if (insertOffset > sourceBytes.length) {
    insertOffset = 8;
  }

  // Combine [PNG Header + IHDR] + [SmartChunk] + [Rest of PNG]
  const combined = new Uint8Array(sourceBytes.length + customChunk.length);
  combined.set(sourceBytes.subarray(0, insertOffset), 0);
  combined.set(customChunk, insertOffset);
  combined.set(sourceBytes.subarray(insertOffset), insertOffset + customChunk.length);

  return new Blob([combined], { type: "image/png" });
}

/**
 * Extracts embedded canvas state from a PNG file, Blob, or Uint8Array.
 * Returns null if no Smart Canvas metadata is found (i.e. standard PNG).
 */
export async function extractSmartPngMetadata(
  input: File | Blob | ArrayBuffer | Uint8Array
): Promise<SmartCanvasPayload | null> {
  let bytes: Uint8Array;
  try {
    if (input instanceof Blob) {
      const arrayBuf = await input.arrayBuffer();
      bytes = new Uint8Array(arrayBuf);
    } else if (input instanceof ArrayBuffer) {
      bytes = new Uint8Array(input);
    } else {
      bytes = input;
    }
  } catch (err) {
    console.warn("Failed to read image buffer for Smart PNG extraction", err);
    return null;
  }

  if (!isPngBuffer(bytes)) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder("utf-8");
  let offset = 8; // skip 8-byte PNG signature

  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(
      bytes[offset + 4] ?? 0,
      bytes[offset + 5] ?? 0,
      bytes[offset + 6] ?? 0,
      bytes[offset + 7] ?? 0
    );

    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (dataEnd > bytes.length) {
      break;
    }

    if (type === "tEXt") {
      // Find null separator
      let nullIndex = -1;
      for (let i = dataStart; i < dataEnd; i++) {
        if (bytes[i] === 0) {
          nullIndex = i;
          break;
        }
      }

      if (nullIndex !== -1) {
        const keyword = decoder.decode(bytes.subarray(dataStart, nullIndex));
        const textData = decoder.decode(bytes.subarray(nullIndex + 1, dataEnd));

        if (
          keyword === SMART_CANVAS_KEYWORD ||
          keyword === ALT_CANVAS_KEYWORD ||
          keyword.toLowerCase().includes("canvas") ||
          keyword.toLowerCase().includes("whiteboard")
        ) {
          const parsed = parseCanvasTextData(textData);
          if (parsed) return parsed;
        } else {
          // Check if textData has our signature prefix or valid JSON canvas elements
          const parsed = parseCanvasTextData(textData);
          if (parsed) return parsed;
        }
      }
    } else if (type === "iTXt") {
      // International text chunk
      let nullIndex = -1;
      for (let i = dataStart; i < dataEnd; i++) {
        if (bytes[i] === 0) {
          nullIndex = i;
          break;
        }
      }
      if (nullIndex !== -1) {
        // iTXt has compression flag, method, lang tag, translated keyword before text
        let cur = nullIndex + 3; // skip null + comp flag + comp method
        // skip lang tag
        while (cur < dataEnd && bytes[cur] !== 0) cur++;
        cur++; // skip null
        // skip translated keyword
        while (cur < dataEnd && bytes[cur] !== 0) cur++;
        cur++; // skip null
        if (cur < dataEnd) {
          const textData = decoder.decode(bytes.subarray(cur, dataEnd));
          const parsed = parseCanvasTextData(textData);
          if (parsed) return parsed;
        }
      }
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4; // skip 4 bytes CRC
  }

  // Fallback: search raw bytes for signature prefix or embedded JSON structure if chunks were stripped/modified
  return fallbackScanForPayload(bytes);
}

/**
 * Attempts to parse text into a valid SmartCanvasPayload.
 */
function parseCanvasTextData(rawText: string): SmartCanvasPayload | null {
  try {
    let clean = rawText.trim();
    if (clean.startsWith(PAYLOAD_SIGNATURE_PREFIX)) {
      clean = clean.slice(PAYLOAD_SIGNATURE_PREFIX.length);
    }
    const data = JSON.parse(clean);
    if (data && (Array.isArray(data.elements) || Array.isArray(data.layers) || Array.isArray(data))) {
      const rawElements = Array.isArray(data.elements)
        ? data.elements
        : Array.isArray(data)
        ? data
        : data.layers?.[0]?.elements || [];

      return {
        version: data.version || 1,
        appName: data.appName || "Smart Canvas",
        exportedAt: data.exportedAt || Date.now(),
        name: data.name || "Imported Whiteboard",
        elements: rawElements,
        bgColor: data.bgColor || "#ffffff",
        theme: data.theme || "classlight",
        gridStyle: data.gridStyle || "none",
        gridSpacing: data.gridSpacing || 24,
        camera: data.camera || { x: 0, y: 0, zoom: 1 },
      };
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

/**
 * Fast binary scan fallback for Smart Canvas payloads in PNG files.
 */
function fallbackScanForPayload(bytes: Uint8Array): SmartCanvasPayload | null {
  try {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const sigIdx = text.indexOf(PAYLOAD_SIGNATURE_PREFIX);
    if (sigIdx !== -1) {
      const jsonStart = sigIdx + PAYLOAD_SIGNATURE_PREFIX.length;
      // Find matching curly braces for root object
      let depth = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") {
          depth--;
          if (depth === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }
      if (jsonEnd !== -1) {
        const jsonStr = text.slice(jsonStart, jsonEnd);
        return parseCanvasTextData(jsonStr);
      }
    }
  } catch {
    // Fallback scan failed
  }
  return null;
}

/**
 * Checks if a given file or blob is a Smart PNG.
 */
export async function isSmartPngFile(file: File | Blob): Promise<boolean> {
  const meta = await extractSmartPngMetadata(file);
  return meta !== null && Array.isArray(meta.elements) && meta.elements.length > 0;
}
