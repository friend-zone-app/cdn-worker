export type Type = {
	mimeType: string;
	suffix: string;
};

const signatures: Record<string, Type> = {
	'image/png': { mimeType: 'image/png', suffix: 'png' },
	'image/jpeg': { mimeType: 'image/jpg', suffix: 'jpg' },
	'image/webp': { mimeType: 'image/webp', suffix: 'webp' },
};

export const detectType = (b64: string): Type | undefined => {
	for (const s in signatures) {
		if (b64.indexOf(s) === 0) {
			return signatures[s];
		}
	}
};
