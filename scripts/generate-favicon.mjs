import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const svgPath = join(rootDir, 'src/app/icon.svg');
const faviconPath = join(rootDir, 'src/app/favicon.ico');

// Read the SVG file
const svgContent = readFileSync(svgPath, 'utf-8');

// ICO file header structure
function createIcoFile(pngBuffers) {
  // ICO header: 6 bytes
  // - 2 bytes: Reserved (always 0)
  // - 2 bytes: Image type (1 = ICO)
  // - 2 bytes: Number of images
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = numImages * dirEntrySize;

  // Calculate total size
  let dataOffset = headerSize + dirSize;
  const offsets = [];
  for (const buf of pngBuffers) {
    offsets.push(dataOffset);
    dataOffset += buf.data.length;
  }

  // Create ICO buffer
  const icoBuffer = Buffer.alloc(dataOffset);

  // Write header
  icoBuffer.writeUInt16LE(0, 0);      // Reserved
  icoBuffer.writeUInt16LE(1, 2);      // Type: 1 = ICO
  icoBuffer.writeUInt16LE(numImages, 4);  // Number of images

  // Write directory entries
  let entryOffset = headerSize;
  for (let i = 0; i < numImages; i++) {
    const { width, height, data } = pngBuffers[i];
    icoBuffer.writeUInt8(width >= 256 ? 0 : width, entryOffset);      // Width
    icoBuffer.writeUInt8(height >= 256 ? 0 : height, entryOffset + 1); // Height
    icoBuffer.writeUInt8(0, entryOffset + 2);             // Color palette
    icoBuffer.writeUInt8(0, entryOffset + 3);             // Reserved
    icoBuffer.writeUInt16LE(1, entryOffset + 4);          // Color planes
    icoBuffer.writeUInt16LE(32, entryOffset + 6);         // Bits per pixel
    icoBuffer.writeUInt32LE(data.length, entryOffset + 8);  // Image size
    icoBuffer.writeUInt32LE(offsets[i], entryOffset + 12);  // Image offset
    entryOffset += dirEntrySize;
  }

  // Write image data
  for (let i = 0; i < numImages; i++) {
    pngBuffers[i].data.copy(icoBuffer, offsets[i]);
  }

  return icoBuffer;
}

async function generateFavicon() {
  console.log('Generating favicon from SVG...');

  // Generate PNG images at different sizes
  const sizes = [16, 32, 48];
  const pngBuffers = [];

  for (const size of sizes) {
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toBuffer();

    pngBuffers.push({
      width: size,
      height: size,
      data: pngBuffer
    });

    console.log(`Generated ${size}x${size} PNG`);
  }

  // Create ICO file
  const icoBuffer = createIcoFile(pngBuffers);

  // Write the favicon
  writeFileSync(faviconPath, icoBuffer);
  console.log(`Favicon written to ${faviconPath}`);

  // Also create apple-touch-icon.png for iOS
  const appleTouchIcon = await sharp(Buffer.from(svgContent))
    .resize(180, 180)
    .png()
    .toBuffer();

  writeFileSync(join(rootDir, 'src/app/apple-icon.png'), appleTouchIcon);
  console.log('Apple touch icon created');
}

generateFavicon().catch(console.error);
