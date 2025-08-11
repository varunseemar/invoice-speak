import Tesseract from "tesseract.js";

export async function ocrImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const { data } = await Tesseract.recognize(file, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && m.progress && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return (data.text || "").trim();
}
