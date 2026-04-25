import type { InferenceSession } from 'onnxruntime-web';
import type { SamConfig } from '../../types';

export type SamSessions = {
    encoder: InferenceSession;
    decoder: InferenceSession;
    encoderInputNames: readonly string[];
    encoderOutputNames: readonly string[];
    decoderInputNames: readonly string[];
    decoderOutputNames: readonly string[];
};

const CACHE_NAME = 'rcm-auto-selection-sam-v1';

let wasmPathsSet = false;

export const loadSessions = async (
    config: SamConfig,
    signal?: AbortSignal,
): Promise<SamSessions> => {
    let ort: typeof import('onnxruntime-web');

    try {
        ort = await import('onnxruntime-web');
    } catch (cause) {
        throw new Error(
            'react-canvas-masker-auto-selection: install `onnxruntime-web` to use SAM auto-selection.',
            { cause: cause instanceof Error ? cause : undefined },
        );
    }

    if (config.wasmPaths && !wasmPathsSet) {
        ort.env.wasm.wasmPaths = config.wasmPaths;
        wasmPathsSet = true;
    }

    const executionProviders = config.executionProviders ?? ['wasm'];
    const sessionOptions: InferenceSession.SessionOptions = { executionProviders };

    const [encoderBuf, decoderBuf] = await Promise.all([
        fetchOnnx(config.encoderUrl, signal),
        fetchOnnx(config.decoderUrl, signal),
    ]);

    const [encoder, decoder] = await Promise.all([
        ort.InferenceSession.create(encoderBuf, sessionOptions),
        ort.InferenceSession.create(decoderBuf, sessionOptions),
    ]);

    if (config.debug) {
        console.info(
            '[rcm-auto-selection] SAM encoder inputs:',
            JSON.stringify(encoder.inputNames),
            'outputs:',
            JSON.stringify(encoder.outputNames),
        );
        console.info(
            '[rcm-auto-selection] SAM decoder inputs:',
            JSON.stringify(decoder.inputNames),
            'outputs:',
            JSON.stringify(decoder.outputNames),
        );
    }

    return {
        encoder,
        decoder,
        encoderInputNames: encoder.inputNames,
        encoderOutputNames: encoder.outputNames,
        decoderInputNames: decoder.inputNames,
        decoderOutputNames: decoder.outputNames,
    };
};

const fetchOnnx = async (url: string, signal?: AbortSignal): Promise<ArrayBuffer> => {
    const hasCaches = typeof caches !== 'undefined';

    if (hasCaches) {
        try {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(url);
            if (cached) return await cached.arrayBuffer();

            const response = await fetch(url, signal ? { signal } : undefined);
            if (!response.ok) {
                throw new Error(
                    `SAM model fetch failed: ${response.status} ${response.statusText} ${url}`,
                );
            }

            await cache.put(url, response.clone());
            return await response.arrayBuffer();
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') throw err;
        }
    }
    const response = await fetch(
        url,
        signal ? { signal, cache: 'force-cache' } : { cache: 'force-cache' },
    );

    if (!response.ok) {
        throw new Error(`SAM model fetch failed: ${response.status} ${response.statusText} ${url}`);
    }

    return await response.arrayBuffer();
};

/** Clears the persistent model cache. Useful for dev tooling. */
export const clearSamCache = async (): Promise<void> => {
    if (typeof caches === 'undefined') return;
    await caches.delete(CACHE_NAME);
};
