import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  PhoneAuthProvider,
  linkWithCredential,
  User,
  UserCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export interface UserProfileDocument {
  uid: string;
  id?: string;
  email?: string | null;
  phoneNumber?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  authProvider: 'phone' | 'email' | 'password' | 'google' | 'anonymous';
  role: 'USER' | 'EDITOR' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  createdAt?: string;
  updatedAt: string;
  lastLoginAt?: string;
}

class PhoneAuthService {
  private recaptchaVerifier: RecaptchaVerifier | null = null;

  /**
   * Initializes or retrieves an existing RecaptchaVerifier instance
   */
  getOrCreateRecaptchaVerifier(containerId = 'recaptcha-container'): RecaptchaVerifier {
    if (this.recaptchaVerifier) {
      return this.recaptchaVerifier;
    }

    if (typeof window === 'undefined') {
      throw new Error('RecaptchaVerifier can only be initialized in browser environment.');
    }

    this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA automatically solved
      },
      'expired-callback': () => {
        this.clearRecaptcha();
      },
    });

    return this.recaptchaVerifier;
  }

  /**
   * Clears the current reCAPTCHA widget instance
   */
  clearRecaptcha(): void {
    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear();
      } catch {
        // Safe ignore
      }
      this.recaptchaVerifier = null;
    }
  }

  /**
   * Dispatches 6-digit SMS OTP to the provided phone number
   * @param phoneNumber Full E.164 formatted phone number (e.g. '+919876543210')
   * @param containerId DOM ID of the container element for reCAPTCHA
   */
  async sendOtp(phoneNumber: string, containerId = 'recaptcha-container'): Promise<ConfirmationResult> {
    const formattedPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      throw new Error('Phone number must start with a valid country code (e.g. +91).');
    }

    const appVerifier = this.getOrCreateRecaptchaVerifier(containerId);

    try {
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      return confirmationResult;
    } catch (err: any) {
      this.clearRecaptcha();
      throw err;
    }
  }

  /**
   * Verifies the 6-digit SMS OTP code and signs the user in
   */
  async verifyOtp(confirmationResult: ConfirmationResult, otpCode: string): Promise<User> {
    const cleanOtp = otpCode.trim().replace(/[^0-9]/g, '');
    if (cleanOtp.length < 6) {
      throw new Error('Please enter the full 6-digit verification code.');
    }

    const result = await confirmationResult.confirm(cleanOtp);
    const user = result.user;

    // Synchronize user profile into Firestore collection 'users'
    await this.syncUserToFirestore(user, 'phone');

    return user;
  }

  /**
   * Links a phone credential to an existing logged-in Firebase User (Account Linking)
   * Prevents creating duplicate accounts for existing email users (UID ABC123 remains UID ABC123).
   */
  async linkPhoneToExistingUser(
    currentUser: User,
    confirmationResult: ConfirmationResult,
    otpCode: string
  ): Promise<UserCredential> {
    const cleanOtp = otpCode.trim().replace(/[^0-9]/g, '');
    if (cleanOtp.length < 6) {
      throw new Error('Please enter the full 6-digit verification code.');
    }

    const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, cleanOtp);
    const userCredential = await linkWithCredential(currentUser, credential);

    // Update Firestore document with newly linked phone number
    await this.syncUserToFirestore(userCredential.user, 'phone');

    return userCredential;
  }

  /**
   * Creates or updates the user record in Firestore 'users/{uid}' collection
   * Default role for new users is strictly 'USER'; does not overwrite elevated custom claim roles.
   */
  async syncUserToFirestore(user: User, authProvider: 'phone' | 'email' = 'phone'): Promise<void> {
    if (!user || !user.uid) return;

    const userDocRef = doc(db, 'users', user.uid);
    const now = new Date().toISOString();

    try {
      const existingSnap = await getDoc(userDocRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as Partial<UserProfileDocument>;
        const updates: Partial<UserProfileDocument> = {
          updatedAt: now,
          lastLoginAt: now,
        };

        if (user.phoneNumber && !existingData.phoneNumber) {
          updates.phoneNumber = user.phoneNumber;
        }
        if (user.email && !existingData.email) {
          updates.email = user.email;
        }
        if (user.displayName && !existingData.displayName) {
          updates.displayName = user.displayName;
        }
        if (user.photoURL && !existingData.photoURL) {
          updates.photoURL = user.photoURL;
        }

        await setDoc(userDocRef, updates, { merge: true });
      } else {
        const newProfile: UserProfileDocument = {
          uid: user.uid,
          id: user.uid,
          email: user.email || null,
          phoneNumber: user.phoneNumber || null,
          displayName: user.displayName || null,
          photoURL: user.photoURL || null,
          authProvider,
          role: 'USER',
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        };

        await setDoc(userDocRef, newProfile, { merge: true });
      }
    } catch (err: any) {
      console.warn('⚠️ [PhoneAuthService] User Firestore sync notice:', err?.message || err);
    }
  }
}

export const phoneAuthService = new PhoneAuthService();
