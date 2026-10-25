import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const wasmSrcDir = path.join(rootDir, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const wasmDestDir = path.join(rootDir, 'public', 'mediapipe', 'wasm');
const modelsDestDir = path.join(rootDir, 'public', 'mediapipe', 'models');
const modelDestFile = path.join(modelsDestDir, 'pose_landmarker_lite.task');

try {
  if (fs.existsSync(wasmSrcDir)) {
    fs.mkdirSync(wasmDestDir, { recursive: true });
    fs.cpSync(wasmSrcDir, wasmDestDir, { recursive: true });
    console.log('[postinstall] Successfully copied MediaPipe WASM assets to public/mediapipe/wasm');
  } else {
    console.warn('[postinstall] Warning: MediaPipe WASM source not found at', wasmSrcDir);
  }

  fs.mkdirSync(modelsDestDir, { recursive: true });

  if (!fs.existsSync(modelDestFile) || fs.statSync(modelDestFile).size < 1000) {
    console.log('[postinstall] Downloading pose_landmarker_lite.task model...');
    const url = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';
    const download = (targetUrl) => {
      https.get(targetUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          download(res.headers.location);
          return;
        }
        if (res.statusCode === 200) {
          const file = fs.createWriteStream(modelDestFile);
          res.pipe(file);
          file.on('finish', () => {
            console.log('[postinstall] Downloaded pose_landmarker_lite.task successfully.');
          });
        }
      }).on('error', (err) => {
        console.warn('[postinstall] Model download warning (will use CDN fallback if offline):', err.message);
      });
    };
    download(url);
  }
} catch (err) {
  console.error('[postinstall] Error during asset setup:', err.message);
}
