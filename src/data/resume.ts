export interface Role {
  title: string;
  period: string;
  description?: string;
  bullets?: string[];
}

export interface Experience {
  company: string;
  location: string;
  roles: Role[];
}

export interface Education {
  institution: string;
  degree: string;
  period: string;
  location: string;
  distinction?: string;
}

export interface Metric {
  value: string;
  label: string;
}

export interface Engagement {
  client: string;
  sector: string;
  scope: string;
  impact: string;
  trend: 'positive' | 'neutral';
}

export const summary = `Senior Engagement Manager with 15 years in Professional Services, leading high-impact digital transformations that drive revenue growth and cost efficiency. Experienced in delivering AI solutions for complex challenges across Manufacturing, Healthcare, Oil & Gas, Telecom, and Financial Services sectors for global enterprises. Skilled in aligning cross-functional teams and collaborating with senior leadership on programs exceeding $15M, consistently exceeding metrics in adoption, customer satisfaction (NPS), and operational efficiency. Known for building trust-based client relationships and adept at navigating ambiguity. Technically proficient with expertise in software engineering, solution architecture, cloud engineering, and advanced machine learning, including LLMs and Generative AI.`;

export const experience: Experience[] = [
  {
    company: "C3 AI",
    location: "London, United Kingdom",
    roles: [
      {
        title: "Senior Engagement Manager (Forward Deployed Engineering)",
        period: "August 2021 – Present",
        description: "Director-level programme lead across all Business Units and Partners, managing $15M budget with 70+ resources, reporting to VP of Customer Services.",
        bullets: [
          "CEO-sponsored PdM rollout: 100+ plants, 2,000+ end users, $18M EBIT impact",
          "GenAI RAG rollout across enterprise knowledge base",
          "Led 20+ cross-functional team across App Dev, Data Science, QA, DevOps",
          "Sustained NPS >70 across all engagements",
          "Partner enablement and practice-building across consulting firms",
        ],
      },
    ],
  },
  {
    company: "Deloitte",
    location: "London, United Kingdom",
    roles: [
      {
        title: "Manager",
        period: "October 2018 – July 2021",
        description: "Grew Deloitte UK's Anaplan practice from inception to 25+ practitioners, leading enterprise deployments across telco, banking, and investment management.",
        bullets: [
          "First enterprise-wide deployment for a large British telco (7 BUs)",
          "Data architecture transformation for 75K-employee American bank",
          "Financial planning for £170.3B AUM UK investment firm",
        ],
      },
    ],
  },
  {
    company: "Accenture",
    location: "London, United Kingdom",
    roles: [
      {
        title: "Management Consultant",
        period: "April 2017 – September 2018",
        description: "Design Lead for Aerospace & Defence demand forecasting solution.",
        bullets: [],
      },
    ],
  },
  {
    company: "Codec",
    location: "Dublin, Ireland",
    roles: [
      {
        title: "Senior Consultant",
        period: "January 2015 – March 2017",
        bullets: [],
      },
    ],
  },
  {
    company: "Accenture",
    location: "Milan, Italy",
    roles: [
      {
        title: "Software Engineer",
        period: "April 2012 – December 2014",
        bullets: [],
      },
    ],
  },
];

export const education: Education[] = [
  {
    institution: "Abertay University",
    degree: "MSc Ethical Hacking and Cybersecurity",
    period: "2021 – 2023",
    location: "Dundee, UK",
    distinction: "Distinction",
  },
  {
    institution: "University of Bari Aldo Moro",
    degree: "BSc Computer Science",
    period: "2005 – 2011",
    location: "Bari, Italy",
  },
];

export const metrics: Metric[] = [
  { value: "$15M", label: "programme directed" },
  { value: "$18M", label: "EBIT impact" },
  { value: "NPS >70", label: "client satisfaction" },
  { value: "100+", label: "plants deployed" },
  { value: "2,000+", label: "end users" },
  { value: "15", label: "years experience" },
];

export const engagements: Engagement[] = [
  { client: "swiss manufacturer", sector: "manufacturing", scope: "100+ plants, 2K users", impact: "$18M EBIT", trend: "positive" },
  { client: "british telco", sector: "telecom", scope: "7 business units", impact: "25+ practice", trend: "positive" },
  { client: "american bank", sector: "fin. services", scope: "75K employees", impact: "data architecture", trend: "neutral" },
  { client: "uk investment firm", sector: "fin. services", scope: "AUM £170.3B", impact: "fin. planning", trend: "neutral" },
  { client: "aerospace co", sector: "defence", scope: "forecasting", impact: "design lead", trend: "neutral" },
];

export const industries = [
  "Manufacturing",
  "Healthcare",
  "Oil & Gas",
  "Telecom",
  "Financial Services",
  "Building Materials",
  "Aerospace & Defense",
  "Public Sector",
];

export const skills = [
  "Python",
  "Java",
  "Go",
  "Rust",
  "SQL",
  "Bash",
  "Cloud (AWS/Azure/GCP)",
  "ML Pipelines",
  "Deep Learning",
  "Reinforcement Learning",
  "LLMs & GenAI",
  "RAG Systems",
  "Data Engineering",
  "Data Integration",
  "Solution Architecture",
  "Enterprise Architecture",
  "Security Tooling",
  "Penetration Testing",
  "Reverse Engineering",
  "MLOps",
  "GitOps",
  "Linux",
];

export const certifications = [
  "Prince2 Practitioner",
  "GCHQ-Certified MSc",
  "Stanford ML",
  "deeplearning.ai",
  "Udacity Deep RL",
  "Imperial College Math for ML",
];

export const managementSkills = [
  "Program Management",
  "Project Management",
  "Stakeholder Management",
  "Digital Transformation",
  "Agile & Waterfall",
  "Business Strategy",
  "Value Consulting",
  "Customer Success",
  "SDLC",
  "Statements of Work",
];

export const languages = ["English (Fluent)", "Italian (Native)"];

export const continuousLearning = [
  "Stanford Machine Learning (2016)",
  "deeplearning.ai Neural Networks",
  "Udacity Deep Learning Nanodegree",
  "Udacity Deep Reinforcement Learning Nanodegree",
  "Imperial College Mathematics for ML",
  "Stanford Probabilistic Graphical Models (with Honors)",
  "Hack The Box",
  "Claude Code / AI Engineering",
  "Prompt Engineering",
];
