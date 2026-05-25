// types/index.ts

export interface Student {
  _id?: string;
  surname: string;
  otherNames: string;
  matricNumber: string;
  department: string;
  college?: string;
  sex: 'Male' | 'Female';
  bloodGroup: string;
  genotype: string;
  passportUrl?: string;
  passportData?: string; // legacy base64 fallback; new saves use passportUrl
  securityString: string;
  qrData?: string;
  importYear: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Admin {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: 'superadmin' | 'admin';
  createdAt?: string;
}

export interface UploadRecord {
  _id?: string;
  fileName: string;
  totalRecords: number;
  successRecords: number;
  duplicates: number;
  errors: number;
  uploadedBy: string;
  createdAt?: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalDepartments: number;
  totalUploads: number;
  recentUploads: number;
  studentsByDepartment: { department: string; count: number }[];
  studentsByYear: { year: number; count: number }[];
}

export interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  duplicates: number;
  errors: { row: number; message: string }[];
  students: Student[];
}

export interface PrintConfig {
  layout: 'single' | 'batch' | 'a4';
  cardsPerPage: 8 | 4 | 2 | 1;
  orientation: 'portrait' | 'landscape';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

export interface FilterOptions {
  search: string;
  department: string;
  year: number | null;
  sex: string;
  page: number;
  limit: number;
}

// Departments at FUNATO
export const DEPARTMENTS = [
  'Animal Science',
  'Fisheries & Aquaculture Management',
  'Forestry & Wildlife Management',
  'Environmental Management & Toxicology',
  'Agricultural Economics',
  'Agribusiness',
  'Agricultural Extension & Rural Development',
  'Human Nutrition & Dietetics',
  'Hospitality & Tourism Management',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Agricultural and Bio-systems Engineering',
  'Biomedical Engineering',
  'Mechatronics Engineering',
  'Food Science and Technology',
  'Chemistry',
  'Microbiology',
  'Biology',
  'Physics with Electronics',
  'Statistics',
  'Mathematics',
  'Biochemistry',
  'Computer Science',
  'Software Engineering',
  'Cyber Security',
  'Soil Science',
  'Crop Science',
  'Horticulture & Landscape Management',
  'Plant & Environmental Biology',
  'Architecture',
  'Surveying & Geoinformatics',
  'Industrial Design',
  'Urban & Regional Planning',
];

export const COLLEGES = [
  'College of Livestock Development & Environmental Sciences',
  'College of Agricultural Development & Human Ecology',
  'College of Engineering & Technology',
  'College of Science & Computing',
  'College of Plant Science & Crop Production',
  'College of Environmental Design & Geospatial Technology',
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const GENOTYPES = ['AA', 'AS', 'SS', 'AC', 'SC'];

// Map department to college
export const DEPARTMENT_COLLEGE_MAP: Record<string, string> = {
  'Animal Science': 'College of Livestock Development & Environmental Sciences',
  'Fisheries & Aquaculture Management': 'College of Livestock Development & Environmental Sciences',
  'Forestry & Wildlife Management': 'College of Livestock Development & Environmental Sciences',
  'Environmental Management & Toxicology': 'College of Livestock Development & Environmental Sciences',
  'Agricultural Economics': 'College of Agricultural Development & Human Ecology',
  'Agribusiness': 'College of Agricultural Development & Human Ecology',
  'Agricultural Extension & Rural Development': 'College of Agricultural Development & Human Ecology',
  'Human Nutrition & Dietetics': 'College of Agricultural Development & Human Ecology',
  'Hospitality & Tourism Management': 'College of Agricultural Development & Human Ecology',
  'Electrical & Electronics Engineering': 'College of Engineering & Technology',
  'Mechanical Engineering': 'College of Engineering & Technology',
  'Civil Engineering': 'College of Engineering & Technology',
  'Agricultural and Bio-systems Engineering': 'College of Engineering & Technology',
  'Biomedical Engineering': 'College of Engineering & Technology',
  'Mechatronics Engineering': 'College of Engineering & Technology',
  'Food Science and Technology': 'College of Engineering & Technology',
  'Chemistry': 'College of Science & Computing',
  'Microbiology': 'College of Science & Computing',
  'Biology': 'College of Science & Computing',
  'Physics with Electronics': 'College of Science & Computing',
  'Statistics': 'College of Science & Computing',
  'Mathematics': 'College of Science & Computing',
  'Biochemistry': 'College of Science & Computing',
  'Computer Science': 'College of Science & Computing',
  'Software Engineering': 'College of Science & Computing',
  'Cyber Security': 'College of Science & Computing',
  'Soil Science': 'College of Plant Science & Crop Production',
  'Crop Science': 'College of Plant Science & Crop Production',
  'Horticulture & Landscape Management': 'College of Plant Science & Crop Production',
  'Plant & Environmental Biology': 'College of Plant Science & Crop Production',
  'Architecture': 'College of Environmental Design & Geospatial Technology',
  'Surveying & Geoinformatics': 'College of Environmental Design & Geospatial Technology',
  'Industrial Design': 'College of Environmental Design & Geospatial Technology',
  'Urban & Regional Planning': 'College of Environmental Design & Geospatial Technology',
};
