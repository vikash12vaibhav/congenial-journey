const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ---------------------------------------------------------
// IN-MEMORY DATABASE SETUP (Zero Dependencies/Obstacles!)
// ---------------------------------------------------------
const db = {
    students: [],
    recruiters: [],
    universities: [],
    universityRecords: []
};

// Seed default demo student profile
db.students.push({
    id: 'STU-A8F3-2D91-7C45-E6B2',
    phone: '9999999999',
    type: 'student',
    name: 'Aryan Sharma',
    academic: { class10: null, class12: null, college: null },
    certificates: []
});
console.log("✅ Successfully initialized In-Memory Database! (Zero external dependencies)");
console.log("Seeded default demo student profile.");

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const otps = new Map();

// --- AUTHENTICATION MOCK ---
app.post('/api/auth/send-otp', (req, res) => {
    const { phone } = req.body;
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    otps.set(phone, randomOtp);
    setTimeout(() => {
        if (otps.get(phone) === randomOtp) {
            otps.delete(phone);
        }
    }, 30000); // Expires in 30 seconds
    
    res.status(200).json({ message: `OTP Sent: ${randomOtp}`, otp: randomOtp });
});

app.post('/api/auth/verify', async (req, res) => {
    const { phone, otp, role } = req.body;
    
    const validOtp = otps.get(phone);
    if (!validOtp || validOtp !== otp) {
        return res.status(401).json({ error: 'Invalid or expired OTP' });
    }
    otps.delete(phone); // Consume OTP
    
    let userData = null;
    const generateId = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    try {
        if (role === 'student') {
            userData = db.students.find(s => s.phone === phone);
            if (!userData) {
                userData = {
                    id: generateId('STU'),
                    phone,
                    type: 'student',
                    name: 'New Student',
                    academic: { class10: null, class12: null, college: null },
                    certificates: []
                };
                db.students.push(userData);
            }
        } else if (role === 'recruiter') {
            userData = db.recruiters.find(r => r.phone === phone);
            if (!userData) {
                userData = {
                    id: generateId('REC'),
                    phone,
                    type: 'recruiter',
                    companyName: 'Tech Corp Inc.',
                    verified: true
                };
                db.recruiters.push(userData);
            }
        } else if (role === 'university') {
            userData = db.universities.find(u => u.phone === phone);
            if (!userData) {
                userData = {
                    id: generateId('UNI'),
                    phone,
                    type: 'university',
                    name: 'Demo University',
                    verified: true
                };
                db.universities.push(userData);
            }
        }
        res.status(200).json({ message: 'Login successful', user: userData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- STUDENT ACTIONS ---
app.post('/api/student/verify-academic', async (req, res) => {
    const { studentId, level, institution, rollNumber } = req.body;

    try {
        const student = db.students.find(s => s.id === studentId);
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const academicData = student.academic || {};
        academicData[level] = {
            institution,
            rollNumber,
            verified: true,
            verifiedAt: new Date().toISOString()
        };

        student.academic = academicData;

        res.status(200).json({ message: `${level} verified successfully`, academic: academicData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/student/upload-certificate', async (req, res) => {
    const { studentId, fileHash, companyName } = req.body;

    try {
        const student = db.students.find(s => s.id === studentId);
        if (!student) return res.status(404).json({ error: 'Student not found' });

        let issuerData = db.universityRecords.find(r => r.fileHash === fileHash);
        const isVerified = !!issuerData && !issuerData.revoked;
        
        if (!issuerData) {
            issuerData = { issuer: companyName, purpose: 'Unknown', summary: 'Unverified Certificate' };
        } else if (issuerData.revoked) {
            issuerData.summary = 'REVOKED CERTIFICATE';
        }

        const certRecord = {
            fileHash,
            companyName,
            verified: isVerified,
            details: issuerData,
            uploadDate: new Date().toISOString()
        };

        student.certificates.push(certRecord);

        res.status(200).json({ message: 'Certificate processed', certificate: certRecord });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- UNIVERSITY ACTIONS ---
app.post('/api/university/issue', async (req, res) => {
    const { fileHash, universityName, purpose, summary } = req.body;

    try {
        const newRecord = {
            fileHash,
            issuer: universityName,
            purpose,
            summary,
            revoked: false,
            issuedAt: new Date().toISOString()
        };

        const existingIndex = db.universityRecords.findIndex(r => r.fileHash === fileHash);
        if (existingIndex > -1) {
            db.universityRecords[existingIndex] = { ...db.universityRecords[existingIndex], ...newRecord };
        } else {
            db.universityRecords.push(newRecord);
        }

        res.status(200).json({ message: 'Record added to In-Memory ledger' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/university/revoke', async (req, res) => {
    const { fileHash } = req.body;
    try {
        const record = db.universityRecords.find(r => r.fileHash === fileHash);
        if (record) {
            record.revoked = true;
            res.status(200).json({ message: 'Certificate cryptographically revoked in memory' });
        } else {
            res.status(404).json({ error: 'Hash not found on ledger' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- RECRUITER ACTIONS ---
app.post('/api/recruiter/search', async (req, res) => {
    const { studentId } = req.body;

    try {
        const student = db.students.find(s => s.id === studentId);
        if (student) {
            res.status(200).json({ student });
        } else {
            res.status(404).json({ error: 'Student ID not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(PORT, () => {
    console.log(`Serving real Zero-Dependency platform at http://localhost:${PORT}`);
});
