// Downloads run entirely in the browser: the code never leaves the user's device.

function save(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

export function downloadSvg(svg: string, filename: string) {
	save(new Blob([svg], { type: "image/svg+xml" }), filename);
}

/** Draws the SVG onto a canvas at `size` px square and saves it as PNG. */
export async function downloadPng(svg: string, filename: string, size = 1024) {
	const image = new Image();
	image.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
	await image.decode();
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	canvas.getContext("2d")!.drawImage(image, 0, 0, size, size);
	URL.revokeObjectURL(image.src);
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
	if (blob) save(blob, filename);
}
