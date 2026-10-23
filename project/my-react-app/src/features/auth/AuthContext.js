import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile 
} from 'firebase/auth';
import { auth } from '../../firebase';
import { getDoctorProfile } from '../../services/doctorDataService';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const demoUser = localStorage.getItem('cognilex_demo_user');
      if (demoUser) return JSON.parse(demoUser);
    } catch (e) {}
    return null;
  });
  const [userToken, setUserToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setUserToken(token);
          const emailKey = (user.email || '').toLowerCase().trim();
          const storedRole = 
            localStorage.getItem(`cognilex_user_role_${user.uid}`) || 
            (emailKey ? localStorage.getItem(`cognilex_user_role_${emailKey}`) : null) || 
            'patient';
          const doctorProfile = getDoctorProfile();
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: storedRole === 'doctor' 
              ? (doctorProfile.name || (user.displayName ? 'Dr. ' + user.displayName : 'Dr. Clinician')) 
              : (user.displayName || user.email?.split('@')[0] || 'Learner'),
            photoURL: user.photoURL,
            patientId: 'LX-' + user.uid.substring(0, 5).toUpperCase(),
            role: storedRole,
            doctorProfile: storedRole === 'doctor' ? doctorProfile : null
          });
        } catch (err) {
          console.error("Error obtaining ID Token:", err);
          setCurrentUser(null);
          setUserToken(null);
        }
      } else {
        // Keep demo user if set
        try {
          const demoUser = localStorage.getItem('cognilex_demo_user');
          if (demoUser) {
            setCurrentUser(JSON.parse(demoUser));
          } else {
            setCurrentUser(null);
          }
        } catch (e) {
          setCurrentUser(null);
        }
        setUserToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email, password, displayName, role = 'patient', doctorInfo = null) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    const uid = userCredential.user.uid;
    const emailKey = email.toLowerCase().trim();
    localStorage.setItem(`cognilex_user_role_${uid}`, role);
    localStorage.setItem(`cognilex_user_role_${emailKey}`, role);
    if (role === 'doctor' && doctorInfo) {
      localStorage.setItem('cognilex_doctor_profile', JSON.stringify({
        ...getDoctorProfile(),
        ...doctorInfo,
        name: displayName || doctorInfo.name
      }));
    }
    return userCredential;
  };

  const login = async (email, password, role = null) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const emailKey = email.toLowerCase().trim();
    const existingRole = 
      localStorage.getItem(`cognilex_user_role_${userCredential.user.uid}`) ||
      localStorage.getItem(`cognilex_user_role_${emailKey}`);
    const determinedRole = existingRole || role || 'patient';
    localStorage.setItem(`cognilex_user_role_${userCredential.user.uid}`, determinedRole);
    localStorage.setItem(`cognilex_user_role_${emailKey}`, determinedRole);
    return userCredential;
  };

  const logout = () => {
    localStorage.removeItem('cognilex_demo_user');
    localStorage.removeItem('cognilex_user_role');
    setCurrentUser(null);
    return signOut(auth);
  };

  const loginAsDemoDoctor = () => {
    const docProfile = getDoctorProfile();
    const doctorUser = {
      uid: 'demo_doctor_mitchell',
      email: 'dr.mitchell@cognilex.ai',
      displayName: docProfile.name,
      role: 'doctor',
      specialization: docProfile.title,
      hospital: docProfile.hospital,
      licenseId: docProfile.licenseId,
      patientId: 'DOC-84920',
      doctorProfile: docProfile
    };
    localStorage.setItem('cognilex_user_role_demo_doctor_mitchell', 'doctor');
    localStorage.setItem('cognilex_user_role_dr.mitchell@cognilex.ai', 'doctor');
    localStorage.setItem('cognilex_demo_user', JSON.stringify(doctorUser));
    setCurrentUser(doctorUser);
    return doctorUser;
  };

  const loginAsDemoPatient = () => {
    const patientUser = {
      uid: 'demo_patient_alex',
      email: 'alex.johnson@cognilex.ai',
      displayName: 'Alex Johnson',
      role: 'patient',
      patientId: 'LX-BOYCG'
    };
    localStorage.setItem('cognilex_user_role_demo_patient_alex', 'patient');
    localStorage.setItem('cognilex_user_role_alex.johnson@cognilex.ai', 'patient');
    localStorage.setItem('cognilex_demo_user', JSON.stringify(patientUser));
    setCurrentUser(patientUser);
    return patientUser;
  };

  const getToken = async (forceRefresh = false) => {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken(forceRefresh);
    }
    return null;
  };

  const value = {
    currentUser,
    userToken,
    loading,
    signup,
    login,
    logout,
    loginAsDemoDoctor,
    loginAsDemoPatient,
    getToken
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
