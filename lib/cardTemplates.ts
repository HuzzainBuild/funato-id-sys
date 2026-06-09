export type CollegeTemplateKey =
  | 'agric'
  | 'engineering'
  | 'environmental'
  | 'livestock'
  | 'plant'
  | 'science';

export interface CollegeTemplate {
  key: CollegeTemplateKey;
  college: string;
  src: string;
  aliases: string[];
  departments: string[];
}

export const COLLEGE_TEMPLATES: Record<CollegeTemplateKey, CollegeTemplate> = {
  livestock: {
    key: 'livestock',
    college: 'College of Livestock Development & Environmental Sciences',
    src: '/assets/template_livestock.pdf',
    aliases: [
      'College of Livestock Development and Environmental Sciences',
      'College of Food and Veterinary Sciences',
    ],
    departments: [
      'Animal Science',
      'Animal Production',
      'Fisheries & Aquaculture Management',
      'Fisheries and Aquaculture',
      'Forestry & Wildlife Management',
      'Forestry and Wildlife',
      'Environmental Management & Toxicology',
      'Environmental Management and Toxicology',
    ],
  },
  agric: {
    key: 'agric',
    college: 'College of Agricultural Development & Human Ecology',
    src: '/assets/template_agric.pdf',
    aliases: [
      'College of Agricultural Development and Human Ecology',
      'College of Agricultural Management and Rural Development',
    ],
    departments: [
      'Agricultural Economics',
      'Agribusiness',
      'Agricultural Extension & Rural Development',
      'Agricultural Extension and Rural Development',
      'Agricultural Extension',
      'Human Nutrition & Dietetics',
      'Human Nutrition and Dietetics',
      'Hospitality & Tourism Management',
      'Hospitality and Tourism Management',
      'Home and Rural Economics',
    ],
  },
  engineering: {
    key: 'engineering',
    college: 'College of Engineering & Technology',
    src: '/assets/template_engineering.pdf',
    aliases: [
      'College of Engineering and Technology',
    ],
    departments: [
      'Electrical & Electronics Engineering',
      'Electrical and Electronics Engineering',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Civil Engineering',
      'Agricultural and Bio-systems Engineering',
      'Agricultural and Biosystems Engineering',
      'Agricultural Engineering',
      'Biomedical Engineering',
      'Mechatronics Engineering',
      'Food Science and Technology',
    ],
  },
  science: {
    key: 'science',
    college: 'College of Science & Computing',
    src: '/assets/template_science.pdf',
    aliases: [
      'College of Science and Computing',
      'College of Basic Sciences',
    ],
    departments: [
      'Chemistry',
      'Microbiology',
      'Biology',
      'Physics with Electronics',
      'Physics',
      'Statistics',
      'Mathematics',
      'Biochemistry',
      'Computer Science',
      'Software Engineering',
      'Cyber Security',
      'Cybersecurity',
    ],
  },
  plant: {
    key: 'plant',
    college: 'College of Plant Science & Crop Production',
    src: '/assets/template_plant.pdf',
    aliases: [
      'College of Plant Science and Crop Production',
      'College of Plant Sciences and Crop Production',
    ],
    departments: [
      'Soil Science',
      'Crop Science',
      'Horticulture & Landscape Management',
      'Horticulture and Landscape Management',
      'Plant & Environmental Biology',
      'Plant and Environmental Biology',
    ],
  },
  environmental: {
    key: 'environmental',
    college: 'College of Environmental Design & Geospatial Technology',
    src: '/assets/template_environmental.pdf',
    aliases: [
      'College of Environmental Design and Geospatial Technology',
    ],
    departments: [
      'Architecture',
      'Surveying & Geoinformatics',
      'Surveying and Geoinformatics',
      'Industrial Design',
      'Urban & Regional Planning',
      'Urban and Regional Planning',
    ],
  },
};

const DEFAULT_TEMPLATE = COLLEGE_TEMPLATES.science;

function normalize(value: string | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\btech\b/g, 'technology')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesNormalized(value: string, candidate: string): boolean {
  const normalizedValue = normalize(value);
  const normalizedCandidate = normalize(candidate);
  return normalizedValue === normalizedCandidate;
}

const DEPARTMENT_ALIASES: Record<string, string[]> = {
  'Animal Science': ['Animal Production'],
  'Fisheries & Aquaculture Management': [
    'Fisheries and Aquaculture Management',
    'Fisheries and Aquaculture',
  ],
  'Forestry & Wildlife Management': ['Forestry and Wildlife Management', 'Forestry and Wildlife'],
  'Environmental Management & Toxicology': ['Environmental Management and Toxicology'],
  'Agricultural Economics': [],
  'Agribusiness': [],
  'Agricultural Extension & Rural Development': [
    'Agricultural Extension and Rural Development',
    'Agricultural Extension',
  ],
  'Human Nutrition & Dietetics': ['Human Nutrition and Dietetics'],
  'Hospitality & Tourism Management': ['Hospitality and Tourism Management'],
  'Electrical & Electronics Engineering': [
    'Electrical and Electronics Engineering',
    'Electrical Engineering',
  ],
  'Mechanical Engineering': [],
  'Civil Engineering': [],
  'Agricultural and Bio-systems Engineering': [
    'Agricultural and Biosystems Engineering',
    'Agricultural Engineering',
  ],
  'Biomedical Engineering': [],
  'Mechatronics Engineering': [],
  'Food Science and Technology': [],
  Chemistry: [],
  Microbiology: [],
  Biology: [],
  'Physics with Electronics': ['Physics'],
  Statistics: [],
  Mathematics: [],
  Biochemistry: [],
  'Computer Science': [],
  'Software Engineering': [],
  'Cyber Security': ['Cybersecurity'],
  'Soil Science': [],
  'Crop Science': [],
  'Horticulture & Landscape Management': ['Horticulture and Landscape Management'],
  'Plant & Environmental Biology': ['Plant and Environmental Biology'],
  Architecture: [],
  'Surveying & Geoinformatics': ['Surveying and Geoinformatics'],
  'Industrial Design': [],
  'Urban & Regional Planning': ['Urban and Regional Planning'],
};

export function canonicalizeDepartment(department?: string): string {
  const cleaned = (department || '').trim();
  if (!cleaned) return '';

  for (const [canonical, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
    if (
      matchesNormalized(cleaned, canonical) ||
      aliases.some((alias) => matchesNormalized(cleaned, alias))
    ) {
      return canonical;
    }
  }

  return cleaned;
}

export function getDepartmentSearchValues(department: string): string[] {
  const canonical = canonicalizeDepartment(department);
  const aliases = DEPARTMENT_ALIASES[canonical] || [];
  return Array.from(new Set([canonical, ...aliases].filter(Boolean)));
}

export function resolveCollegeTemplate(
  college?: string,
  department?: string,
): CollegeTemplate {
  if (college) {
    const collegeMatch = Object.values(COLLEGE_TEMPLATES).find((template) =>
      [template.college, ...template.aliases].some((candidate) =>
        matchesNormalized(college, candidate),
      ),
    );
    if (collegeMatch) return collegeMatch;
  }

  const canonicalDepartment = canonicalizeDepartment(department);

  if (canonicalDepartment) {
    const departmentMatch = Object.values(COLLEGE_TEMPLATES).find((template) =>
      template.departments.some((candidate) =>
        matchesNormalized(canonicalDepartment, candidate),
      ),
    );
    if (departmentMatch) return departmentMatch;
  }

  return DEFAULT_TEMPLATE;
}

export function resolveStudentCollege(
  college?: string,
  department?: string,
): string {
  return resolveCollegeTemplate(college, department).college;
}

export function getIDCardTemplateSrc(student: {
  college?: string;
  department?: string;
}): string {
  return resolveCollegeTemplate(student.college, student.department).src;
}
