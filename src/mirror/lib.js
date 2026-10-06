// Pinned CDN builds, kept external by Vite so the page stays a thin wrapper around them
export * as pc from 'https://cdn.jsdelivr.net/npm/playcanvas@2.23.0/build/playcanvas.mjs';

export const MEDIAPIPE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1';
const MODELS = 'https://storage.googleapis.com/mediapipe-models';

// The full pose model is steadier than lite; override with ?model=lite or ?model=heavy
const requested = new URLSearchParams(location.search).get('model');
export const POSE_MODEL_NAME = ['lite', 'full', 'heavy'].includes(requested) ? requested : 'full';
export const POSE_MODEL = `${MODELS}/pose_landmarker/pose_landmarker_${POSE_MODEL_NAME}/float16/1/pose_landmarker_${POSE_MODEL_NAME}.task`;
export const FACE_MODEL = `${MODELS}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`;
export const HAND_MODEL = `${MODELS}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`;
