# Face Verification — Setup & Wiring

## 1. Install the library

```bash
npm install face-api.js
```

## 2. Download the model weights (one-time, in your own project — hindi ko magagawa dito dahil walang internet access sa environment ko papunta sa CDN)

1. Pumunta sa: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
2. I-download ang mga sumusunod na files at ilagay sa `public/models/` ng project mo:
   - `tiny_face_detector_model-weights_manifest.json` + `.bin`
   - `face_landmark_68_model-weights_manifest.json` + `.bin`
   - `face_recognition_model-weights_manifest.json` + `.bin` (may 2 `.bin` shards ito, kunin lahat)

Final structure:
```
public/
  models/
    tiny_face_detector_model-weights_manifest.json
    tiny_face_detector_model-shard1
    face_landmark_68_model-weights_manifest.json
    face_landmark_68_model-shard1
    face_recognition_model-weights_manifest.json
    face_recognition_model-shard1
    face_recognition_model-shard2
```

## 3. Run the SQL migration

Run `supabase/003_face_verification.sql` sa Supabase SQL editor (after 002).

## 4. Wire it into your pages

**`pages/employee/CredentialSettings.tsx`** — enrollment:

```tsx
import FaceCapture from '../../components/FaceCapture';
import { enrollFace } from '../../services/faceService';
import { useAuth } from '../../context/AuthContext'; // adjust to your actual hook

function FaceEnrollSection() {
  const { user } = useAuth();

  return (
    <FaceCapture
      buttonLabel="Register Face ID"
      onCapture={async (descriptor) => {
        await enrollFace(user.id, descriptor);
        alert('Face ID registered!');
      }}
    />
  );
}
```

**`pages/BiometricTerminal.tsx`** — verification (kiosk-style, no login needed at the terminal):

```tsx
import FaceCapture from '../components/FaceCapture';
import { identifyFace } from '../services/faceService';
import { simulateCheckIn } from '../services/deviceService'; // once merged with .additions.ts

function FaceScanSection() {
  return (
    <FaceCapture
      buttonLabel="Scan Face to Check In"
      onCapture={async (descriptor) => {
        const match = await identifyFace(descriptor);

        if (!match) {
          alert('Face not recognized. Please try again or use fingerprint.');
          return;
        }

        await simulateCheckIn(match.employeeCode, 'check_in', 'facial_id');
        alert(`Welcome, ${match.fullName}!`);
      }}
    />
  );
}
```

> Tandaan: `simulateCheckIn` sa `deviceService.additions.ts` na ginawa ko dati ay 2-argument pa
> lang (employeeCode, eventType). I-update mo yung signature nun para tumanggap din ng
> `verificationMethod` param at ipasa papunta sa `simulate_check_in` RPC (na updated na ngayon
> para tumanggap ng 3rd argument — see `003_face_verification.sql`).

## 5. Privacy note (important, hindi legal advice — pero dapat mo isipin)

Face descriptors are biometric data. Bago ito i-launch sa totoong empleyado:
- Magkaroon ng malinaw na consent/notice sa employees (data privacy — may Philippine Data
  Privacy Act requirements para dito).
- I-restrict yung RLS access sa `face_descriptor` column (currently readable by admin + self via
  existing `employees_select` policy — tama ito, pero siguraduhin walang ibang policy na
  nag-eexpose nito sa lahat).
- Isipin kung gusto mong i-store yung descriptor as-is, o i-encrypt pa bago i-save.
