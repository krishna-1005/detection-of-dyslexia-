import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../dashboard/Navbar';
import './DoctorDashboard.css';
import {
  getDoctorProfile,
  saveDoctorProfile,
  getDoctorPatients,
  addPatientToCaseload,
  updatePatientClinicalNotes,
  updatePatientPrescriptions,
  deletePatientFromCaseload
} from '../../services/doctorDataService';
import { useAuth } from '../auth/AuthContext';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(() => getDoctorProfile());
  const [patients, setPatients] = useState(() => getDoctorPatients(currentUser?.uid));
  const [selectedPatientId, setSelectedPatientId] = useState(() => {
    const list = getDoctorPatients(currentUser?.uid);
    return list.length > 0 ? list[0].id : null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState('ALL'); // 'ALL' | 'High' | 'Moderate' | 'Low'
  const [dossierTab, setDossierTab] = useState('overview'); // 'overview' | 'miscues' | 'battery' | 'prescriptions' | 'notes'

  // Modals
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Editable patient notes & prescriptions state
  const [currentNotes, setCurrentNotes] = useState('');
  const [currentPrescriptions, setCurrentPrescriptions] = useState([]);

  // New Patient Form State
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    grade: 'Grade 3',
    school: '',
    guardian: '',
    guardianPhone: '',
    guardianEmail: '',
    riskLevel: 'Moderate',
    primaryDeficit: 'Phonological Decoding & Grapheme Mapping',
    initialNotes: ''
  });

  // Profile Edit Form State
  const [editProfileForm, setEditProfileForm] = useState({ ...profile });

  // Sync when patient selection changes
  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  useEffect(() => {
    if (selectedPatient) {
      setCurrentNotes(selectedPatient.doctorNotes || '');
      setCurrentPrescriptions(selectedPatient.prescriptions || []);
    }
  }, [selectedPatientId, patients]);

  // Filter patients
  const filteredPatients = patients.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.phenotype && p.phenotype.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRisk = filterRisk === 'ALL' || p.riskLevel === filterRisk;
    return matchesSearch && matchesRisk;
  });

  // Derived Stats
  const totalCaseload = patients.length;
  const criticalCount = patients.filter(p => p.riskLevel === 'High').length;
  const avgAccuracy = Math.round(patients.reduce((acc, p) => acc + (p.latestAccuracy || 70), 0) / (totalCaseload || 1));
  const avgWpm = Math.round(patients.reduce((acc, p) => acc + (p.latestWpm || 45), 0) / (totalCaseload || 1));
  const adherenceRate = 92;

  // Handlers
  const handleSaveNotes = () => {
    if (!selectedPatient) return;
    const updated = updatePatientClinicalNotes(selectedPatient.id, currentNotes);
    setPatients(updated);
    setSaveSuccessMsg('Clinical notes recorded successfully.');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleTogglePrescription = (id) => {
    const updated = currentPrescriptions.map(item => {
      if (item.id === id) {
        return { ...item, prescribed: !item.prescribed };
      }
      return item;
    });
    setCurrentPrescriptions(updated);
  };

  const handleChangeFrequency = (id, newFreq) => {
    const updated = currentPrescriptions.map(item => {
      if (item.id === id) {
        return { ...item, frequency: newFreq };
      }
      return item;
    });
    setCurrentPrescriptions(updated);
  };

  const handleSavePrescriptions = () => {
    if (!selectedPatient) return;
    const updated = updatePatientPrescriptions(selectedPatient.id, currentPrescriptions);
    setPatients(updated);
    setSaveSuccessMsg('Therapy prescriptions updated successfully.');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleDeletePatient = (patientId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this patient from your active caseload?')) {
      const updated = deletePatientFromCaseload(patientId);
      setPatients(updated);
      if (selectedPatientId === patientId && updated.length > 0) {
        setSelectedPatientId(updated[0].id);
      }
    }
  };

  const handleCreatePatient = (e) => {
    e.preventDefault();
    if (!newPatient.name.trim()) return;
    const added = addPatientToCaseload(newPatient);
    setPatients(getDoctorPatients(currentUser?.uid));
    setSelectedPatientId(added.id);
    setShowAddPatientModal(false);
    setNewPatient({
      name: '',
      age: '',
      grade: 'Grade 3',
      school: '',
      guardian: '',
      guardianPhone: '',
      guardianEmail: '',
      riskLevel: 'Moderate',
      primaryDeficit: 'Phonological Decoding & Grapheme Mapping',
      initialNotes: ''
    });
    setSaveSuccessMsg(`Patient ${added.name} added to caseload.`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updated = saveDoctorProfile(editProfileForm);
    setProfile(updated);
    setShowEditProfileModal(false);
    setSaveSuccessMsg('Doctor profile updated.');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  return (
    <div className="doctor-portal-container">
      <Navbar />

      <main className="doctor-main-content">
        {/* DOCTOR PROFILE HERO BANNER */}
        <section className="doctor-hero-card">
          <div className="doctor-hero-content">
            <div className="doctor-avatar-wrap">
              <div className="doctor-avatar-circle">
                {profile.avatar || '🩺'}
              </div>
              <div className="doctor-meta-title">
                <h1>{profile.name}</h1>
                <div className="doctor-badge-row">
                  <span className="doctor-verified-badge">✓ Verified Clinician</span>
                  <span className="doctor-spec-text">{profile.title}</span>
                </div>
                <div className="doctor-clinic-sub">
                  {profile.hospital} • {profile.department} • <strong>{profile.licenseId}</strong>
                </div>
              </div>
            </div>

            <div className="doctor-hero-actions">
              <button 
                className="btn-hero-action btn-hero-ghost"
                onClick={() => navigate('/eye-tracking')}
              >
                👁️ Ocular Motility Test
              </button>
              <button 
                className="btn-hero-action btn-hero-ghost"
                onClick={() => {
                  setEditProfileForm({ ...profile });
                  setShowEditProfileModal(true);
                }}
              >
                ⚙️ Clinician Settings
              </button>
              <button 
                className="btn-hero-action btn-hero-primary"
                onClick={() => setShowAddPatientModal(true)}
              >
                + Enrol New Patient
              </button>
            </div>
          </div>
        </section>

        {saveSuccessMsg && (
          <div style={{
            background: '#ecfdf5',
            color: '#065f46',
            border: '1.5px solid #a7f3d0',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: '1.5rem',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            ✓ {saveSuccessMsg}
          </div>
        )}

        {/* CLINICAL STATS BAR */}
        <section className="doctor-stats-grid">
          <div className="doctor-stat-card">
            <div className="stat-icon-wrap">
              <span className="stat-emoji">👥</span>
              <span className="stat-chip info">Active</span>
            </div>
            <div className="stat-val">{totalCaseload}</div>
            <div className="stat-label">Total Caseload</div>
          </div>

          <div className="doctor-stat-card">
            <div className="stat-icon-wrap">
              <span className="stat-emoji">🚨</span>
              <span className="stat-chip alert">Alert</span>
            </div>
            <div className="stat-val">{criticalCount}</div>
            <div className="stat-label">High-Risk Attention</div>
          </div>

          <div className="doctor-stat-card">
            <div className="stat-icon-wrap">
              <span className="stat-emoji">🎯</span>
              <span className="stat-chip good">Avg</span>
            </div>
            <div className="stat-val">{avgAccuracy}%</div>
            <div className="stat-label">Cohort Accuracy</div>
          </div>

          <div className="doctor-stat-card">
            <div className="stat-icon-wrap">
              <span className="stat-emoji">⚡</span>
              <span className="stat-chip info">Reading</span>
            </div>
            <div className="stat-val">{avgWpm} <small style={{ fontSize: '0.8rem', color: '#64748b' }}>WPM</small></div>
            <div className="stat-label">Avg Oral Fluency</div>
          </div>

          <div className="doctor-stat-card">
            <div className="stat-icon-wrap">
              <span className="stat-emoji">💊</span>
              <span className="stat-chip good">Rx</span>
            </div>
            <div className="stat-val">{adherenceRate}%</div>
            <div className="stat-label">Therapy Adherence</div>
          </div>
        </section>

        {/* ROSTER CONTROLS */}
        <section className="roster-header-bar">
          <div className="roster-title-group">
            <h2>🗂️ Patient Roster & Diagnostic Intake</h2>
            <p>Select a patient card to examine full neurological file, miscue reports, and update therapy prescriptions.</p>
          </div>

          <div className="roster-filters-group">
            <input 
              type="text"
              className="roster-search-input"
              placeholder="Search by name, ID, or phenotype..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="roster-tabs">
              <button 
                className={`roster-tab-btn ${filterRisk === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterRisk('ALL')}
              >
                All ({patients.length})
              </button>
              <button 
                className={`roster-tab-btn ${filterRisk === 'High' ? 'active' : ''}`}
                onClick={() => setFilterRisk('High')}
              >
                High Risk
              </button>
              <button 
                className={`roster-tab-btn ${filterRisk === 'Moderate' ? 'active' : ''}`}
                onClick={() => setFilterRisk('Moderate')}
              >
                Moderate
              </button>
              <button 
                className={`roster-tab-btn ${filterRisk === 'Low' ? 'active' : ''}`}
                onClick={() => setFilterRisk('Low')}
              >
                Low Risk
              </button>
            </div>
          </div>
        </section>

        {/* PATIENTS CARDS GRID */}
        <section className="patient-cards-grid">
          {filteredPatients.map(patient => {
            const isSelected = selectedPatient?.id === patient.id;
            return (
              <div 
                key={patient.id} 
                className={`patient-card ${isSelected ? 'selected-patient' : ''}`}
                onClick={() => setSelectedPatientId(patient.id)}
              >
                <div className="patient-card-top">
                  <div className="patient-avatar-box">
                    {patient.avatar || '🧒'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="patient-id-tag">{patient.id}</span>
                    <button 
                      title="Remove patient from caseload"
                      onClick={(e) => handleDeletePatient(patient.id, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '2px 4px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="patient-card-name">{patient.name}</div>
                <div className="patient-grade-text">
                  Age {patient.age} • {patient.grade} • {patient.school || 'Community School'}
                </div>

                <div className="patient-phenotype-badge">
                  {patient.phenotype || 'Phonological Dyslexia Subtype'}
                </div>

                <div className="patient-metrics-strip">
                  <div className="p-metric-item">
                    <small>Accuracy</small>
                    <strong>{patient.latestAccuracy || 70}%</strong>
                  </div>
                  <div className="p-metric-item">
                    <small>Oral Cadence</small>
                    <strong>{patient.latestWpm || 45} WPM</strong>
                  </div>
                </div>

                <div className="patient-card-footer">
                  <span className={`risk-pill ${patient.riskLevel}`}>
                    ● {patient.riskLevel} Risk ({patient.riskScore || 50})
                  </span>
                  <span className="open-file-link">
                    {isSelected ? 'Viewing File ▼' : 'Open Dossier →'}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {/* DEEP CLINICAL DOSSIER HUB FOR SELECTED PATIENT */}
        {selectedPatient && (
          <section className="patient-dossier-hub">
            <div className="dossier-header-bar">
              <div className="dossier-patient-info">
                <div className="dossier-avatar">
                  {selectedPatient.avatar || '🧒'}
                </div>
                <div className="dossier-title-meta">
                  <h3>
                    {selectedPatient.name}
                    <span className="patient-id-tag">{selectedPatient.id}</span>
                    <span className={`risk-pill ${selectedPatient.riskLevel}`}>
                      ● {selectedPatient.riskLevel} Risk
                    </span>
                  </h3>
                  <div className="dossier-tags">
                    <span className="dossier-tag-item">Age: {selectedPatient.age} ({selectedPatient.grade})</span>
                    <span className="dossier-tag-item">Enrolled: {selectedPatient.enrolledDate}</span>
                    <span className="dossier-tag-item">Guardian: {selectedPatient.guardian} ({selectedPatient.guardianPhone || selectedPatient.guardianEmail})</span>
                  </div>
                </div>
              </div>

              <div className="dossier-actions">
                <button 
                  className="btn-dossier-back"
                  onClick={() => window.print()}
                  title="Export Clinical Dossier to PDF"
                >
                  🖨️ Export PDF
                </button>
              </div>
            </div>

            {/* NEUROLOGICAL PATHWAY RISK CIRCUIT GRID */}
            <div className="dossier-circuit-grid">
              <div className="dossier-circuit-card">
                <div className="circuit-header">
                  <strong>🧠 Dorsal Temporo-Parietal</strong>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#dc2626' }}>
                    {selectedPatient.subtypes?.phonological?.risk || 'Elevated Risk'}
                  </span>
                </div>
                <div className="circuit-bar-track">
                  <div 
                    className="circuit-bar-fill" 
                    style={{ 
                      width: `${selectedPatient.subtypes?.phonological?.score || 72}%`,
                      background: 'linear-gradient(90deg, #f59e0b, #ef4444)'
                    }} 
                  />
                </div>
                <div className="circuit-footer">
                  Grapheme-to-Phoneme conversion & sub-lexical phonological blending circuit.
                </div>
              </div>

              <div className="dossier-circuit-card">
                <div className="circuit-header">
                  <strong>👁️ Ventral Occipito-Temporal (VWFA)</strong>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669' }}>
                    {selectedPatient.subtypes?.visualOrthographic?.risk || 'Within Normal Limits'}
                  </span>
                </div>
                <div className="circuit-bar-track">
                  <div 
                    className="circuit-bar-fill" 
                    style={{ 
                      width: `${selectedPatient.subtypes?.visualOrthographic?.score || 28}%`,
                      background: 'linear-gradient(90deg, #10b981, #059669)'
                    }} 
                  />
                </div>
                <div className="circuit-footer">
                  Visual Word Form Area: direct orthographic sight-word recognition & shape discrimination.
                </div>
              </div>

              <div className="dossier-circuit-card">
                <div className="circuit-header">
                  <strong>⚡ Cerebellar & RAN Network</strong>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#d97706' }}>
                    {selectedPatient.subtypes?.fluencyRan?.risk || 'Moderate Risk'}
                  </span>
                </div>
                <div className="circuit-bar-track">
                  <div 
                    className="circuit-bar-fill" 
                    style={{ 
                      width: `${selectedPatient.subtypes?.fluencyRan?.score || 45}%`,
                      background: 'linear-gradient(90deg, #60a5fa, #f59e0b)'
                    }} 
                  />
                </div>
                <div className="circuit-footer">
                  Rapid Automatized Naming, lexical retrieval cadence, and cerebellar motor articulation.
                </div>
              </div>
            </div>

            {/* DOSSIER SUB-TABS */}
            <div className="dossier-tabs">
              <button 
                className={`dossier-tab-btn ${dossierTab === 'overview' ? 'active' : ''}`}
                onClick={() => setDossierTab('overview')}
              >
                📋 Diagnostic Overview
              </button>
              <button 
                className={`dossier-tab-btn ${dossierTab === 'miscues' ? 'active' : ''}`}
                onClick={() => setDossierTab('miscues')}
              >
                🎙️ Oral Miscue Analysis ({selectedPatient.sampleOralReports?.length || 0})
              </button>
              <button 
                className={`dossier-tab-btn ${dossierTab === 'battery' ? 'active' : ''}`}
                onClick={() => setDossierTab('battery')}
              >
                📊 Universal Battery
              </button>
              <button 
                className={`dossier-tab-btn ${dossierTab === 'prescriptions' ? 'active' : ''}`}
                onClick={() => setDossierTab('prescriptions')}
              >
                💊 Therapy Prescriptions ({currentPrescriptions.filter(p => p.prescribed).length})
              </button>
              <button 
                className={`dossier-tab-btn ${dossierTab === 'notes' ? 'active' : ''}`}
                onClick={() => setDossierTab('notes')}
              >
                📝 Clinician Progress Notes
              </button>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {dossierTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#0f172a' }}>
                    Clinical Diagnosis & Phenotype Classification
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
                    <strong>Primary Phenotype:</strong> {selectedPatient.phenotype}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
                    <strong>Target Neurological Pathway:</strong> {selectedPatient.primaryDeficit}
                  </p>
                  <div style={{ padding: '1rem', background: '#ffffff', borderRadius: 12, border: '1px solid #cbd5e1' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#0f766e', display: 'block', marginBottom: 6 }}>
                      DOCTOR INTAKE OBSERVATIONS:
                    </strong>
                    <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                      {selectedPatient.doctorNotes || 'No specific intake notes entered yet.'}
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a' }}>
                    Patient Quick Facts
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.84rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <li><strong>Status:</strong> <span style={{ color: '#0f766e', fontWeight: 700 }}>{selectedPatient.status || 'Active'}</span></li>
                    <li><strong>School:</strong> {selectedPatient.school || 'Lincoln Elementary'}</li>
                    <li><strong>Guardian:</strong> {selectedPatient.guardian}</li>
                    <li><strong>Contact:</strong> {selectedPatient.guardianPhone || selectedPatient.guardianEmail}</li>
                    <li><strong>Last Assessment:</strong> {selectedPatient.sampleOralReports?.[0]?.date || 'Recent'}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB CONTENT: MISCUE ANALYSIS */}
            {dossierTab === 'miscues' && (
              <div>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#0f172a' }}>
                  Oral Reading Miscue Taxonomy & Speech Transcripts
                </h4>
                {(!selectedPatient.sampleOralReports || selectedPatient.sampleOralReports.length === 0) ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: 14, color: '#64748b' }}>
                    No oral reading sessions recorded yet for this patient. Have the patient complete a test at <code>/reading-test</code>.
                  </div>
                ) : (
                  selectedPatient.sampleOralReports.map((report, idx) => (
                    <div key={report.id || idx} className="miscue-report-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                            Session Record #{idx + 1} — {report.date}
                          </strong>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Reference Text: <em>"{report.sentence}"</em>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.84rem', background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: 6, fontWeight: 800 }}>
                            {report.accuracy}% Accuracy
                          </span>
                          <span style={{ fontSize: '0.84rem', background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: 6, fontWeight: 800 }}>
                            {report.wpm} WPM
                          </span>
                        </div>
                      </div>

                      <table className="miscue-table">
                        <thead>
                          <tr>
                            <th>Expected Word</th>
                            <th>Spoken Word</th>
                            <th>Status</th>
                            <th>Miscue Classification</th>
                            <th>Neurological Pathway</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.words?.map((w, wIdx) => {
                            const isError = w.status !== 'correct';
                            return (
                              <tr key={wIdx} style={isError ? { background: '#fff1f2' } : {}}>
                                <td><strong>{w.expected}</strong></td>
                                <td style={{ color: isError ? '#e11d48' : '#059669', fontWeight: isError ? 800 : 600 }}>
                                  {w.spoken || '—'}
                                </td>
                                <td>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: isError ? '#ffe4e6' : '#dcfce7',
                                    color: isError ? '#be123c' : '#15803d'
                                  }}>
                                    {w.status}
                                  </span>
                                </td>
                                <td style={{ fontSize: '0.78rem', color: '#475569' }}>
                                  {w.miscue?.label || (isError ? 'Sub-lexical Miscue' : 'Exact Match')}
                                </td>
                                <td style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                  {w.miscue?.pathway || (isError ? 'Dorsal Stream' : 'Intact')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: UNIVERSAL BATTERY */}
            {dossierTab === 'battery' && (
              <div>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#0f172a' }}>
                  Universal Diagnostic Battery Sub-Test Breakdown
                </h4>
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Composite Diagnostic Battery Index</strong>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Standardized clinical battery across 5 phonological & visual domains</div>
                    </div>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f766e' }}>
                      {selectedPatient.universalBattery?.compositeScore || 70}/100
                    </span>
                  </div>

                  <table className="miscue-table" style={{ background: '#ffffff', borderRadius: 10, overflow: 'hidden' }}>
                    <thead>
                      <tr>
                        <th>Domain / Sub-Task</th>
                        <th>Patient Score</th>
                        <th>Clinical Benchmark</th>
                        <th>Differential</th>
                        <th>Clinical Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedPatient.universalBattery?.tasks || [
                        { name: 'Phonological Awareness & Segmentation', score: 65, benchmark: 85, status: 'Evaluating' },
                        { name: 'Rapid Automatized Naming (RAN)', score: 60, benchmark: 75, status: 'Evaluating' },
                        { name: 'Visual Letter Discrimination (b/d/p/q)', score: 75, benchmark: 90, status: 'Evaluating' },
                        { name: 'Working Memory Digit Span', score: 70, benchmark: 80, status: 'Evaluating' },
                        { name: 'Morphological Structure Synthesis', score: 65, benchmark: 80, status: 'Evaluating' }
                      ]).map((task, tIdx) => {
                        const diff = task.score - task.benchmark;
                        const isUnder = diff < 0;
                        return (
                          <tr key={tIdx}>
                            <td><strong>{task.name}</strong></td>
                            <td style={{ fontWeight: 800, color: isUnder ? '#e11d48' : '#059669' }}>{task.score}%</td>
                            <td style={{ color: '#64748b' }}>{task.benchmark}%</td>
                            <td style={{ fontWeight: 700, color: isUnder ? '#e11d48' : '#059669' }}>
                              {diff > 0 ? `+${diff}%` : `${diff}%`}
                            </td>
                            <td>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: isUnder ? '#ffe4e6' : '#dcfce7',
                                color: isUnder ? '#be123c' : '#15803d'
                              }}>
                                {isUnder ? 'Target for Intervention' : 'Benchmark Met'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: PRESCRIPTIONS */}
            {dossierTab === 'prescriptions' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                      Clinical Therapy Prescription Protocol
                    </h4>
                    <small style={{ color: '#64748b' }}>
                      Prescribe targeted neuro-cognitive therapy modules directly into the student’s daily practice queue.
                    </small>
                  </div>
                  <button 
                    className="btn-hero-action btn-hero-primary"
                    onClick={handleSavePrescriptions}
                  >
                    💾 Save Prescription Protocol
                  </button>
                </div>

                <div className="prescription-checklist">
                  {currentPrescriptions.map(item => (
                    <div key={item.id} className="prescription-item">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={item.prescribed}
                          onChange={() => handleTogglePrescription(item.id)}
                          style={{ width: 18, height: 18, accentColor: '#0f766e' }}
                        />
                        <span>{item.name}</span>
                      </label>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <select 
                          value={item.frequency}
                          onChange={(e) => handleChangeFrequency(item.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8rem',
                            outline: 'none',
                            background: '#ffffff',
                            fontWeight: 600
                          }}
                        >
                          <option value="Daily (15 mins)">Daily (15 mins)</option>
                          <option value="Daily (10 mins)">Daily (10 mins)</option>
                          <option value="3x Weekly">3x Weekly</option>
                          <option value="2x Weekly">2x Weekly</option>
                          <option value="Weekly Intensive">Weekly Intensive</option>
                        </select>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: item.prescribed ? '#ecfdf5' : '#f1f5f9',
                          color: item.prescribed ? '#059669' : '#94a3b8'
                        }}>
                          {item.prescribed ? 'Active Rx' : 'Not Prescribed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: CLINICIAN NOTES */}
            {dossierTab === 'notes' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                      Progress & Treatment Diagnostic Notes
                    </h4>
                    <small style={{ color: '#64748b' }}>
                      Maintain board-certified clinical logs, school IEP accommodations, and parent consultation notes.
                    </small>
                  </div>
                  <button 
                    className="btn-hero-action btn-hero-primary"
                    onClick={handleSaveNotes}
                  >
                    💾 Save Clinical Notes
                  </button>
                </div>

                <textarea 
                  className="doctor-notes-editor"
                  rows={8}
                  placeholder="Record longitudinal observations, IEP recommendations, and clinical updates..."
                  value={currentNotes}
                  onChange={(e) => setCurrentNotes(e.target.value)}
                />
              </div>
            )}
          </section>
        )}

        {/* MODAL: ADD NEW PATIENT */}
        {showAddPatientModal && (
          <div className="modal-overlay" onClick={() => setShowAddPatientModal(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', color: '#0f172a' }}>
                Enrol New Patient into Clinical Caseload
              </h3>
              <form onSubmit={handleCreatePatient} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Full Patient Name *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Maya Sharma"
                    className="roster-search-input"
                    style={{ width: '100%' }}
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Age *
                    </label>
                    <input 
                      type="number" 
                      required
                      placeholder="e.g. 9"
                      className="roster-search-input"
                      style={{ width: '100%' }}
                      value={newPatient.age}
                      onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Grade
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Grade 4"
                      className="roster-search-input"
                      style={{ width: '100%' }}
                      value={newPatient.grade}
                      onChange={(e) => setNewPatient({ ...newPatient, grade: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    School Name
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Oakridge Elementary"
                    className="roster-search-input"
                    style={{ width: '100%' }}
                    value={newPatient.school}
                    onChange={(e) => setNewPatient({ ...newPatient, school: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Guardian Name
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rahul Sharma"
                      className="roster-search-input"
                      style={{ width: '100%' }}
                      value={newPatient.guardian}
                      onChange={(e) => setNewPatient({ ...newPatient, guardian: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Guardian Email / Phone
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. parent@example.com"
                      className="roster-search-input"
                      style={{ width: '100%' }}
                      value={newPatient.guardianEmail}
                      onChange={(e) => setNewPatient({ ...newPatient, guardianEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Diagnostic Risk Level
                  </label>
                  <select 
                    className="roster-search-input"
                    style={{ width: '100%' }}
                    value={newPatient.riskLevel}
                    onChange={(e) => setNewPatient({ ...newPatient, riskLevel: e.target.value })}
                  >
                    <option value="High">High Risk (Phonological Deficit)</option>
                    <option value="Moderate">Moderate Risk (Mild Decoding Delay)</option>
                    <option value="Low">Low Risk / Within Normal Limits</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button 
                    type="button" 
                    className="btn-dossier-back"
                    onClick={() => setShowAddPatientModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-hero-action btn-hero-primary"
                  >
                    Enrol Patient
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT DOCTOR PROFILE */}
        {showEditProfileModal && (
          <div className="modal-overlay" onClick={() => setShowEditProfileModal(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', color: '#0f172a' }}>
                Clinician Credential & Center Settings
              </h3>
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Clinician Full Name & Degree
                  </label>
                  <input 
                    type="text" 
                    required
                    className="roster-search-input"
                    style={{ width: '100%' }}
                    value={editProfileForm.name}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Clinical Title / Specialty
                  </label>
                  <input 
                    type="text" 
                    className="roster-search-input"
                    style={{ width: '100%' }}
                    value={editProfileForm.title}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Medical Center / Hospital
                  </label>
                  <input 
                    type="text" 
                    className="roster-search-input"
                    style={{ width: '100%' }}
                    value={editProfileForm.hospital}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, hospital: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      License ID
                    </label>
                    <input 
                      type="text" 
                      className="roster-search-input"
                      style={{ width: '100%' }}
                      value={editProfileForm.licenseId}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, licenseId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Department
                    </label>
                    <input 
                      type="text" 
                      className="roster-search-input"
                      style={{ width: '100%' }}
                      value={editProfileForm.department}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, department: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button 
                    type="button" 
                    className="btn-dossier-back"
                    onClick={() => setShowEditProfileModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-hero-action btn-hero-primary"
                  >
                    Save Credentials
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;
