/**
 * doctorDataService.js
 * =====================
 * Clinician & Doctor Caseload Data Management Service
 * Manages doctor profiles, assigned patient roster, diagnostic history,
 * clinical miscue reports, and doctor intervention prescriptions.
 */

const DOCTOR_PROFILE_KEY = 'cognilex_doctor_profile';
const PATIENTS_ROSTER_KEY = 'cognilex_doctor_patients';

// Default Board-Certified Doctor Profile
export const DEFAULT_DOCTOR_PROFILE = {
  id: 'DOC-84920',
  name: 'Dr. Sarah Mitchell, MD, FAAP',
  title: 'Board-Certified Pediatric Neurologist & Reading Specialist',
  department: 'Department of Child Cognitive Neurology & SLP',
  hospital: 'Cognilex Pediatric Neurodevelopmental Medical Center',
  licenseId: 'LIC-NY-84920',
  npi: '1982736450',
  email: 'dr.mitchell@cognilex.ai',
  phone: '+1 (555) 382-9102',
  office: 'Suite 408, Neurological Specialty Pavilion',
  avatar: '🩺',
  experienceYears: 14,
  activeCaseloadCount: 5,
  verified: true
};

// Default Initial Clinical Patients Cohort representing key Dyslexia Phenotypes
export const DEFAULT_PATIENTS = [
  {
    id: 'LX-BOYCG',
    name: 'Alex Johnson',
    age: 9,
    grade: 'Grade 4',
    school: 'Lincoln Elementary School',
    guardian: 'Sarah & Mark Johnson',
    guardianPhone: '+1 (555) 234-8901',
    guardianEmail: 'sarah.j@example.com',
    enrolledDate: '10/12/2026',
    avatar: '🧒',
    gender: 'Male',
    phenotype: 'Phonological Dyslexia (Dysphonetic Subtype)',
    riskLevel: 'Moderate', // 'High' | 'Moderate' | 'Low'
    riskScore: 68,
    primaryDeficit: 'Dorsal Temporo-Parietal Pathway (Grapheme-to-Phoneme Decoding)',
    latestAccuracy: 74,
    latestWpm: 48,
    status: 'Active Intervention Plan',
    subtypes: {
      phonological: { score: 72, risk: 'Elevated Risk', pathway: 'Dorsal Temporo-Parietal' },
      visualOrthographic: { score: 28, risk: 'Low / Within Normal Limits', pathway: 'Ventral Occipito-Temporal (VWFA)' },
      fluencyRan: { score: 45, risk: 'Moderate Risk', pathway: 'Cerebellar Retrieval Network' }
    },
    doctorNotes: 'Patient demonstrates significant phonological blending difficulty with multi-syllabic words and consonant clusters. Exhibits vowel substitution miscues under time pressure. Visual tracking and mirror letter discrimination remain intact.',
    prescriptions: [
      { id: 'og_phonics', name: 'Structured Multi-Sensory Phonics (Orton-Gillingham)', prescribed: true, frequency: 'Daily (15 mins)' },
      { id: 'visual_tracking', name: 'Saccadic Visual Tracking & Bionic Line Guide', prescribed: false, frequency: '3x Weekly' },
      { id: 'ran_fluency', name: 'Paired Echo-Reading & RAN Retrieval Drills', prescribed: true, frequency: 'Daily (10 mins)' },
      { id: 'morphology', name: 'Affix & Base Word Decomposition Puzzles', prescribed: true, frequency: '2x Weekly' }
    ],
    sampleOralReports: [
      {
        id: 'oral_alex_01',
        date: 'Today, 01:25 PM',
        sentence: 'The sun is bright and warm today.',
        spoken: 'The moon is bright and warm today.',
        accuracy: 85.7,
        wpm: 52,
        durationSeconds: 8.1,
        correctCount: 6,
        mispronouncedCount: 1,
        skippedCount: 0,
        words: [
          { expected: 'The', spoken: 'The', status: 'correct' },
          { expected: 'sun', spoken: 'moon', status: 'mispronounced', miscue: { type: 'lexical_substitution', label: 'Lexical Word Substitution Miscue', pathway: 'Ventral/Lexical Retrieval', severity: 'moderate', details: 'Target "sun" read aloud as substituted word "moon". Contextual guessing.' } },
          { expected: 'is', spoken: 'is', status: 'correct' },
          { expected: 'bright', spoken: 'bright', status: 'correct' },
          { expected: 'and', spoken: 'and', status: 'correct' },
          { expected: 'warm', spoken: 'warm', status: 'correct' },
          { expected: 'today.', spoken: 'today.', status: 'correct' }
        ]
      },
      {
        id: 'oral_alex_02',
        date: 'Yesterday, 04:15 PM',
        sentence: 'Kind words can change someone’s whole day.',
        spoken: 'Kind bords can change someone’s whole day.',
        accuracy: 85.7,
        wpm: 46,
        durationSeconds: 9.2,
        correctCount: 6,
        mispronouncedCount: 1,
        skippedCount: 0,
        words: [
          { expected: 'Kind', spoken: 'Kind', status: 'correct' },
          { expected: 'words', spoken: 'bords', status: 'mispronounced', miscue: { type: 'phonological_substitution', label: 'Initial-Phoneme Substitution', pathway: 'Dorsal Stream', severity: 'moderate', details: 'Target "words" read aloud as "bords".' } },
          { expected: 'can', spoken: 'can', status: 'correct' },
          { expected: 'change', spoken: 'change', status: 'correct' },
          { expected: 'someone’s', spoken: 'someone’s', status: 'correct' },
          { expected: 'whole', spoken: 'whole', status: 'correct' },
          { expected: 'day.', spoken: 'day.', status: 'correct' }
        ]
      }
    ],
    universalBattery: {
      compositeScore: 71,
      riskIndex: 58,
      riskLevel: 'Moderate',
      tasks: [
        { name: 'Phonological Awareness & Segmentation', score: 62, benchmark: 85, status: 'Below Benchmark' },
        { name: 'Rapid Automatized Naming (RAN)', score: 58, benchmark: 75, status: 'Mild Latency' },
        { name: 'Visual Letter Discrimination (b/d)', score: 94, benchmark: 90, status: 'Intact' },
        { name: 'Working Memory Digit Span', score: 75, benchmark: 80, status: 'Age-Appropriate' },
        { name: 'Morphological Structure Synthesis', score: 68, benchmark: 80, status: 'Developing' }
      ]
    }
  },
  {
    id: 'LX-MYP02',
    name: 'Maya Patel',
    age: 8,
    grade: 'Grade 3',
    school: 'Oakridge Academy for Children',
    guardian: 'Dr. Rajesh Patel',
    guardianPhone: '+1 (555) 492-3810',
    guardianEmail: 'rajesh.patel@example.com',
    enrolledDate: '09/18/2026',
    avatar: '👧',
    gender: 'Female',
    phenotype: 'Surface / Visual Dyslexia (Dyseidetic Subtype)',
    riskLevel: 'High',
    riskScore: 82,
    primaryDeficit: 'Ventral Occipito-Temporal Pathway (Visual Word Form Area & Mirror Reversals)',
    latestAccuracy: 64,
    latestWpm: 38,
    status: 'Immediate Orthographic Intervention',
    subtypes: {
      phonological: { score: 32, risk: 'Low / Within Normal Limits', pathway: 'Dorsal Temporo-Parietal' },
      visualOrthographic: { score: 86, risk: 'Elevated Risk', pathway: 'Ventral Occipito-Temporal (VWFA)' },
      fluencyRan: { score: 62, risk: 'Moderate Risk', pathway: 'Cerebellar Retrieval Network' }
    },
    doctorNotes: 'Classic Dyseidetic / Surface dyslexia profile. Highly prominent spatial-mirror reversals (b vs d, p vs q) and word skipping due to ocular saccadic drift. Phonemic sounding-out is intact, but sight word vocabulary retrieval is severely disrupted.',
    prescriptions: [
      { id: 'visual_tracking', name: 'Tactile Tracing (Sandpaper Letters) & Saccadic Guide', prescribed: true, frequency: 'Daily (20 mins)' },
      { id: 'bionic_reading', name: 'Bionic Artificial Saccadic Fixation Reading Font', prescribed: true, frequency: 'All Reader Text' },
      { id: 'mirror_highway', name: 'Mirror Match Highway Video Game Drill', prescribed: true, frequency: 'Daily (10 mins)' },
      { id: 'og_phonics', name: 'Structured Multi-Sensory Phonics Drills', prescribed: false, frequency: 'Optional' }
    ],
    sampleOralReports: [
      {
        id: 'oral_maya_01',
        date: '10/19/2026, 11:30 AM',
        sentence: 'A quick brown fox jumps over the dog.',
        spoken: 'A quick drown fox jumps over the bog.',
        accuracy: 75.0,
        wpm: 36,
        durationSeconds: 13.3,
        correctCount: 6,
        mispronouncedCount: 2,
        skippedCount: 0,
        words: [
          { expected: 'A', spoken: 'A', status: 'correct' },
          { expected: 'quick', spoken: 'quick', status: 'correct' },
          { expected: 'brown', spoken: 'drown', status: 'mispronounced', miscue: { type: 'visual_reversal', label: 'Static Mirror Reversal (b/d)', pathway: 'Ventral Occipito-Temporal (VWFA)', severity: 'high', details: 'Mirror confusion between "b" and "d" in "brown" read as "drown".' } },
          { expected: 'fox', spoken: 'fox', status: 'correct' },
          { expected: 'jumps', spoken: 'jumps', status: 'correct' },
          { expected: 'over', spoken: 'over', status: 'correct' },
          { expected: 'the', spoken: 'the', status: 'correct' },
          { expected: 'dog.', spoken: 'bog.', status: 'mispronounced', miscue: { type: 'visual_reversal', label: 'Static Mirror Reversal (d/b)', pathway: 'Ventral Occipito-Temporal (VWFA)', severity: 'high', details: 'Mirror confusion between "d" and "b" in "dog" read as "bog".' } }
        ]
      }
    ],
    universalBattery: {
      compositeScore: 63,
      riskIndex: 78,
      riskLevel: 'High',
      tasks: [
        { name: 'Phonological Awareness & Segmentation', score: 88, benchmark: 85, status: 'Intact' },
        { name: 'Rapid Automatized Naming (RAN)', score: 60, benchmark: 75, status: 'Mild Latency' },
        { name: 'Visual Letter Discrimination (b/d)', score: 42, benchmark: 90, status: 'Severe Reversal Deficit' },
        { name: 'Working Memory Digit Span', score: 78, benchmark: 80, status: 'Age-Appropriate' },
        { name: 'Morphological Structure Synthesis', score: 82, benchmark: 80, status: 'Intact' }
      ]
    }
  },
  {
    id: 'LX-LDV03',
    name: 'Leo Davis',
    age: 11,
    grade: 'Grade 6',
    school: 'Maplewood Middle School',
    guardian: 'Elena Davis',
    guardianPhone: '+1 (555) 781-9923',
    guardianEmail: 'elena.davis@example.com',
    enrolledDate: '08/29/2026',
    avatar: '👦',
    gender: 'Male',
    phenotype: 'Mixed Dyslexia Phenotype (Double Deficit)',
    riskLevel: 'High',
    riskScore: 88,
    primaryDeficit: 'Double Deficit: Dorsal Phonological Decoding + Cerebellar Rapid Naming Deficit',
    latestAccuracy: 61,
    latestWpm: 41,
    status: 'Comprehensive Multi-Tiered Intervention',
    subtypes: {
      phonological: { score: 84, risk: 'Elevated Risk', pathway: 'Dorsal Temporo-Parietal' },
      visualOrthographic: { score: 68, risk: 'Elevated Risk', pathway: 'Ventral Occipito-Temporal (VWFA)' },
      fluencyRan: { score: 82, risk: 'Elevated Risk (Severe Retrieval Latency)', pathway: 'Cerebellar Retrieval Network' }
    },
    doctorNotes: 'Double-deficit dyslexia presentation. High cognitive burden during both phonemic synthesis and rapid sight-word naming. Patient benefits markedly from high-contrast color overlays and syllable chunking.',
    prescriptions: [
      { id: 'og_phonics', name: 'Structured Multi-Sensory Phonics (Orton-Gillingham)', prescribed: true, frequency: 'Daily (20 mins)' },
      { id: 'ran_fluency', name: 'Rapid Automatized Naming (Balloon Pop / Space RAN)', prescribed: true, frequency: 'Daily (15 mins)' },
      { id: 'auditory_noise', name: 'Auditory Processing & Noise Filtering Drills', prescribed: true, frequency: '3x Weekly' },
      { id: 'morphology', name: 'Root Word & Prefix Morphology Bot Assembly', prescribed: true, frequency: '3x Weekly' }
    ],
    sampleOralReports: [
      {
        id: 'oral_leo_01',
        date: '10/18/2026, 03:45 PM',
        sentence: 'Exploring nature fills the mind with wonder.',
        spoken: 'Explore nature fill the mind with wander.',
        accuracy: 57.1,
        wpm: 39,
        durationSeconds: 14.2,
        correctCount: 4,
        mispronouncedCount: 3,
        skippedCount: 0,
        words: [
          { expected: 'Exploring', spoken: 'Explore', status: 'mispronounced', miscue: { type: 'morphological_inflection', label: 'Inflectional Suffix Omission (-ing)', pathway: 'Dorsal Stream', severity: 'moderate', details: 'Suffix "-ing" omitted from "Exploring".' } },
          { expected: 'nature', spoken: 'nature', status: 'correct' },
          { expected: 'fills', spoken: 'fill', status: 'mispronounced', miscue: { type: 'morphological_inflection', label: 'Inflectional Suffix Omission (-s)', pathway: 'Dorsal Stream', severity: 'moderate', details: 'Suffix "-s" omitted from "fills".' } },
          { expected: 'the', spoken: 'the', status: 'correct' },
          { expected: 'mind', spoken: 'mind', status: 'correct' },
          { expected: 'with', spoken: 'with', status: 'correct' },
          { expected: 'wonder.', spoken: 'wander.', status: 'mispronounced', miscue: { type: 'phonological_substitution', label: 'Vowel Phoneme Confusion', pathway: 'Dorsal Stream', severity: 'moderate', details: 'Target "wonder" read aloud as "wander".' } }
        ]
      }
    ],
    universalBattery: {
      compositeScore: 56,
      riskIndex: 85,
      riskLevel: 'High',
      tasks: [
        { name: 'Phonological Awareness & Segmentation', score: 54, benchmark: 85, status: 'High Deficit' },
        { name: 'Rapid Automatized Naming (RAN)', score: 48, benchmark: 75, status: 'Elevated Retrieval Latency' },
        { name: 'Visual Letter Discrimination (b/d)', score: 65, benchmark: 90, status: 'Moderate Confusion' },
        { name: 'Working Memory Digit Span', score: 62, benchmark: 80, status: 'Constrained' },
        { name: 'Morphological Structure Synthesis', score: 52, benchmark: 80, status: 'Below Grade Benchmark' }
      ]
    }
  },
  {
    id: 'LX-EWT04',
    name: 'Emma Watson',
    age: 7,
    grade: 'Grade 2',
    school: 'Sunnybrook Primary School',
    guardian: 'Thomas & Claire Watson',
    guardianPhone: '+1 (555) 319-4820',
    guardianEmail: 'thomas.w@example.com',
    enrolledDate: '10/01/2026',
    avatar: '👧',
    gender: 'Female',
    phenotype: 'Emergent Reader with Oral Fluency Latency',
    riskLevel: 'Low',
    riskScore: 22,
    primaryDeficit: 'Mild Sub-vocal Processing Latency; Phonemic Mapping Intact',
    latestAccuracy: 92,
    latestWpm: 58,
    status: 'Monitoring & Maintenance',
    subtypes: {
      phonological: { score: 18, risk: 'Low / Within Normal Limits', pathway: 'Dorsal Temporo-Parietal' },
      visualOrthographic: { score: 12, risk: 'Low / Within Normal Limits', pathway: 'Ventral Occipito-Temporal (VWFA)' },
      fluencyRan: { score: 35, risk: 'Moderate Risk', pathway: 'Cerebellar Retrieval Network' }
    },
    doctorNotes: 'Emma shows excellent therapeutic response to daily reading exercises. Grapheme-phoneme mapping is now robust. Maintaining regular reading practice to build cadence toward Grade 2 benchmark (60+ WPM).',
    prescriptions: [
      { id: 'ran_fluency', name: 'Paired Echo-Reading & Fluent Cadence Practice', prescribed: true, frequency: 'Daily (10 mins)' },
      { id: 'story_reading', name: 'Independent Enriched Story Exploration (Smart Reader)', prescribed: true, frequency: 'Daily (15 mins)' }
    ],
    sampleOralReports: [
      {
        id: 'oral_emma_01',
        date: '10/20/2026, 09:15 AM',
        sentence: 'Books take us on amazing adventures.',
        spoken: 'Books take us on amazing adventures.',
        accuracy: 100,
        wpm: 62,
        durationSeconds: 6.8,
        correctCount: 6,
        mispronouncedCount: 0,
        skippedCount: 0,
        words: [
          { expected: 'Books', spoken: 'Books', status: 'correct' },
          { expected: 'take', spoken: 'take', status: 'correct' },
          { expected: 'us', spoken: 'us', status: 'correct' },
          { expected: 'on', spoken: 'on', status: 'correct' },
          { expected: 'amazing', spoken: 'amazing', status: 'correct' },
          { expected: 'adventures.', spoken: 'adventures.', status: 'correct' }
        ]
      }
    ],
    universalBattery: {
      compositeScore: 89,
      riskIndex: 18,
      riskLevel: 'Low',
      tasks: [
        { name: 'Phonological Awareness & Segmentation', score: 92, benchmark: 85, status: 'Above Benchmark' },
        { name: 'Rapid Automatized Naming (RAN)', score: 78, benchmark: 75, status: 'Meeting Benchmark' },
        { name: 'Visual Letter Discrimination (b/d)', score: 96, benchmark: 90, status: 'Intact' },
        { name: 'Working Memory Digit Span', score: 85, benchmark: 80, status: 'Intact' },
        { name: 'Morphological Structure Synthesis', score: 88, benchmark: 80, status: 'Intact' }
      ]
    }
  },
  {
    id: 'LX-LCH05',
    name: 'Lucas Chen',
    age: 10,
    grade: 'Grade 5',
    school: 'Horizon Elementary School',
    guardian: 'Linda & David Chen',
    guardianPhone: '+1 (555) 672-1149',
    guardianEmail: 'linda.chen@example.com',
    enrolledDate: '09/05/2026',
    avatar: '👦',
    gender: 'Male',
    phenotype: 'Morphological & Orthographic Processing Deficit',
    riskLevel: 'Moderate',
    riskScore: 54,
    primaryDeficit: 'Morpho-Syntactic Segmentation & Multi-morphemic Word Analysis',
    latestAccuracy: 78,
    latestWpm: 55,
    status: 'Targeted Morphology Therapy',
    subtypes: {
      phonological: { score: 38, risk: 'Moderate Risk', pathway: 'Dorsal Temporo-Parietal' },
      visualOrthographic: { score: 45, risk: 'Moderate Risk', pathway: 'Ventral Occipito-Temporal (VWFA)' },
      fluencyRan: { score: 40, risk: 'Moderate Risk', pathway: 'Cerebellar Retrieval Network' }
    },
    doctorNotes: 'Lucas struggles primarily with derivational and inflectional morphemes (un-, dis-, -ment, -tion). Reads base words fluently but makes substitutions when complex prefixes or suffixes are attached.',
    prescriptions: [
      { id: 'morphology', name: 'Root Word & Prefix Morphology Bot Assembly', prescribed: true, frequency: 'Daily (15 mins)' },
      { id: 'morph_snake', name: 'Morphology Snake Affix-Collector Game', prescribed: true, frequency: 'Daily (10 mins)' },
      { id: 'og_phonics', name: 'Multi-syllable Chunking & Orthographic Analysis', prescribed: true, frequency: '3x Weekly' }
    ],
    sampleOralReports: [
      {
        id: 'oral_lucas_01',
        date: '10/17/2026, 02:20 PM',
        sentence: 'Patience and effort lead to great success.',
        spoken: 'Patients and effort lead to great success.',
        accuracy: 100, // Homophone recognized
        wpm: 56,
        durationSeconds: 7.5,
        correctCount: 7,
        mispronouncedCount: 0,
        skippedCount: 0,
        words: [
          { expected: 'Patience', spoken: 'Patients', status: 'correct' },
          { expected: 'and', spoken: 'and', status: 'correct' },
          { expected: 'effort', spoken: 'effort', status: 'correct' },
          { expected: 'lead', spoken: 'lead', status: 'correct' },
          { expected: 'to', spoken: 'to', status: 'correct' },
          { expected: 'great', spoken: 'great', status: 'correct' },
          { expected: 'success.', spoken: 'success.', status: 'correct' }
        ]
      }
    ],
    universalBattery: {
      compositeScore: 74,
      riskIndex: 48,
      riskLevel: 'Moderate',
      tasks: [
        { name: 'Phonological Awareness & Segmentation', score: 80, benchmark: 85, status: 'Meeting Benchmark' },
        { name: 'Rapid Automatized Naming (RAN)', score: 72, benchmark: 75, status: 'Meeting Benchmark' },
        { name: 'Visual Letter Discrimination (b/d)', score: 88, benchmark: 90, status: 'Intact' },
        { name: 'Working Memory Digit Span', score: 79, benchmark: 80, status: 'Age-Appropriate' },
        { name: 'Morphological Structure Synthesis', score: 50, benchmark: 80, status: 'Targeted Deficit' }
      ]
    }
  }
];

// Helper to get doctor profile
export const getDoctorProfile = () => {
  try {
    const raw = localStorage.getItem(DOCTOR_PROFILE_KEY);
    if (raw) return { ...DEFAULT_DOCTOR_PROFILE, ...JSON.parse(raw) };
  } catch (e) {}
  return DEFAULT_DOCTOR_PROFILE;
};

// Helper to save doctor profile
export const saveDoctorProfile = (profileData) => {
  try {
    const updated = { ...getDoctorProfile(), ...profileData };
    localStorage.setItem(DOCTOR_PROFILE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return DEFAULT_DOCTOR_PROFILE;
  }
};

// Helper to get all patients under the doctor
export const getDoctorPatients = (currentUserId = null) => {
  let patients = [...DEFAULT_PATIENTS];

  try {
    const raw = localStorage.getItem(PATIENTS_ROSTER_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        patients = parsed;
      }
    }
  } catch (e) {}

  // Automatically attach real local oral reading reports and exercise history to the primary patient
  try {
    const oralReportsRaw = localStorage.getItem('cognilex_oral_reading_reports');
    if (oralReportsRaw) {
      const parsedReports = JSON.parse(oralReportsRaw);
      if (Array.isArray(parsedReports) && parsedReports.length > 0) {
        const primaryPatient = patients.find(p => p.id === 'LX-BOYCG' || p.id === currentUserId);
        if (primaryPatient) {
          const formattedReports = parsedReports.map(item => {
            const r = item.report || {};
            const summary = r.summary || {};
            const firstSent = (r.sentences && r.sentences[0]) || {};
            return {
              id: item.id || 'rep_' + Math.random(),
              date: item.date || 'Recent Session',
              sentence: firstSent.referenceText || 'Sample practice sentence',
              spoken: firstSent.words ? firstSent.words.map(w => w.spoken || w.expected).join(' ') : 'Spoken speech',
              accuracy: summary.accuracy ?? 85,
              wpm: summary.wpm ?? 50,
              durationSeconds: summary.durationSeconds ?? 8,
              correctCount: summary.correctWords ?? 6,
              mispronouncedCount: summary.mispronounced ?? 1,
              skippedCount: summary.skipped ?? 0,
              words: firstSent.words || []
            };
          });
          primaryPatient.sampleOralReports = [...formattedReports, ...(primaryPatient.sampleOralReports || [])];
        }
      }
    }
  } catch (e) {}

  return patients;
};

// Helper to get a specific patient by ID
export const getPatientById = (patientId, currentUserId = null) => {
  const patients = getDoctorPatients(currentUserId);
  return patients.find(p => p.id === patientId) || patients[0];
};

// Helper to add a new patient to the doctor's caseload
export const addPatientToCaseload = (newPatientData) => {
  const current = getDoctorPatients();
  const id = 'LX-' + (newPatientData.name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'NEW') + String(Math.floor(10 + Math.random() * 90));
  
  const patient = {
    id,
    name: newPatientData.name || 'New Patient',
    age: Number(newPatientData.age) || 8,
    grade: newPatientData.grade || 'Grade 3',
    school: newPatientData.school || 'Community School',
    guardian: newPatientData.guardian || 'Parent/Guardian',
    guardianPhone: newPatientData.guardianPhone || '+1 (555) 000-0000',
    guardianEmail: newPatientData.guardianEmail || 'parent@example.com',
    enrolledDate: new Date().toLocaleDateString(),
    avatar: newPatientData.avatar || '🧒',
    gender: newPatientData.gender || 'Not Specified',
    phenotype: newPatientData.phenotype || 'Evaluating Reader Profile',
    riskLevel: newPatientData.riskLevel || 'Moderate',
    riskScore: newPatientData.riskLevel === 'High' ? 80 : newPatientData.riskLevel === 'Moderate' ? 55 : 25,
    primaryDeficit: newPatientData.primaryDeficit || 'Dorsal Phonological Decoding & Cadence',
    latestAccuracy: 75,
    latestWpm: 45,
    status: 'Initial Clinical Assessment',
    subtypes: {
      phonological: { score: 65, risk: 'Moderate Risk', pathway: 'Dorsal Temporo-Parietal' },
      visualOrthographic: { score: 40, risk: 'Moderate Risk', pathway: 'Ventral Occipito-Temporal (VWFA)' },
      fluencyRan: { score: 45, risk: 'Moderate Risk', pathway: 'Cerebellar Retrieval Network' }
    },
    doctorNotes: newPatientData.initialNotes || 'Initial diagnostic intake scheduled.',
    prescriptions: [
      { id: 'og_phonics', name: 'Structured Multi-Sensory Phonics (Orton-Gillingham)', prescribed: true, frequency: 'Daily (15 mins)' },
      { id: 'visual_tracking', name: 'Saccadic Visual Tracking & Bionic Line Guide', prescribed: true, frequency: 'Daily (10 mins)' },
      { id: 'ran_fluency', name: 'Paired Echo-Reading & RAN Retrieval Drills', prescribed: true, frequency: '3x Weekly' }
    ],
    sampleOralReports: [],
    universalBattery: {
      compositeScore: 70,
      riskIndex: 55,
      riskLevel: newPatientData.riskLevel || 'Moderate',
      tasks: [
        { name: 'Phonological Awareness & Segmentation', score: 65, benchmark: 85, status: 'Evaluating' },
        { name: 'Rapid Automatized Naming (RAN)', score: 60, benchmark: 75, status: 'Evaluating' },
        { name: 'Visual Letter Discrimination (b/d)', score: 75, benchmark: 90, status: 'Evaluating' },
        { name: 'Working Memory Digit Span', score: 70, benchmark: 80, status: 'Evaluating' },
        { name: 'Morphological Structure Synthesis', score: 65, benchmark: 80, status: 'Evaluating' }
      ]
    }
  };

  const updated = [patient, ...current];
  try {
    localStorage.setItem(PATIENTS_ROSTER_KEY, JSON.stringify(updated));
  } catch (e) {}

  return patient;
};

// Helper to save doctor notes for a patient
export const updatePatientClinicalNotes = (patientId, notes) => {
  const current = getDoctorPatients();
  const updated = current.map(p => {
    if (p.id === patientId) {
      return { ...p, doctorNotes: notes };
    }
    return p;
  });

  try {
    localStorage.setItem(PATIENTS_ROSTER_KEY, JSON.stringify(updated));
  } catch (e) {}

  return updated;
};

// Helper to update doctor's therapy prescriptions for a patient
export const updatePatientPrescriptions = (patientId, prescriptions) => {
  const current = getDoctorPatients();
  const updated = current.map(p => {
    if (p.id === patientId) {
      return { ...p, prescriptions };
    }
    return p;
  });

  try {
    localStorage.setItem(PATIENTS_ROSTER_KEY, JSON.stringify(updated));
  } catch (e) {}

  return updated;
};

// Helper to remove / delete a patient from the doctor's caseload
export const deletePatientFromCaseload = (patientId) => {
  const current = getDoctorPatients();
  const updated = current.filter(p => p.id !== patientId);

  try {
    localStorage.setItem(PATIENTS_ROSTER_KEY, JSON.stringify(updated));
  } catch (e) {}

  return updated;
};

