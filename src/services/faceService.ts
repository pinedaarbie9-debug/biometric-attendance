import * as faceapi from 'face-api.js';
import { supabase } from '../lib/supabase';

// Models must be placed in /public/models — see FACE_VERIFICATION_SETUP.md
const MODEL_URL = '/models';
let modelsLoaded = false;

// face-api.js typical match threshold: lower distance = more similar.
const MATCH_THRESHOLD = 0.6;
const DUPLICATE_CHECK_THRESHOLD = 0.5; // mas mahigpit kaysa MATCH_THRESHOLD para sigurado

export async function loadFaceModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

/**
 * Detects a single face in the given video/image element and returns its
 * 128-length descriptor, or null if no face (or more than one) was found.
 */
export async function getFaceDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  await loadFaceModels();

  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection?.descriptor ?? null;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/**
 * DUPLICATE CHECK — i-call ito BAGO tawagin ang enrollFace. Chinicheck kung
 * yung mukhang kukunin ay match na sa ibang employee (prevent buddy-punching/fraud).
 *
 * NOTE: gumagamit ng employee_code (hindi id) para sa exclusion dahil ang
 * get_enrolled_face_descriptors RPC ay hindi nagre-return ng id column.
 */
export async function checkDuplicateFace(
  liveDescriptor: Float32Array,
  excludeEmployeeCode?: string
): Promise<{ isDuplicate: boolean; matchedName?: string }> {
  const { data, error } = await supabase.rpc('get_enrolled_face_descriptors');

  if (error || !data) return { isDuplicate: false };

  for (const emp of data as { employee_code: string; full_name: string; face_descriptor: number[] }[]) {
    if (excludeEmployeeCode && emp.employee_code === excludeEmployeeCode) continue;
    if (!emp.face_descriptor) continue;

    const distance = euclideanDistance(emp.face_descriptor, Array.from(liveDescriptor));
    if (distance < DUPLICATE_CHECK_THRESHOLD) {
      return { isDuplicate: true, matchedName: emp.full_name };
    }
  }

  return { isDuplicate: false };
}

/**
 * ENROLLMENT — call from CredentialSettings.tsx after capturing a clear
 * frontal-face frame from the webcam.
 */
export async function enrollFace(employeeId: string, descriptor: Float32Array) {
  const { error } = await supabase
    .from('employees')
    .update({
      face_descriptor: Array.from(descriptor),
      biometric_status: 'registered',
      primary_verification_method: 'facial_id',
    })
    .eq('id', employeeId);

  if (error) throw error;
}

/**
 * 1:1 VERIFICATION — you already know who's claiming to check in
 * (a logged-in employee's own profile), just confirm it's really them.
 * Works fine under RLS since a user can always select their own row.
 */
export async function verifyFaceAgainstEmployee(
  employeeCode: string,
  liveDescriptor: Float32Array
): Promise<{ match: boolean; distance: number }> {
  const { data, error } = await supabase
    .from('employees')
    .select('face_descriptor')
    .eq('employee_code', employeeCode)
    .single();

  if (error || !data?.face_descriptor) {
    return { match: false, distance: Infinity };
  }

  const distance = euclideanDistance(data.face_descriptor as number[], Array.from(liveDescriptor));
  return { match: distance < MATCH_THRESHOLD, distance };
}

/**
 * 1:N IDENTIFICATION — kiosk mode: someone just stands in front of the
 * terminal, figure out who they are with no prior login/input.
 *
 * FIXED: uses the `get_enrolled_face_descriptors` RPC (security definer)
 * instead of a direct table select, because the employees_select RLS
 * policy would otherwise block a non-admin user from seeing anyone
 * else's face_descriptor and silently return zero matches.
 */
export async function identifyFace(
  liveDescriptor: Float32Array
): Promise<{ employeeCode: string; fullName: string; distance: number } | null> {
  const { data, error } = await supabase.rpc('get_enrolled_face_descriptors');

  if (error || !data) return null;

  let best: { employeeCode: string; fullName: string; distance: number } | null = null;

  for (const emp of data as { employee_code: string; full_name: string; face_descriptor: number[] }[]) {
    const distance = euclideanDistance(emp.face_descriptor, Array.from(liveDescriptor));
    if (distance < MATCH_THRESHOLD && (!best || distance < best.distance)) {
      best = { employeeCode: emp.employee_code, fullName: emp.full_name, distance };
    }
  }

  return best;
}