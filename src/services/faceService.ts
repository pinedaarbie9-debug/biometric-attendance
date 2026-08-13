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
 * yung mukhang kukunin ay match na sa ibang student (prevent buddy-punching/fraud).
 *
 * NOTE: gumagamit ng student_code (hindi id) para sa exclusion dahil ang
 * get_enrolled_face_descriptors RPC ay hindi nagre-return ng id column.
 */
export async function checkDuplicateFace(
  liveDescriptor: Float32Array,
  excludeEmployeeCode?: string
): Promise<{ isDuplicate: boolean; matchedName?: string }> {
  const { data, error } = await supabase.rpc('get_enrolled_face_descriptors');

  if (error || !data) return { isDuplicate: false };

  for (const emp of data as { student_code: string; full_name: string; face_descriptor: number[] }[]) {
    if (excludeEmployeeCode && emp.student_code === excludeEmployeeCode) continue;
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
 *
 * NOTE: `currentPassword` is stored in plaintext in `login_secret` so that
 * loginWithFace() can later use it to establish a real Supabase Auth
 * session without a backend/edge function. This is NOT secure for a real
 * production app — only acceptable here because this is a school project
 * running on a personal device.
 */
export async function enrollFace(studentId: string, descriptor: Float32Array, currentPassword?: string) {
  const updatePayload: Record<string, unknown> = {
    face_descriptor: Array.from(descriptor),
    biometric_status: 'registered',
    primary_verification_method: 'facial_id',
  };

  if (currentPassword) {
    updatePayload.login_secret = currentPassword;
  }

  const { error } = await supabase
    .from('students')
    .update(updatePayload)
    .eq('id', studentId);

  if (error) throw error;
}

/**
 * 1:1 VERIFICATION — you already know who's claiming to check in
 * (a logged-in student's own profile), just confirm it's really them.
 * Works fine under RLS since a user can always select their own row.
 */
export async function verifyFaceAgainstEmployee(
  studentCode: string,
  liveDescriptor: Float32Array
): Promise<{ match: boolean; distance: number }> {
  const { data, error } = await supabase
    .from('students')
    .select('face_descriptor')
    .eq('student_code', studentCode)
    .single();

  if (error || !data?.face_descriptor) {
    return { match: false, distance: Infinity };
  }

  const distance = euclideanDistance(data.face_descriptor as number[], Array.from(liveDescriptor));
  return { match: distance < MATCH_THRESHOLD, distance };
}

interface EnrolledFaceRow {
  student_code: string;
  full_name: string;
  email: string;
  face_descriptor: number[];
  login_secret: string | null;
  role: string;
}

/**
 * 1:N IDENTIFICATION — kiosk mode: someone just stands in front of the
 * terminal, figure out who they are with no prior login/input.
 */
export async function identifyFace(
  liveDescriptor: Float32Array
): Promise<{ studentCode: string; fullName: string; email: string; role: string; loginSecret: string | null; distance: number } | null> {
  const { data, error } = await supabase.rpc('get_enrolled_face_descriptors');

  if (error || !data) return null;

  let best: { studentCode: string; fullName: string; email: string; role: string; loginSecret: string | null; distance: number } | null = null;

  for (const emp of data as EnrolledFaceRow[]) {
    if (!emp.face_descriptor) continue;
    const distance = euclideanDistance(emp.face_descriptor, Array.from(liveDescriptor));
    if (distance < MATCH_THRESHOLD && (!best || distance < best.distance)) {
      best = {
        studentCode: emp.student_code,
        fullName: emp.full_name,
        email: emp.email,
        role: emp.role,
        loginSecret: emp.login_secret,
        distance,
      };
    }
  }

  return best;
}

/**
 * FACE LOGIN — kunin ang live face descriptor, i-identify kung sino,
 * pagkatapos gamitin ang na-save na login_secret para talagang mag-sign-in
 * sa Supabase Auth (totoong session, hindi lang UI redirect).
 *
 * Kung walang login_secret na naka-save (hindi pa na-enroll ulit ang mukha
 * matapos i-add ang feature na ito), mag-re-return ng malinaw na error
 * para ma-guide ang user na mag-re-enroll muna sa CredentialSettings.
 */
export async function loginWithFace(
  liveDescriptor: Float32Array
): Promise<{ error: string | null; matchedName?: string; studentCode?: string }> {
  const match = await identifyFace(liveDescriptor);

  if (!match) {
    return { error: 'Walang katugmang mukha. Siguraduhing naka-enroll ka na, o subukan ulit nang mas malinaw ang liwanag.' };
  }

  if (!match.loginSecret) {
    return {
      error: `Nakilala ka bilang ${match.fullName}, pero wala kang naka-save na login credential para sa face login. Pumunta sa Credential Settings at i-enroll ulit ang mukha mo gamit ang iyong password.`,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: match.email,
    password: match.loginSecret,
  });

  if (error) {
    return { error: `Nakilala ka bilang ${match.fullName}, pero nabigo ang pag-login: ${error.message}` };
  }

  return { error: null, matchedName: match.fullName, studentCode: match.studentCode };
}