const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 150;
const SPLIT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""];

export async function chunkText(text) {
  return splitText(text, CHUNK_SIZE, CHUNK_OVERLAP);
}

function splitText(text, chunkSize, chunkOverlap) {
  if (!text || text.length <= chunkSize) {
    return text ? [text] : [];
  }

  const splits = splitBySeparator(text, chunkSize, SPLIT_SEPARATORS);
  const chunks = [];
  let currentChunk = "";

  for (const split of splits) {
    const nextChunk = currentChunk ? `${currentChunk}${split}` : split;

    if (nextChunk.length <= chunkSize) {
      currentChunk = nextChunk;
      continue;
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    currentChunk = `${overlapText(currentChunk, chunkOverlap)}${split}`;

    while (currentChunk.length > chunkSize) {
      chunks.push(currentChunk.slice(0, chunkSize).trim());
      currentChunk = currentChunk.slice(chunkSize - chunkOverlap);
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function splitBySeparator(text, chunkSize, separators) {
  const [separator, ...remainingSeparators] = separators;

  if (separator === "") {
    return text.match(new RegExp(`.{1,${chunkSize}}`, "gs")) ?? [];
  }

  const parts = text.split(separator);
  const splits = [];

  for (const part of parts) {
    const split = `${part}${separator}`;

    if (split.length <= chunkSize || remainingSeparators.length === 0) {
      splits.push(split);
    } else {
      splits.push(...splitBySeparator(split, chunkSize, remainingSeparators));
    }
  }

  return splits;
}

function overlapText(text, overlapSize) {
  if (!text) {
    return "";
  }

  return text.slice(Math.max(0, text.length - overlapSize));
}
