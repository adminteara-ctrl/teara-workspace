# TEARA WORKHUB
### Internal Workforce, Attendance & Productivity Management Platform

Teara WorkHub is an internal workforce management platform designed for Teara's internal R&D team and scalable across other organizational departments. It provides robust check-in/out tracking, working hour calculation, break tracking, daily work log submissions with Jira & file attachments, and comprehensive executive productivity reporting.

---

## 1. Predefined Users & Credentials
The platform is configured with 5 distinct users and pre-defined credentials for immediate access and testing:

| Username | Password | Role | Name | Department |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | **Administrator** | Admin (Lead) | R&D |
| **`kunal`** | `kunal123` | **Employee** | Kunal | R&D |
| **`ayan`** | `ayan123` | **Employee** | Ayan | R&D |
| **`tanmoy`** | `tanmoy123` | **Employee** | Tanmoy | R&D |
| **`tanisha`** | `tanisha123` | **Employee** | Tanisha | R&D |

*Note:* All artificial dummy data has been removed. The application starts clean and only records real user sessions, breaks, work logs, attachments, and audits as you use it.

---

## 2. Brand Identity & Visual System

- **Forest Green:** `#192B16` (Primary navigation sidebar & executive badges)
- **Earth Gold:** `#B29261` (Highlights, active accents & progress indicators)
- **Cream:** `#FEFCF7` (Background canvas, cards & content area)
- **Typography & Elevation:** Clean, structured SaaS visual hierarchy with rounded corners and subtle border contrasts.

---

## 2. Core Modules & Functionality

### Employee Workspace
1. **Personal Dashboard:**
   - Real-time active session timer.
   - 3-hour minimum daily target progress ring and deficit tracker.
   - 18-hour minimum weekly target contribution progress (Monday to Saturday, Sunday off).
   - Recent daily work logs with Jira task tags.
   - Daily log reminder prompt.

2. **Attendance & Working Hours Console:**
   - Server timestamp check-in / check-out.
   - Work mode selection: **Work From Office** (Lab/HQ) vs **Work From Home** (Remote).
   - Break management (Start Break / End Break with automatic deduction from actual working hours).
   - Prevention of accidental check-outs while break is active.
   - Full date-wise attendance history table.
   - **Attendance Correction Requests:** Submit timestamp adjustment requests with justifications for administrative review.

3. **Daily Work Log System:**
   - Associated Jira Task ID & URL.
   - Work undertaken, deliverables accomplished, pending tasks, and blockers.
   - Multiple logs per day supported.
   - **Supporting Links Manager:** Categorized links (Jira, Google Docs/Sheets/Slides, Figma, GitHub, arXiv research papers).
   - **File Attachments:** Upload and validate documents (PDF, DOCX, XLSX, CSV, PNG, JPG).
   - **Revision History:** Non-destructive audit history of edits.

4. **My Records & Profile:**
   - Date-wise logs with CSV export.
   - Hybrid work mode preference setting.

---

### Administrative Console
1. **Command Dashboard:**
   - 6 Key Performance Indicators (Total Staff, Present Today, Currently Working, Met 3h Target, Below Target, Missing Submissions).
   - Live presence matrix with real-time session durations.
   - Automated reminder dispatch to employees with missing logs.

2. **Employee Directory & Account Management:**
   - Provision new employee accounts.
   - Role-based permissions (Admin vs Employee).
   - Department assignment (R&D, Engineering, Hardware Architecture, Product, Operations).
   - Activate / deactivate accounts.
   - Trigger password reset links.

3. **Master Attendance Monitoring:**
   - Multi-dimensional filters (date range, work mode, target status, department).
   - Attendance correction requests review & one-click approval / rejection with audit remarks.

4. **Work-Log Monitoring & Review:**
   - Search by Jira task ID or employee name.
   - Review deliverables and attachments.
   - Append administrative remarks and mark submissions as reviewed.

5. **Productivity Analytics & Reports:**
   - Weekly 18-hour contribution reports.
   - Daily 3-hour policy deficit audits.
   - Missing submission tracking.
   - One-click CSV exports.

6. **Work Schedule & Policy Configuration:**
   - Configurable minimum daily hours (default: 3.0h).
   - Configurable minimum weekly hours (default: 18.0h).
   - Working days configuration (Mon-Sat default, Sun weekly off).

7. **Transactional Notifications & Audit Trail:**
   - Notification dispatch log (Resend email ready format).
   - Chronological audit log of check-ins, check-outs, and administrative decisions.

---

## 3. Technology Stack

- **Frontend:** React, TypeScript, Tailwind CSS v4, Lucide React
- **Backend & Persistence:** Cloud Firestore, Firebase Authentication, Firebase Storage
- **Security:** Attribute-Based Access Control (ABAC) in `firestore.rules`, `storage.rules`
- **Hosting / Deployment:** GitHub + Vercel

---

## 4. Deployment Instructions (GitHub & Vercel)

1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "Initial Teara WorkHub deployment"
   git push origin main
   ```
2. Import the repository into **Vercel**:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Configure Environment Variables in Vercel settings (refer to `.env.example`):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_DATABASE_ID`
4. Deploy on Vercel.
