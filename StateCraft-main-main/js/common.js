/**
 * StateCraft - Common Utilities and API Client
 */

const STATECRAFT_API_BASE = window.location.origin.startsWith('http') 
  ? window.location.origin 
  : 'http://localhost:8000';

const CRITERIA_METADATA = {
  education: {
    title: 'Education',
    icon: '🎓',
    color: '#6366F1',
    description: 'Literacy rates, educational institutions, higher education enrolment, and school infrastructure.'
  },
  healthcare: {
    title: 'Healthcare',
    icon: '🏥',
    color: '#10B981',
    description: 'NITI Health index, medical facilities, institutional deliveries, infant mortality, and doctor ratios.'
  },
  infrastructure: {
    title: 'Infrastructure',
    icon: '⚡',
    color: '#0EA5E9',
    description: 'Road & highway network, airports, ports, power transmission, and modern transit grids.'
  },
  population: {
    title: 'Population',
    icon: '👥',
    color: '#A855F7',
    description: 'Demographic density, urbanization, welfare distribution systems, and youth dividend.'
  },
  industrial_development: {
    title: 'Industrial Development',
    icon: '🏭',
    color: '#F59E0B',
    description: 'Manufacturing output, ease of doing business, export hubs, tech parks, and SEZs.'
  },
  law_enforcement: {
    title: 'Law Enforcement',
    icon: '🛡️',
    color: '#3B82F6',
    description: 'Public safety index, police personnel per lakh, emergency response, and cybercrime defense.'
  },
  per_capita: {
    title: 'Per Capita Income',
    icon: '💰',
    color: '#EC4899',
    description: 'Net State Domestic Product (NSDP) per capita, household prosperity, and wage growth.'
  },
  state_debt: {
    title: 'State Debt',
    icon: '📊',
    color: '#F43F5E',
    description: 'Debt-to-GSDP liabilities, fiscal deficit prudential limits, and sovereign borrowing health.'
  }
};

/**
 * Round 2: 10 Mystery Policies Per Sector (Governance Topic)
 * Structure for all sectors:
 * - Exactly 4 policies that increase the efficiency of that particular sector.
 * - Exactly 6 policies that belong to a different sector.
 * - Admin can open any number of boxes.
 * - The policies are consistent for all states.
 */
const ROUND2_MYSTERY_POLICIES = {
  education: [
    {
      id: "edu_box_1",
      title: "Smart Pedagogical Overhaul & AI Classrooms",
      type: "efficiency_boost",
      targetCriterion: "education",
      criteriaPointsChange: 18,
      teamPointsChange: 40,
      description: "Statewide installation of digital smart boards, high-speed school Wi-Fi, and adaptive learning software boosts STEM literacy and reduces secondary dropouts."
    },
    {
      id: "edu_box_2",
      title: "Universal Girls Scholarship & STEM Fellowship Accord",
      type: "efficiency_boost",
      targetCriterion: "education",
      criteriaPointsChange: 16,
      teamPointsChange: 35,
      description: "Direct cash transfer endowments and guaranteed university seats for female scholars drive state Higher Education GER to top national decile."
    },
    {
      id: "edu_box_3",
      title: "State Teacher Training Academy & Pedagogical Accreditation",
      type: "efficiency_boost",
      targetCriterion: "education",
      criteriaPointsChange: 15,
      teamPointsChange: 30,
      description: "Continuous teacher upskilling, peer lesson evaluations, and digital certifications upgrade instructional quality across all government schools."
    },
    {
      id: "edu_box_4",
      title: "Vocational Innovation Hubs & Polytechnic Modernization",
      type: "efficiency_boost",
      targetCriterion: "education",
      criteriaPointsChange: 14,
      teamPointsChange: 30,
      description: "Dual-apprenticeship curricula co-designed with top industries transform district polytechnics into world-class technical talent hubs."
    },
    {
      id: "edu_box_5",
      title: "District Medical College Teaching Hospital Grid",
      type: "external_sector",
      targetCriterion: "healthcare",
      criteriaPointsChange: 15,
      teamPointsChange: 25,
      description: "Attaching teaching hospitals to district medical colleges upgrades emergency patient beds, surgical capacity, and rural clinical rotations."
    },
    {
      id: "edu_box_6",
      title: "High-Speed School Transit Corridor & Electric Bus Fleet",
      type: "external_sector",
      targetCriterion: "infrastructure",
      criteriaPointsChange: 14,
      teamPointsChange: 20,
      description: "Dedicated electric bus corridors for student commute expand rural road connectivity, safety barriers, and bridge crossings."
    },
    {
      id: "edu_box_7",
      title: "University-Industry Deep-Tech Incubator & Patent Sandbox",
      type: "external_sector",
      targetCriterion: "industrial_development",
      criteriaPointsChange: 14,
      teamPointsChange: 25,
      description: "Venture incubation programs for engineering graduates accelerate regional tech startups and commercialization of domestic hardware."
    },
    {
      id: "edu_box_8",
      title: "Vocational Apprentice Stipends & Formal Skill Credits",
      type: "external_sector",
      targetCriterion: "per_capita",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Direct monthly stipends for technical apprentices enhance disposable household earnings for youth entering the formal workforce."
    },
    {
      id: "edu_box_9",
      title: "Youth Digital Ethics Patrols & School Cyber Safety",
      type: "external_sector",
      targetCriterion: "law_enforcement",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Community policing programs and school digital safety taskforces sharply reduce juvenile cyber delinquency and street harassment."
    },
    {
      id: "edu_box_10",
      title: "Unfunded Universal Electronics Freebie Deficit",
      type: "external_sector",
      targetCriterion: "state_debt",
      criteriaPointsChange: -16,
      teamPointsChange: -15,
      description: "Unplanned off-budget borrowing to distribute consumer electronics strains sovereign borrowing limits and treasury cash flows."
    }
  ],

  healthcare: [
    {
      id: "health_box_1",
      title: "Universal District Multi-Specialty Hospital Grid",
      type: "efficiency_boost",
      targetCriterion: "healthcare",
      criteriaPointsChange: 18,
      teamPointsChange: 40,
      description: "Construction of 100-bed tertiary trauma centers across all districts brings expert cardiac, neonatal, and oncology care to rural doorsteps."
    },
    {
      id: "health_box_2",
      title: "Subsidized Generic Medicine & Tele-ICU Network",
      type: "efficiency_boost",
      targetCriterion: "healthcare",
      criteriaPointsChange: 16,
      teamPointsChange: 35,
      description: "Round-the-clock remote critical care diagnosis and zero-markup state drug dispensaries slash out-of-pocket household medical expenditure."
    },
    {
      id: "health_box_3",
      title: "Primary Health Center Digitalization & Diagnostic Hubs",
      type: "efficiency_boost",
      targetCriterion: "healthcare",
      criteriaPointsChange: 15,
      teamPointsChange: 30,
      description: "Automated pathology testing machines and electronic health records deployed across all village clinics ensure same-day diagnostics."
    },
    {
      id: "health_box_4",
      title: "Maternal & Child Intensive Nutrition Mission",
      type: "efficiency_boost",
      targetCriterion: "healthcare",
      criteriaPointsChange: 14,
      teamPointsChange: 30,
      description: "Fortified micro-nutrient ration packages and home-visiting clinical midwives eliminate severe acute malnutrition in infants."
    },
    {
      id: "health_box_5",
      title: "Medical University Nursing & Paramedic Colleges",
      type: "external_sector",
      targetCriterion: "education",
      criteriaPointsChange: 14,
      teamPointsChange: 25,
      description: "State-funded paramedical colleges produce 12,000 certified healthcare professionals annually, expanding tertiary higher education."
    },
    {
      id: "health_box_6",
      title: "Emergency Air Ambulance Heliports & Expressway Corridors",
      type: "external_sector",
      targetCriterion: "infrastructure",
      criteriaPointsChange: 14,
      teamPointsChange: 20,
      description: "Dedicated green corridors and district hospital helipads accelerate emergency transit and regional logistics access."
    },
    {
      id: "health_box_7",
      title: "MedTech & Bio-Pharmaceutical Manufacturing Cluster",
      type: "external_sector",
      targetCriterion: "industrial_development",
      criteriaPointsChange: 15,
      teamPointsChange: 25,
      description: "Tax-exempt biomedical manufacturing parks attract global syringe, surgical instrument, and diagnostics manufacturers."
    },
    {
      id: "health_box_8",
      title: "Preventive Care Out-of-Pocket Savings Dividend",
      type: "external_sector",
      targetCriterion: "per_capita",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Free public health clinics eliminate catastrophic medical debt, boosting net disposable income for working-class families."
    },
    {
      id: "health_box_9",
      title: "Food Safety & Spurious Drug Anti-Counterfeiting Taskforce",
      type: "external_sector",
      targetCriterion: "law_enforcement",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Aggressive joint raids by drug inspectors and police dismantle illicit counterfeit medicine rings across inter-state borders."
    },
    {
      id: "health_box_10",
      title: "Uncapped Private Hospital Insurance Claim Liabilities",
      type: "external_sector",
      targetCriterion: "state_debt",
      criteriaPointsChange: -18,
      teamPointsChange: -15,
      description: "Uncapped reimbursements for private corporate hospital billing trigger severe treasury deficits and emergency cash rationing."
    }
  ],

  infrastructure: [
    {
      id: "infra_box_1",
      title: "Dedicated Freight Corridors & Multi-Modal Logistics Parks",
      type: "efficiency_boost",
      targetCriterion: "infrastructure",
      criteriaPointsChange: 18,
      teamPointsChange: 40,
      description: "High-capacity railway cargo arteries and automated warehousing hubs cut industrial transit times by 40%."
    },
    {
      id: "infra_box_2",
      title: "Greenfield Regional Airports & Smart Renewable Supergrid",
      type: "efficiency_boost",
      targetCriterion: "infrastructure",
      criteriaPointsChange: 16,
      teamPointsChange: 35,
      description: "Three tier-2 regional airports and a synchronized solar-wind transmission grid guarantee 24/7 uninterrupted power for industry."
    },
    {
      id: "infra_box_3",
      title: "Expressway Paving & Bridge Resilience Program",
      type: "efficiency_boost",
      targetCriterion: "infrastructure",
      criteriaPointsChange: 15,
      teamPointsChange: 30,
      description: "Four-laning of 2,400 km of state highways with all-weather concrete overpasses eliminates bottleneck delays."
    },
    {
      id: "infra_box_4",
      title: "Deep-Draft Port Cargo Terminals & Waterway Barging",
      type: "efficiency_boost",
      targetCriterion: "infrastructure",
      criteriaPointsChange: 14,
      teamPointsChange: 30,
      description: "Automated container terminals and dredged inland waterways enhance container throughput and export turnaround speeds."
    },
    {
      id: "infra_box_5",
      title: "Heavy Industry Logistics & Port-Linked Special Zones",
      type: "external_sector",
      targetCriterion: "industrial_development",
      criteriaPointsChange: 15,
      teamPointsChange: 25,
      description: "Direct rail sidings into automotive and chemical manufacturing clusters attract ₹14,000 Cr in fresh capital investments."
    },
    {
      id: "infra_box_6",
      title: "High-Speed Fiber-Optic Rural School Connectivity",
      type: "external_sector",
      targetCriterion: "education",
      criteriaPointsChange: 13,
      teamPointsChange: 20,
      description: "State-wide broadband laying brings gigabit internet to 18,000 village schools, enabling remote virtual teaching."
    },
    {
      id: "infra_box_7",
      title: "Clean Tap Water Grids & Underground Sewage Treatment",
      type: "external_sector",
      targetCriterion: "healthcare",
      criteriaPointsChange: 14,
      teamPointsChange: 25,
      description: "Piped filtered drinking water networks and modern drainage systems eliminate seasonal water-borne cholera outbreaks."
    },
    {
      id: "infra_box_8",
      title: "Expressway Economic Corridor Commercial Hubs",
      type: "external_sector",
      targetCriterion: "per_capita",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Wayside food courts, logistics warehouses, and retail plazas along new highways create 45,000 permanent service jobs."
    },
    {
      id: "infra_box_9",
      title: "Integrated Highway Patrol & Smart Speed Trap Grids",
      type: "external_sector",
      targetCriterion: "law_enforcement",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Automated number-plate recognition cameras and dedicated emergency patrol cruisers reduce highway fatalities by 30%."
    },
    {
      id: "infra_box_10",
      title: "High-Coupon Infrastructure Bonds Strain State Treasury",
      type: "external_sector",
      targetCriterion: "state_debt",
      criteriaPointsChange: -17,
      teamPointsChange: -15,
      description: "Expensive market borrowing and guaranteed tollway revenue shortfalls create massive sovereign bond servicing liabilities."
    }
  ],

  industrial_development: [
    {
      id: "ind_box_1",
      title: "Semiconductor & Advanced Robotics Megapark Hub",
      type: "efficiency_boost",
      targetCriterion: "industrial_development",
      criteriaPointsChange: 18,
      teamPointsChange: 40,
      description: "Plug-and-play cleanroom parks with dedicated water treatment and fast-track customs turn the state into a premier electronics node."
    },
    {
      id: "ind_box_2",
      title: "Single-Window Clearances & Zero-Red-Tape Regulatory Code",
      type: "efficiency_boost",
      targetCriterion: "industrial_development",
      criteriaPointsChange: 16,
      teamPointsChange: 35,
      description: "Statutory 7-day business licensing, automated environmental clearances, and factory digitizations elevate Ease of Doing Business rankings."
    },
    {
      id: "ind_box_3",
      title: "Defense & Aerospace Manufacturing Corridor",
      type: "efficiency_boost",
      targetCriterion: "industrial_development",
      criteriaPointsChange: 15,
      teamPointsChange: 30,
      description: "Specialized testing ranges, titanium forging hubs, and aerospace testing laboratories draw major defense conglomerates."
    },
    {
      id: "ind_box_4",
      title: "MSME Capital Subsidy & Export Credit Guarantee",
      type: "efficiency_boost",
      targetCriterion: "industrial_development",
      criteriaPointsChange: 14,
      teamPointsChange: 30,
      description: "Subsidized term loans and export freight vouchers empower 25,000 local manufacturing units to sell to international buyers."
    },
    {
      id: "ind_box_5",
      title: "High-Wage Industrial Manufacturing Payroll Expansion",
      type: "external_sector",
      targetCriterion: "per_capita",
      criteriaPointsChange: 15,
      teamPointsChange: 25,
      description: "Creation of 120,000 precision engineering and assembly jobs pushes average industrial shopfloor wages up by 28%."
    },
    {
      id: "ind_box_6",
      title: "Captive Industrial Microgrids & Heavy Cargo Access Roads",
      type: "external_sector",
      targetCriterion: "infrastructure",
      criteriaPointsChange: 13,
      teamPointsChange: 20,
      description: "Private-public industrial park road networks and dedicated substations strengthen regional utility assets."
    },
    {
      id: "ind_box_7",
      title: "Corporate Apprenticeship Labs in Technical Universities",
      type: "external_sector",
      targetCriterion: "education",
      criteriaPointsChange: 13,
      teamPointsChange: 20,
      description: "Multinational firms fund advanced research chairs and robotics labs in government engineering colleges."
    },
    {
      id: "ind_box_8",
      title: "Mandatory Occupational Safety & Factory Air Scrubbers",
      type: "external_sector",
      targetCriterion: "healthcare",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Strict compliance standards for industrial air emission filters reduce factory-floor toxic exposures and chronic asthma."
    },
    {
      id: "ind_box_9",
      title: "Industrial Security Taskforce & Cargo Theft Defense",
      type: "external_sector",
      targetCriterion: "law_enforcement",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Dedicated industrial police precincts eliminate extortion rackets and safeguard freight logistics corridors."
    },
    {
      id: "ind_box_10",
      title: "Decade-Long Corporate Tax Holidays Drain State Coffers",
      type: "external_sector",
      targetCriterion: "state_debt",
      criteriaPointsChange: -15,
      teamPointsChange: -12,
      description: "Overly generous zero-tax incentives for conglomerates cost ₹5,800 Cr in annual forgone revenues, deepening public debt."
    }
  ],

  population: [
    {
      id: "pop_box_1",
      title: "Direct Benefit Nutrition & Maternal Dignity Mission",
      type: "efficiency_boost",
      targetCriterion: "population",
      criteriaPointsChange: 18,
      teamPointsChange: 40,
      description: "Biometrically authenticated monthly welfare transfers for expectant mothers and children reduce severe stunting to historic lows."
    },
    {
      id: "pop_box_2",
      title: "Urban Affordable Housing & Pucca Tenement Drive",
      type: "efficiency_boost",
      targetCriterion: "population",
      criteriaPointsChange: 16,
      teamPointsChange: 35,
      description: "Delivery of 85,000 seismic-safe multi-story flats equipped with tap water and sanitation drastically upgrades slum living conditions."
    },
    {
      id: "pop_box_3",
      title: "Senior Citizen Social Security & Universal Pension System",
      type: "efficiency_boost",
      targetCriterion: "population",
      criteriaPointsChange: 15,
      teamPointsChange: 30,
      description: "Guaranteed monthly non-contributory pensions for elderly residents ensure dignified livelihood security across all villages."
    },
    {
      id: "pop_box_4",
      title: "Women Self-Help Group Enterprise & Micro-Financing Network",
      type: "efficiency_boost",
      targetCriterion: "population",
      criteriaPointsChange: 14,
      teamPointsChange: 30,
      description: "Zero-interest micro-credit to 500,000 women-led SHGs empowers grassroots rural entrepreneurship and community self-reliance."
    },
    {
      id: "pop_box_5",
      title: "Universal Immunization & Community Health Worker Network",
      type: "external_sector",
      targetCriterion: "healthcare",
      criteriaPointsChange: 15,
      teamPointsChange: 25,
      description: "ASHA worker door-to-door checkups increase infant immunization coverage to 96% statewide."
    },
    {
      id: "pop_box_6",
      title: "Anganwadi Early Childhood Learning Upgradation",
      type: "external_sector",
      targetCriterion: "education",
      criteriaPointsChange: 14,
      teamPointsChange: 25,
      description: "Equipping 24,000 rural childcare centers with age-appropriate Montessori toys and cognitive learning tools boosts primary school readiness."
    },
    {
      id: "pop_box_7",
      title: "Rural Livelihood Mission & Farm-to-Market Collectives",
      type: "external_sector",
      targetCriterion: "per_capita",
      criteriaPointsChange: 13,
      teamPointsChange: 20,
      description: "Village collective packaging units enable smallholder farmers to capture 35% higher retail margins for produce."
    },
    {
      id: "pop_box_8",
      title: "Decentralized Village Solar Drinking Water Mini-Grids",
      type: "external_sector",
      targetCriterion: "infrastructure",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Off-grid solar purification units installed in remote hamlets ensure clean drinking water during severe summer heatwaves."
    },
    {
      id: "pop_box_9",
      title: "Community Vigilance Committees & Anti-Domestic Violence Units",
      type: "external_sector",
      targetCriterion: "law_enforcement",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Dedicated women-led village counseling stations settle family disputes and curb gender-based crimes peacefully."
    },
    {
      id: "pop_box_10",
      title: "Unconditional Universal Cash Handouts Swallow Budget",
      type: "external_sector",
      targetCriterion: "state_debt",
      criteriaPointsChange: -18,
      teamPointsChange: -15,
      description: "Open-ended universal cash grants without productive asset creation consume nearly a quarter of state tax receipts, spiking public borrowing."
    }
  ],

  law_enforcement: [
    {
      id: "law_box_1",
      title: "Integrated AI Command Center & Dial 112 Rapid Dispatch",
      type: "efficiency_boost",
      targetCriterion: "law_enforcement",
      criteriaPointsChange: 18,
      teamPointsChange: 40,
      description: "Statewide automated vehicle locator fleets and AI predictive analytics drop average emergency police response time under 7 minutes."
    },
    {
      id: "law_box_2",
      title: "Specialized Cyber Defense & Financial Fraud Recovery Unit",
      type: "efficiency_boost",
      targetCriterion: "law_enforcement",
      criteriaPointsChange: 16,
      teamPointsChange: 35,
      description: "Modernized cyber forensics laboratories in all district headquarters freeze and recover ₹520 Cr in digital bank and crypto extortion."
    },
    {
      id: "law_box_3",
      title: "Community Policing & Women Safety Fast-Track Cells",
      type: "efficiency_boost",
      targetCriterion: "law_enforcement",
      criteriaPointsChange: 15,
      teamPointsChange: 30,
      description: "All-women rapid reaction mobile squads and special courts for speedy trials of assault cases boost public safety and reporting."
    },
    {
      id: "law_box_4",
      title: "Police Modernization, Body-Worn Cameras & Forensic Labs",
      type: "efficiency_boost",
      targetCriterion: "law_enforcement",
      criteriaPointsChange: 14,
      teamPointsChange: 30,
      description: "High-definition forensic ballistics and mandatory body-worn cameras ensure transparent evidence gathering and conviction rate surge."
    },
    {
      id: "law_box_5",
      title: "Safe Commerce Corridor & Anti-Extortion Shield",
      type: "external_sector",
      targetCriterion: "industrial_development",
      criteriaPointsChange: 14,
      teamPointsChange: 25,
      description: "Zero-tolerance crackdown on illicit mining mafias and trade union intimidation restores confidence among factory investors."
    },
    {
      id: "law_box_6",
      title: "Smart Traffic Management & Expressway Surveillance",
      type: "external_sector",
      targetCriterion: "infrastructure",
      criteriaPointsChange: 13,
      teamPointsChange: 20,
      description: "Automated traffic signal synchronization reduces gridlock bottlenecks across metropolitan arterial ring roads."
    },
    {
      id: "law_box_7",
      title: "Anti-Narcotics Campus Taskforce & Youth Rehabilitation",
      type: "external_sector",
      targetCriterion: "education",
      criteriaPointsChange: 13,
      teamPointsChange: 20,
      description: "Inter-departmental anti-substance raids shield college campuses from illicit drug networks, restoring academic discipline."
    },
    {
      id: "law_box_8",
      title: "Organized Counterfeit & Piracy Clampdown",
      type: "external_sector",
      targetCriterion: "per_capita",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Shutting down rogue grey-market smuggling syndicates protects legitimate retailers and raises tax-paying merchant incomes."
    },
    {
      id: "law_box_9",
      title: "Trauma Quick-Response Highway Evacuation Squads",
      type: "external_sector",
      targetCriterion: "healthcare",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Trained police emergency medical responders provide golden-hour stabilization to highway crash victims before hospital arrival."
    },
    {
      id: "law_box_10",
      title: "High-End Armored Surveillance Procurement Spikes Debt",
      type: "external_sector",
      targetCriterion: "state_debt",
      criteriaPointsChange: -14,
      teamPointsChange: -10,
      description: "Multi-million dollar imports of surveillance gear and armored assault cruisers push home department expenditures far over approved ceilings."
    }
  ],

  per_capita: [
    {
      id: "pc_box_1",
      title: "Fintech Micro-Credit & Rural Artisan Export Accelerator",
      type: "efficiency_boost",
      targetCriterion: "per_capita",
      criteriaPointsChange: 18,
      teamPointsChange: 40,
      description: "Collateral-free low-interest working capital loans and global e-commerce onboarding boost rural household incomes by 22%."
    },
    {
      id: "pc_box_2",
      title: "Tier-2 Tech Incubation & High-Value Knowledge Centers",
      type: "efficiency_boost",
      targetCriterion: "per_capita",
      criteriaPointsChange: 16,
      teamPointsChange: 35,
      description: "Decentralized software parks and freelancing co-working hubs generate 60,000 high-salary knowledge worker positions in secondary towns."
    },
    {
      id: "pc_box_3",
      title: "Agro-Processing Cooperatives & Cold Chain Remuneration",
      type: "efficiency_boost",
      targetCriterion: "per_capita",
      criteriaPointsChange: 15,
      teamPointsChange: 30,
      description: "Modernized food processing centers eliminate middleman margins, enabling farmers to command 40% higher realization on cash crops."
    },
    {
      id: "pc_box_4",
      title: "Urban Gig Worker Wage Floor & Social Benefit Shield",
      type: "efficiency_boost",
      targetCriterion: "per_capita",
      criteriaPointsChange: 14,
      teamPointsChange: 30,
      description: "A statutory minimum hourly payout and portable health cover for gig delivery riders protect baseline living wages."
    },
    {
      id: "pc_box_5",
      title: "Export Manufacturing Demand & Consumer Spending Surge",
      type: "external_sector",
      targetCriterion: "industrial_development",
      criteriaPointsChange: 15,
      teamPointsChange: 25,
      description: "Higher consumer purchasing power stimulates strong domestic retail demand for locally produced consumer electronics and vehicles."
    },
    {
      id: "pc_box_6",
      title: "Household Tuition Affordability & Higher Education Enrolment",
      type: "external_sector",
      targetCriterion: "education",
      criteriaPointsChange: 13,
      teamPointsChange: 20,
      description: "Higher household disposable income allows families to invest in professional degrees and engineering certifications for their children."
    },
    {
      id: "pc_box_7",
      title: "Nutritious Food Access & Reduced Dietary Deficiencies",
      type: "external_sector",
      targetCriterion: "healthcare",
      criteriaPointsChange: 13,
      teamPointsChange: 20,
      description: "Better household spending power enables diverse diets, significantly cutting anemia rates among adolescent girls."
    },
    {
      id: "pc_box_8",
      title: "Private Vehicle Fleet Electrification & Rooftop Solar Adoption",
      type: "external_sector",
      targetCriterion: "infrastructure",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Prosperous middle-class households invest in decentralized home solar arrays, reducing peak loads on the municipal power grid."
    },
    {
      id: "pc_box_9",
      title: "Property Crime Reduction via Higher Employment",
      type: "external_sector",
      targetCriterion: "law_enforcement",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Abundant formal employment and rising apprentice wages dramatically reduce opportunistic property theft and petty burglary."
    },
    {
      id: "pc_box_10",
      title: "Blanket Farm Debt Waivers Decimate State Credit Discipline",
      type: "external_sector",
      targetCriterion: "state_debt",
      criteriaPointsChange: -18,
      teamPointsChange: -15,
      description: "Universal agricultural debt forgiveness without revenue offsets adds ₹9,200 Cr in immediate liabilities to the state balance sheet."
    }
  ],

  state_debt: [
    {
      id: "debt_box_1",
      title: "Sovereign Debt Consolidation & Low-Cost Refinancing",
      type: "efficiency_boost",
      targetCriterion: "state_debt",
      criteriaPointsChange: 18,
      teamPointsChange: 40,
      description: "Strategic debt restructuring replaces high-interest short-term loans with 30-year multilateral bonds, reducing annual interest outflows by 30%."
    },
    {
      id: "debt_box_2",
      title: "Idle State Asset Monetization & Tax Evasion Clampdown",
      type: "efficiency_boost",
      targetCriterion: "state_debt",
      criteriaPointsChange: 16,
      teamPointsChange: 35,
      description: "Leasing unused land parcels and deploying AI audits on tax evasion yields ₹7,500 Cr in recurring non-debt revenues."
    },
    {
      id: "debt_box_3",
      title: "Automated GST Compliance & Non-Tax Royalty Recovery",
      type: "efficiency_boost",
      targetCriterion: "state_debt",
      criteriaPointsChange: 15,
      teamPointsChange: 30,
      description: "Real-time e-way bill reconciliation and mining royalty telemetry plug ₹4,200 Cr in historical revenue leakages."
    },
    {
      id: "debt_box_4",
      title: "Contributory Pension Transition & Fiscal Deficit Cap",
      type: "efficiency_boost",
      targetCriterion: "state_debt",
      criteriaPointsChange: 14,
      teamPointsChange: 30,
      description: "Transitioning new public recruits to sustainable contributory pensions ensures long-term fiscal solvency below 3% FRBM targets."
    },
    {
      id: "debt_box_5",
      title: "Self-Financing Tollways & Municipal Green Bonds",
      type: "external_sector",
      targetCriterion: "infrastructure",
      criteriaPointsChange: 14,
      teamPointsChange: 25,
      description: "High state credit ratings allow cities to float low-cost green bonds to finance ring-road expansions without debt."
    },
    {
      id: "debt_box_6",
      title: "Fiscal Stability Attracts Global Long-Term Capital",
      type: "external_sector",
      targetCriterion: "industrial_development",
      criteriaPointsChange: 14,
      teamPointsChange: 25,
      description: "Strong sovereign credit ratings reassure international pension funds and venture investors, spurring mega industrial commitments."
    },
    {
      id: "debt_box_7",
      title: "Sovereign Education Endowment Fund",
      type: "external_sector",
      targetCriterion: "education",
      criteriaPointsChange: 13,
      teamPointsChange: 20,
      description: "Interest savings from debt restructuring fund permanent annual research grants for top government universities."
    },
    {
      id: "debt_box_8",
      title: "Bulk Pharmaceutical Centralized Procurement Savings",
      type: "external_sector",
      targetCriterion: "healthcare",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Centralized state cash reserves enable upfront bulk medicine purchases at 50% discounts, securing state medicine stockpiles."
    },
    {
      id: "debt_box_9",
      title: "Low Debt Enables Rationalized Fuel & Stamp Duty Rates",
      type: "external_sector",
      targetCriterion: "per_capita",
      criteriaPointsChange: 12,
      teamPointsChange: 20,
      description: "Comfortable fiscal room allows the state to lower registration duties on first-time homes, saving middle-class families money."
    },
    {
      id: "debt_box_10",
      title: "Severe Department Budget Cuts Freeze Vehicle Procurement",
      type: "external_sector",
      targetCriterion: "law_enforcement",
      criteriaPointsChange: -12,
      teamPointsChange: -10,
      description: "Deep department spending cuts stall planned vehicle purchases and forensics equipment upgrades."
    }
  ]
};

// BroadcastChannel for instant cross-tab sync
const stateCraftChannel = typeof BroadcastChannel !== 'undefined' 
  ? new BroadcastChannel('statecraft_live_sync') 
  : null;

function broadcastStateChange(action, payload) {
  if (stateCraftChannel) {
    try {
      stateCraftChannel.postMessage({ action, payload, time: Date.now() });
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }
}

// Toast System
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} fade-in`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `
    <span style="font-weight: 800; font-size: 1.1rem;">${icon}</span>
    <div style="flex-grow: 1; font-size: 0.9rem; line-height: 1.4;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Status badge helper
function getStatusBadge(status) {
  const s = (status || 'Moderate').toLowerCase();
  if (s.includes('excellent')) return '<span class="badge badge-excellent">Excellent</span>';
  if (s.includes('good')) return '<span class="badge badge-good">Good</span>';
  if (s.includes('moderate')) return '<span class="badge badge-moderate">Moderate</span>';
  if (s.includes('needs')) return '<span class="badge badge-needs-attention">Needs Attention</span>';
  if (s.includes('critical')) return '<span class="badge badge-critical">Critical</span>';
  return `<span class="badge badge-moderate">${status}</span>`;
}

// Criteria Points Helpers (Shared between Admin & Participant portals)
function getCriterionPoints(critKey, crit) {
  if (!crit) return 65;
  if (crit.points !== undefined && !isNaN(crit.points) && crit.points !== null) {
    return Number(crit.points);
  }
  return extractInitialPointsFromCriterion(critKey, crit);
}

function extractInitialPointsFromCriterion(critKey, crit) {
  if (!crit) return 65;
  if (crit.points !== undefined && !isNaN(crit.points) && crit.points !== null) {
    return Number(crit.points);
  }

  const val = String(crit.value || '');
  const numMatch = val.match(/([0-9]+(?:\.[0-9]+)?)/);
  const num = numMatch ? parseFloat(numMatch[1]) : 65;

  switch (critKey) {
    case 'education':
      return Math.max(10, Math.min(100, Math.round((num - 50) / 0.49)));
    case 'healthcare':
      return Math.max(10, Math.min(100, Math.round((num - 35) / 0.55)));
    case 'law_enforcement':
      return Math.max(10, Math.min(100, Math.round((num - 42) / 0.52)));
    case 'state_debt':
      return Math.max(10, Math.min(100, Math.round((50 - num) / 0.38)));
    case 'per_capita': {
      const cleanNum = parseFloat(val.replace(/[^0-9]/g, '')) || 150000;
      return Math.max(10, Math.min(100, Math.round((cleanNum - 55000) / 4400)));
    }
    default:
      if (crit.status === 'Excellent') return 88;
      if (crit.status === 'Good') return 72;
      if (crit.status === 'Needs Attention') return 38;
      if (crit.status === 'Critical') return 22;
      return 60;
  }
}

function calculateStateTotalCriteriaPoints(state) {
  if (!state || !state.criteria) return 0;
  return Object.keys(CRITERIA_METADATA).reduce((sum, key) => {
    return sum + getCriterionPoints(key, state.criteria[key]);
  }, 0);
}

// API Service
const StateCraftAPI = {
  async fetchAllData() {
    try {
      const res = await fetch(`${STATECRAFT_API_BASE}/api/data`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      localStorage.setItem('statecraft_cached_data', JSON.stringify(data));
      return data;
    } catch (err) {
      console.warn('API error, using cached data fallback:', err);
      const cached = localStorage.getItem('statecraft_cached_data');
      if (cached) return JSON.parse(cached);
      throw err;
    }
  },

  async adminLogin(passcode) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });
    return await res.json();
  },

  async participantLogin(teamName, password) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/participant/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, password })
    });
    return await res.json();
  },

  async createTeam(teamData) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamData)
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('TEAM_CREATED', result.team);
    return result;
  },

  async updateTeam(teamId, teamData) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamData)
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('TEAM_UPDATED', result.team);
    return result;
  },

  async deleteTeam(teamId) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/teams/${teamId}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('TEAM_DELETED', { teamId });
    return result;
  },

  async awardPoints(teamId, pointsChange, category, reason) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/teams/${teamId}/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pointsChange, category, reason })
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('POINTS_AWARDED', { teamId, pointsChange, team: result.team });
    return result;
  },

  async updateStateCriteria(stateId, criteriaUpdates) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/states/${stateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criteriaUpdates)
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('STATE_CRITERIA_UPDATED', result.state);
    return result;
  },

  async resetDatabase() {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/reset`, {
      method: 'POST'
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('DATABASE_RESET', {});
    return result;
  },

  // Buzzer API (Round 1)
  async fetchBuzzerState() {
    try {
      const res = await fetch(`${STATECRAFT_API_BASE}/api/buzzer`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.buzzer || { enabled: false, showResults: false, round: "Round 1", buzzes: [] };
    } catch (err) {
      console.warn('Could not fetch buzzer state:', err);
      return { enabled: false, showResults: false, round: "Round 1", buzzes: [] };
    }
  },

  async toggleBuzzer(enabled) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/buzzer/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('BUZZER_TOGGLED', result.buzzer);
    return result;
  },

  async revealBuzzerOrder(showResults) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/buzzer/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showResults })
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('BUZZER_REVEALED', result.buzzer);
    return result;
  },

  async resetBuzzer(roundName) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/buzzer/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round: roundName })
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('BUZZER_RESET', result.buzzer);
    return result;
  },

  async submitBuzz(teamId) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/buzzer/buzz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId })
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('BUZZER_PRESSED', result.buzz);
    return result;
  },

  // Round 2 Mystery Box API
  async fetchRound2State() {
    try {
      const res = await fetch(`${STATECRAFT_API_BASE}/api/round2`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.round2 || { enabled: false, title: "Round 2", teamSelections: {} };
    } catch (err) {
      console.warn('Could not fetch round2 state:', err);
      return { enabled: false, title: "Round 2", teamSelections: {} };
    }
  },

  async toggleRound2(enabled) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/round2/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('ROUND2_TOGGLED', result.round2);
    return result;
  },

  async resetRound2(teamId = null, disable = false) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/round2/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, disable })
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('ROUND2_RESET', result.round2);
    return result;
  },

  async submitRound2Choice(payload) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/round2/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('ROUND2_SUBMITTED', result.selection);
    return result;
  },

  async applyRound2Impacts(teamId) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/round2/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId })
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('ROUND2_APPLIED', result.selection);
    return result;
  },

  // Infrastructure Market API
  async fetchMarketConfig() {
    try {
      const res = await fetch(`${STATECRAFT_API_BASE}/api/market/config`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch market config:', err);
      return { success: false, items: [], categories: [] };
    }
  },

  async buyInfrastructure(teamId, password, itemId) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/market/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, password, itemId })
    });
    const result = await res.json();
    if (result.success) {
      broadcastStateChange('INFRASTRUCTURE_PURCHASED', { teamId, purchase: result.purchase, team: result.team });
    }
    return result;
  },

  async updateMarketConfig(items) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/market/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('MARKET_CONFIG_UPDATED', { items });
    return result;
  },

  async resetMarket(teamId = null, refundPoints = false) {
    const res = await fetch(`${STATECRAFT_API_BASE}/api/market/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, refundPoints })
    });
    const result = await res.json();
    if (result.success) broadcastStateChange('MARKET_RESET', { teamId, refundPoints });
    return result;
  }
};

// Web Audio API Synthesizer for Zero-Dependency Buzzer Audio Feedback
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBuzzerSound(type = 'buzz') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'buzz') {
      // Powerful, energetic game-show buzzer sound
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      osc2.frequency.setValueAtTime(554.37, now);
      osc2.frequency.exponentialRampToValueAtTime(1108.73, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);
    } else if (type === 'unlock') {
      // Futuristic activation arpeggio chime
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.18, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.26);
      });
    } else if (type === 'reveal') {
      // Triumphant reveal chime
      [587.33, 739.99, 880.00].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.2, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.36);
      });
    } else if (type === 'lock') {
      // Subtle tactile click/lock
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'error') {
      // Low buzz for locked attempts
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch (err) {
    console.debug('Web Audio not available or blocked:', err);
  }
}

function playMysterySound(type = 'unveil') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'flip' || type === 'unveil') {
      // Shimmering mystery opening swoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.18);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    } else if (type === 'advantage') {
      // Sparkling triumphant major arpeggio
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.22, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.36);
      });
    } else if (type === 'disadvantage') {
      // Dramatic descending minor dissonant alert
      [440, 415.30, 329.63].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.18, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.39);
      });
    }
  } catch (err) {
    console.debug('Web Audio mystery sound failed:', err);
  }
}

function playMarketSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Radiant celebratory 4-note ascending chime
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.2, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.4);
    });
  } catch (err) {
    console.debug('Web Audio market sound failed:', err);
  }
}

function playMarketErrorSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(196, now);
    osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.2);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  } catch (err) {
    console.debug('Web Audio error sound failed:', err);
  }
}

