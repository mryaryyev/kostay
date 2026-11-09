import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import { Readable } from 'stream';

// Longest side in pixels per upload target; member photos are small avatars
const MAX_SIZE: Record<string, number> = { member: 600 };
const DEFAULT_MAX_SIZE = 1600;

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
	return Buffer.concat(chunks);
};

/**
 * Saves an uploaded image as WebP: fixes phone rotation, shrinks large photos,
 * and returns the path stored in the database (e.g. uploads/property/<uuid>.webp).
 */
export const saveUploadedImage = async (
	stream: Readable,
	target: string,
): Promise<string> => {
	const input = await streamToBuffer(stream);
	const maxSize = MAX_SIZE[target] ?? DEFAULT_MAX_SIZE;

	const output = await sharp(input)
		.rotate()
		.resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 80 })
		.toBuffer();

	const url = `uploads/${target}/${uuidv4()}.webp`;
	await writeFile(url, output);
	return url;
};
