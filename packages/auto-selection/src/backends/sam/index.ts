import type { Tensor } from 'onnxruntime-web';
import type { DetectedObject, ImagePoint, SamConfig } from '../../types';
import { logitsToMask, pickBestMask } from './postprocess';
import { imagePointToInputSpace, sourceToEncoderInput } from './preprocess';
import { loadSessions, type SamSessions } from './session';

export type SamEngine = {
    prepare(
        source: string | HTMLImageElement | HTMLCanvasElement,
        signal?: AbortSignal,
    ): Promise<void>;
    detect(
        source: string | HTMLImageElement | HTMLCanvasElement,
        point: ImagePoint,
        targetWidth: number,
        targetHeight: number,
        signal?: AbortSignal,
    ): Promise<DetectedObject | undefined>;
    invalidate(): void;
    dispose(): void;
};

type Embedding = {
    image_embeddings: Tensor;
    image_positional_embeddings?: Tensor;
    origSize: [number, number];
    resizedSize: [number, number];
};

export function createSamEngine(config: SamConfig): SamEngine {
    let sessionsPromise: Promise<SamSessions> | undefined;
    let embedding: Embedding | undefined;
    let embeddingKey: string | HTMLImageElement | HTMLCanvasElement | undefined;

    async function getSessions(signal?: AbortSignal): Promise<SamSessions> {
        if (!sessionsPromise) sessionsPromise = loadSessions(config, signal);
        return sessionsPromise;
    }

    async function ensureEmbedding(
        source: string | HTMLImageElement | HTMLCanvasElement,
        signal?: AbortSignal,
    ): Promise<Embedding> {
        if (embedding && embeddingKey === source) return embedding;
        const sessions = await getSessions(signal);
        const ort = await import('onnxruntime-web');
        const pre = await sourceToEncoderInput(source);
        const pixelValues = new ort.Tensor('float32', pre.data, [...pre.dims]);
        const inputName = sessions.encoderInputNames[0] ?? 'pixel_values';
        const encoderOutput = await sessions.encoder.run({ [inputName]: pixelValues });

        const image_embeddings = findTensor(encoderOutput, [
            'image_embeddings',
            'last_hidden_state',
            'image_features',
        ]);
        if (!image_embeddings) {
            throw new Error(
                `SAM encoder did not return an image_embeddings tensor. Got outputs: ${Object.keys(encoderOutput).join(', ')}`,
            );
        }
        const image_positional_embeddings = findTensor(encoderOutput, [
            'image_positional_embeddings',
            'pe_layer',
        ]);

        const next: Embedding = {
            image_embeddings,
            origSize: pre.origSize,
            resizedSize: pre.resizedSize,
        };
        if (image_positional_embeddings) {
            next.image_positional_embeddings = image_positional_embeddings;
        }
        embedding = next;
        embeddingKey = source;
        return embedding;
    }

    return {
        async prepare(source, signal) {
            await ensureEmbedding(source, signal);
        },
        async detect(source, point, targetWidth, targetHeight, signal) {
            const sessions = await getSessions(signal);
            const emb = await ensureEmbedding(source, signal);
            const ort = await import('onnxruntime-web');

            const [inputX, inputY] = imagePointToInputSpace(
                point.x,
                point.y,
                emb.origSize,
                emb.resizedSize,
            );

            const input_points = new ort.Tensor(
                'float32',
                Float32Array.from([inputX, inputY]),
                [1, 1, 1, 2],
            );
            const input_labels = new ort.Tensor('int64', BigInt64Array.from([1n]), [1, 1, 1]);

            const decoderInputs: Record<string, Tensor> = {
                image_embeddings: emb.image_embeddings,
                input_points,
                input_labels,
            };
            if (emb.image_positional_embeddings) {
                decoderInputs.image_positional_embeddings = emb.image_positional_embeddings;
            }

            const filtered: Record<string, Tensor> = {};
            for (const name of sessions.decoderInputNames) {
                const match = decoderInputs[name];
                if (match) filtered[name] = match;
            }

            const decoderOutput = await sessions.decoder.run(filtered);

            const iouTensor = findTensor(decoderOutput, ['iou_scores', 'iou_predictions']);
            const masksTensor = findTensor(decoderOutput, ['pred_masks', 'masks', 'low_res_masks']);
            if (!iouTensor || !masksTensor) {
                throw new Error(
                    `SAM decoder returned unexpected outputs: ${Object.keys(decoderOutput).join(', ')}`,
                );
            }

            const iouData = iouTensor.data as Float32Array;
            const masksData = masksTensor.data as Float32Array;
            const maskDims = masksTensor.dims;

            const numMasks = maskDims[maskDims.length - 3] ?? 3;
            const maskH = maskDims[maskDims.length - 2] ?? 256;
            const maskW = maskDims[maskDims.length - 1] ?? 256;

            const bestIdx = pickBestMask(iouData, numMasks);
            const bestScore = iouData[bestIdx] ?? 0;
            const maskStart = bestIdx * maskH * maskW;
            const bestLogits = masksData.subarray(maskStart, maskStart + maskH * maskW);

            const { mask, bbox } = logitsToMask(
                bestLogits,
                [maskH, maskW],
                emb.resizedSize,
                targetWidth,
                targetHeight,
            );

            if (bbox.width === 0 || bbox.height === 0) return undefined;

            return {
                id: `sam-${Date.now()}`,
                score: bestScore,
                bbox,
                mask,
            };
        },
        invalidate() {
            embedding = undefined;
            embeddingKey = undefined;
        },
        dispose() {
            embedding = undefined;
            embeddingKey = undefined;
            sessionsPromise = undefined;
        },
    };
}

function findTensor(
    output: Record<string, Tensor>,
    candidateNames: readonly string[],
): Tensor | undefined {
    for (const name of candidateNames) {
        const tensor = output[name];
        if (tensor) return tensor;
    }
    return undefined;
}

export { clearSamCache } from './session';
