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

export const summary = `Senior Engagement Manager with 14+ years in Professional Services, leading high-impact digital transformations that drive revenue growth and cost efficiency. Experienced in delivering AI solutions for complex challenges across Manufacturing, Healthcare, Oil & Gas, Telecom, and Financial Services sectors for global enterprises. Skilled in aligning cross-functional teams and collaborating with senior leadership on programs exceeding $15M, consistently exceeding metrics in adoption, customer satisfaction (NPS), and operational efficiency. Known for building trust-based client relationships and adept at navigating ambiguity. Technically proficient with expertise in software engineering, solution architecture, cloud engineering, and advanced machine learning, including LLMs and Generative AI.`;

export const experience: Experience[] = [
  {
    company: "C3 AI",
    location: "London, United Kingdom",
    roles: [
      {
        title: "Senior Engagement Manager",
        period: "June 2024 – Present",
        description: "Responsible for the rollout and adoption of an AI-enabled Predictive Maintenance application for a Swiss building materials manufacturer, spanning over 100 plants, 2,000+ end users, and a total contract value exceeding $10M.",
        bullets: [
          "Partnered with cross-functional teams, including Product and Sales, to craft value-driven use cases, translating them into technical and functional requirements, detailed specifications, and actionable project plans.",
          "Expanded relationships by identifying new use cases and incremental staffing needs.",
          "Defined scope, requirements, timelines, and success metrics for projects, emphasizing customer self-sufficiency on the platform.",
          "Led project governance activities, including project planning, weekly reviews, cross-functional meetings, and executive status reports, ensuring alignment and transparency throughout project lifecycles.",
          "Directed all implementation activities, supervising teams across Application Development, Data Integration, Data Science, QA, and DevOps to ensure timely and successful delivery.",
          "Established trusted advisor relationships with clients, tracking and mitigating risks to maintain high customer satisfaction (CSAT) consistently achieving NPS Score >70.",
          "Played a key role in recruiting and attracting top talent to build a strong, client-focused services team.",
        ],
      },
      {
        title: "Engagement Manager",
        period: "August 2021 – May 2024",
        description: "Led strategic initiatives across all Business Units and Partners, managing program with a $15M budget and reporting directly to the VP of Customer Services.",
        bullets: [],
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
        description: "Grew Deloitte UK's Anaplan practice from inception to 25+ practitioners, leading the first enterprise-wide deployment for a large British telco.",
        bullets: [],
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
        bullets: [],
      },
    ],
  },
  {
    company: "Codec",
    location: "Dublin, Ireland",
    roles: [
      {
        title: "Consultant",
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
  { value: "14+", label: "years in tech" },
  { value: "$15M", label: "programme led" },
  { value: "100+", label: "plants deployed" },
  { value: "NPS >70", label: "satisfaction" },
  { value: "2,000+", label: "end users" },
  { value: "5", label: "countries" },
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
