import { pipeline } from "@huggingface/transformers";

let extractorPromise: Promise<any> | null = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      "mixedbread-ai/mxbai-embed-xsmall-v1",
      // Try WebGPU, fallback to CPU automatically
      { device: (navigator as any).gpu ? "webgpu" : "cpu" }
    );
  }
  return extractorPromise;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor([text], { pooling: "mean", normalize: true });
  // transformers.js returns a Tensor-like with tolist()
  const arr = Array.isArray(output) ? output[0] : output;
  const list = typeof arr.tolist === "function" ? arr.tolist() : arr;
  return list as number[];
}
