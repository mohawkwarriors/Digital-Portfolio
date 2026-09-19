import { Profile, ExperienceFlowNode, Project, SkillCategory, SectionConfig } from '../types';

export const initialProfile: Profile = {
  name: "Mohammed Saahir Essa",
  title: "Product Design Engineer",
  tagline: "Designing high-volume consumer hardware from ID concept through mass production",
  footerText: "Precision enclosures, kinematic mechanisms, Class-A surfacing, and EVT/DVT manufacturing.",
  bio: "Product Design Engineer  with 5+ years of experience bringing  consumer  products to market including the Pixel 8 and 10 Pro. Experienced in complex CAD modeling, DFM/DFA, and supporting on-site factory NPI builds.",
  location: "San Francisco Bay Area, CA",
  timezone: "",
  email: "saahiressa@gmail.com",
  phone: "281-736-3568",
  github: "https://github.com",
  linkedin: "https://www.linkedin.com/in/mohammedessa/",
  resumeUrl: "/resume.pdf",
  twitter: "https://x.com",
  avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop",
  availableForHire: false,
  statusBadge: "HW Product Design Engineer",
  stats: [
    {
      label: "MP Projects",
      value: "3"
    },
    {
      label: "New, Unique, Different, and Difficult (NUDDs) Launched",
      value: "6+"
    }
  ]
};

export const initialExperienceNodes: ExperienceFlowNode[] = [
  {
    id: "role-1789527740378-0aynf",
    company: "Google",
    companyLogoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/3840px-Google_2015_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail",
    location: "San Francisco Bay Area, CA",
    role: "Next Gen Pixel",
    period: "Present",
    imageLayout: "portrait-right",
    startYear: 2026,
    endYear: "Present",
    highlights: [
      "Led rear camera hardware integration by engineering a unified bracket structure, enhancing thermal dissipation, structural integrity, and EMI mitigation within a more compact form factor",
      "Expanded battery capacity by 140mAh by championing the integration of advanced cell chemistry and an innovative pack architecture, delivering Pixel’s top battery energy density by volume",
      "Developed a next-generation battery serviceability architecture featuring a robust interface to streamline end-user repairs",
      "Generated $1.2 million in lifetime savings through module standardization, upstream assembly integration, and qualification of alternate thermal materials"
    ],
    status: "current",
    summary: ""
  },
  {
    id: "role-1789527673317-u2g0b",
    company: "Google",
    companyLogoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/3840px-Google_2015_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail",
    location: "San Francisco Bay Area, CA",
    role: "Pixel 10 Pro",
    period: "2025",
    imageUrl: "https://www.gizmochina.com/wp-content/uploads/2025/08/PixelCamera_PixelCamera-1.gif?x96852",
    imageLayout: "portrait-right",
    startYear: 2025,
    endYear: 2025,
    highlights: [
      "Designed the lower device architecture including speaker, haptics, 3 jumper flexes, a PCBA, USB-C, and microphone-barometric port, redesigning the architecture to enable a 100mAh battery increase",
      "Elevated external aesthetics by designing a cost-effective metal mesh for the bottom acoustic ports",
      "Unified the Pixel 10 and 10 Pro chin design to standardized components and assembly fixtures, leverage economies of scale and driving $1.5 million in CapEx and piece-part cost savings"
    ],
    status: "completed",
    summary: ""
  },
  {
    id: "exp-1789343069033",
    company: "Google",
    companyLogoUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/3840px-Google_2015_logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail",
    location: "San Francisco Bay Area, CA",
    role: "Pixel 8",
    period: "2023",
    imageUrl: "https://stratanetworks.com/wp-content/uploads/2023/12/Google-8-Hazel.png",
    imageLayout: "portrait-right",
    startYear: 2023,
    endYear: 2023,
    highlights: [
      "Designed PCBA mechanical architecture through custom and off-the-shelf parts to achieve the required EMI, antenna, and thermal requirements while optimizing the design to meet Google, T-Mobile Phablet, and AT&T RASS reliability standards",
      "Owned enclosure assembly and 6 system configurations for RF, battery, and carrier testing",
      "Drove $1.4 million in cost savings by standardizing internal die-cuts, validating cost-effective materials, and consolidating multi-piece stacks to optimize FATP assembly"
    ],
    status: "completed",
    summary: ""
  },
  {
    id: "role-1789621261802-hvise",
    company: "Culture Biosciences",
    companyLogoUrl: "https://ml.globenewswire.com/Resource/Download/ce8c1148-eecd-40b0-b1b7-f858ab8c3c4f",
    companyLogoInvertInDark: true,
    companyLogoContrast: "invert-in-dark",
    location: "South San Francisco, CA",
    role: "Lead mechanical engineer for R&D 250L pilot scale bioreactor",
    period: "2021-2022",
    imageLayout: "portrait-right",
    startYear: 2021,
    endYear: 2022,
    highlights: [
      "Defined project scope, managed risk-adjusted timelines, and directed cross-functional team execution to successfully achieve quarterly milestones",
      "Engineered single-use, USP Class VI and FDA food-safe injection-molded plastics to ensure sterility, watertight sealing, and autoclave compatibility; integrating them with reusable fixtures and equipment",
      "Owned mechanical subsystems integration including thermal, gas sparging, and exhaust; balancing custom part design with off-the-shelf components to be cost effective"
    ],
    status: "completed",
    summary: ""
  },
  {
    id: "exp-1789343187098",
    company: "Culture Biosciences",
    companyLogoUrl: "https://ml.globenewswire.com/Resource/Download/ce8c1148-eecd-40b0-b1b7-f858ab8c3c4f",
    companyLogoInvertInDark: true,
    companyLogoContrast: "invert-in-dark",
    location: "South San Francisco, CA",
    role: "Developed custom electronic devices to improve safety and efficiency in biological labs",
    period: "2021 –2022",
    imageLayout: "portrait-right",
    startYear: 2021,
    endYear: 2022,
    highlights: [
      "Designed an ergonomic hand held device with IP43 equivalent protection for lab techs to individually control 6 peristaltic pumps delivering fluid into 250mL and 5L bioreactors with 0.5 mL accuracy",
      "Fabricated two different mountable enclosures to monitor acceleration, temperature, light, and humidity of labs and equipment such as refrigerators, gas cylinders, cell culture incubators"
    ],
    status: "completed",
    summary: ""
  }
];

export const initialProjects: Project[] = [
  {
    id: "proj-1",
    title: "Senior Design Capstone Project",
    tagline: "Semi-Automated seeding Machine for Dream Harvest Farms",
    category: "Consumer Hardware",
    description: "Developed a Semi-Automated device to plant seeds from 2mm to 15mm using suction pressure for under $800. Optimized for small-scale hydroponics farming, reducing overall seeding time by 60% and decreasing the required number of human operators from 5 down to 1.",
    architectureOverview: "Constructed with die-cast AZ91D magnesium yokes, CNC 6063 aluminum earcups, and dual-injection acoustic baffle plates with silicone damping rings. Features concealed 4-axis friction hinges with internal FPC wire routing.",
    challengesSolved: [
      "Engineered a concealed friction hinge with integrated rotational stops, preventing internal 18-conductor FPC cable fatigue over 75,000 cycles",
      "Optimized internal acoustic ear-cup air volume within ±1.5% part-to-part variance across multi-cavity tooling",
      "Eliminated user clamping pressure hotspots by developing an ergonomic memory-foam headband arch based on anthropometric 3D scan data"
    ],
    metrics: [
      {
        label: "Total Weight",
        value: "238 grams"
      },
      {
        label: "Hinge Fatigue Life",
        value: "75,000 Cycles"
      },
      {
        label: "Acoustic Seal",
        value: "-32 dB Passive"
      }
    ],
    techStack: [],
    links: [
      {
        label: "Company Website",
        url: "https://dreamharvestfarms.com"
      },
      {
        label: "Product Specification & CAD",
        url: "https://example.com/hardware/aura-one"
      }
    ],
    liveUrl: "https://example.com/hardware/aura-one",
    githubUrl: "https://github.com/example/aura-headset-specs",
    featured: true,
    imageUrl: "https://lh7-us.googleusercontent.com/sitesv-images-rt/AMxu72vsS6gRfKovwOkCI6vCUsLFx2JjE0nEAoZylsn-0-tOFbQFvqlCbDK43ypt2PxF2wskbUoBICR0rJfz3Rc_inDuY9TInz7oYqRtb1B2OinYW6cyqCkZbGcI5E7NGI1i2IePmE9mpbp6qKt32-yLSwrtl2jlGIGzIV77kDIM8-Z41_0lyWrfyxH4OykPT6PjkJ2Z9NSmld_VF1uQgBbaQQvL_3QVnx742SBRcBew=w1280",
    images: [
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?q=80&w=1000&auto=format&fit=crop"
    ]
  }
];

export const initialSkills: SkillCategory[] = [
  {
    name: "Design",
    skills: [
      {
        name: "Siemens NX",
        highlighted: true
      },
      {
        name: "Fusion 360",
        highlighted: true
      },
      {
        name: "Onshape",
        highlighted: true
      },
      {
        name: "Inventor"
      },
      {
        name: "GD&T"
      },
      {
        name: "Design For Manufacturing / Assembly",
        highlighted: true
      }
    ]
  },
  {
    name: "Manufacturing",
    skills: [
      {
        name: "Injection Molding",
        highlighted: true
      },
      {
        name: "Vacuum Forming",
        highlighted: false
      },
      {
        name: "Die Casting (ZA alloy)",
        highlighted: true
      },
      {
        name: "Sheet Metal Stamping",
        highlighted: true
      },
      {
        name: "CNC Machining",
        highlighted: true
      },
      {
        name: "Diecut",
        highlighted: true
      },
      {
        name: "Liquid Silicone Resin Overmolding"
      },
      {
        name: "PCBA",
        highlighted: true
      }
    ]
  },
  {
    name: "Analysis",
    skills: [
      {
        name: "Failure Mode and Effects Analysis (FMEA)",
        highlighted: true
      },
      {
        name: "Tolerance Analysis",
        highlighted: true
      },
      {
        name: "JMP / Matlab Data Analysis"
      }
    ]
  },
  {
    name: "Product Development",
    skills: [
      {
        name: "BOM Management",
        highlighted: true
      },
      {
        name: "Program Timeline Development",
        highlighted: true
      },
      {
        name: "Excel/Google Sheets Macro & VBA"
      },
      {
        name: "Cross Functional Collaboration ",
        highlighted: true
      }
    ]
  }
];

export const initialSections: SectionConfig[] = [
  {
    id: "hero",
    type: "hero",
    title: "Profile",
    visible: true,
    order: 0
  },
  {
    id: "experience",
    type: "experience",
    title: "Experience",
    visible: true,
    order: 1
  },
  {
    id: "projects",
    type: "projects",
    title: "Projects",
    visible: true,
    order: 2
  },
  {
    id: "skills",
    type: "skills",
    title: "Skills",
    visible: true,
    order: 3
  }
];
