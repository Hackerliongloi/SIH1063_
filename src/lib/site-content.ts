export type SiteLink = {
  label: string;
  href: string;
  description?: string;
  external?: boolean;
};

export type NavigationGroup = { label: string; links: SiteLink[] };

export const navigationGroups: NavigationGroup[] = [
  {
    label: "About NCPOR",
    links: [
      { label: "Overview & Mandate", href: "/institution/overview" },
      { label: "Stations & research bases", href: "/about" },
      { label: "Chairman", href: "/institution/chairman" },
      { label: "Director", href: "/institution/director" },
      { label: "Organisation", href: "/institution/organisation" },
      { label: "Organisation chart", href: "/institution/organisation-chart" },
      { label: "NCPOR Society", href: "/institution/society" },
      { label: "Governing Body", href: "/institution/governing-body" },
      { label: "Committees", href: "/institution/committees" },
      { label: "Former Directors", href: "/institution/former-directors" },
      { label: "Annual Reports", href: "/institution/annual-reports" },
      { label: "In-house Magazine", href: "/institution/magazine" },
      { label: "Virtual Tour", href: "/virtual-tour" },
      { label: "Contact NCPOR", href: "/contact" },
      { label: "Right to Information", href: "/institution/rti" },
    ],
  },
  {
    label: "Expeditions",
    links: [
      { label: "Antarctica", href: "/expeditions/antarctica" },
      { label: "Maitri Station", href: "/institution/maitri" },
      { label: "Bharati Station", href: "/institution/bharati" },
      { label: "Arctic", href: "/expeditions/arctic" },
      { label: "Himalaya", href: "/expeditions/himalaya" },
      { label: "IODP", href: "/expeditions/iodp" },
      { label: "Southern Ocean", href: "/expeditions/southern-ocean" },
      { label: "India in Antarctica", href: "/institution/india-in-antarctica" },
      { label: "Environment & Treaty obligations", href: "/institution/environment-and-treaty" },
      { label: "Permits and participation", href: "/institution/permits" },
      { label: "Antarctic records & timeline", href: "/institution/antarctic-records" },
      { label: "Fauna and flora", href: "/institution/antarctic-life" },
      { label: "Expedition management", href: "/institution/expedition-management" },
      { label: "Expedition Updates", href: "/news?category=expeditions" },
      { label: "Research Vessel Movements", href: "/news?category=vessels" },
    ],
  },
  {
    label: "Science & Research",
    links: [
      { label: "Polar Science & Cryosphere", href: "/research/polar-science" },
      { label: "Ocean Sciences", href: "/research/ocean-sciences" },
      { label: "Geoscience", href: "/research/geoscience" },
      { label: "Biological Sciences", href: "/research/biological-sciences" },
      { label: "Exploration for Mineral Resources", href: "/research/mineral-resources" },
      { label: "Significant Achievements", href: "/research/achievements" },
      { label: "Outreach Programme", href: "/research/outreach" },
      { label: "Community", href: "/community" },
      { label: "Result Framework", href: "/institution/result-framework" },
    ],
  },
  {
    label: "Data & Services",
    links: [
      { label: "National Polar Data Center", href: "https://npdc.ncpor.res.in/npdc/", external: true },
      { label: "Meteorological Data", href: "https://data.ncpor.res.in/", external: true },
      { label: "Live Access Server", href: "https://las.ncaor.gov.in/", external: true },
      { label: "Library", href: "/institution/library" },
      { label: "Information Technology Services", href: "/institution/its" },
      { label: "People Directory", href: "/institution/people" },
      { label: "NCPOR Webmail", href: "https://mail.gov.in/", external: true },
      { label: "NCPOR e-Office", href: "https://eoffice.ncpor.res.in/", external: true },
      { label: "Photo Gallery", href: "/gallery" },
    ],
  },
  {
    label: "Opportunities & Notices",
    links: [
      { label: "Tenders & Procurement", href: "/tenders" },
      { label: "Career Advertisements & Results", href: "/careers" },
      { label: "Internship & Dissertation", href: "/careers/internships" },
      { label: "PhD Programme", href: "/careers/phd" },
      { label: "Administration", href: "/institution/administration" },
      { label: "Finance", href: "/institution/finance" },
      { label: "Procurement", href: "/institution/procurement" },
      { label: "Estate", href: "/institution/estate" },
    ],
  },
];

export const expeditions = [
  {
    slug: "antarctica",
    title: "Antarctica",
    kicker: "Indian Antarctic Programme",
    description:
      "India’s Antarctic research programme supports year-round observations, multidisciplinary field science and international cooperation under the Antarctic Treaty System.",
    image: "https://images.unsplash.com/photo-1517299321609-52687d1bc55a?auto=format&fit=crop&w=1600&q=85",
    facts: ["Maitri research station", "Bharati research station", "Scientific expeditions"],
  },
  {
    slug: "arctic",
    title: "Arctic",
    kicker: "Indian Arctic Programme",
    description:
      "Research at Himadri and across the Arctic examines a rapidly changing polar environment, from the atmosphere and fjords to glaciers and marine ecosystems.",
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1600&q=85",
    facts: ["Himadri research station", "Ny-Ålesund, Svalbard", "Atmosphere, ocean and cryosphere"],
  },
  {
    slug: "himalaya",
    title: "Himalaya",
    kicker: "High-altitude research",
    description:
      "The Himalayan programme studies glaciers, snow, permafrost and mountain environments that are important to regional water and climate systems.",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=85",
    facts: ["Himansh research station", "Spiti Valley", "Glacier and mountain climate studies"],
  },
  {
    slug: "iodp",
    title: "International Ocean Discovery Program",
    kicker: "IODP",
    description:
      "Scientific ocean drilling explores Earth’s history, the subseafloor biosphere and the processes that shape ocean basins and climate.",
    image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1600&q=85",
    facts: ["International scientific collaboration", "Ocean sediment records", "Earth system research"],
  },
  {
    slug: "southern-ocean",
    title: "Southern Ocean",
    kicker: "Oceanographic expeditions",
    description:
      "Ship-based observations investigate ocean circulation, marine ecosystems and exchange between the Southern Ocean, atmosphere and Antarctic ice.",
    image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1600&q=85",
    facts: ["Oceanographic surveys", "Research vessel observations", "Climate and marine science"],
  },
];

export const researchPrograms = [
  { slug: "polar-science", title: "Polar Science & Cryosphere", description: "Observations of polar ice, snow, atmosphere and climate help explain change across the Earth system." },
  { slug: "ocean-sciences", title: "Ocean Sciences", description: "Oceanographic research spans physical, chemical and biological processes in the Indian and Southern Oceans." },
  { slug: "geoscience", title: "Geoscience", description: "Marine geoscience programmes map seafloor structures and study the geological processes of ocean basins." },
  { slug: "biological-sciences", title: "Biological Sciences", description: "Polar and marine biological research documents ecosystems, biodiversity and organisms adapting to extreme environments." },
  { slug: "mineral-resources", title: "Exploration for Mineral Resources", description: "Research investigates marine mineral systems and gas hydrate occurrences within the relevant national mandates." },
  { slug: "achievements", title: "Research Achievements", description: "Selected scientific outcomes, milestones and contributions from NCPOR programmes." },
  { slug: "outreach", title: "Outreach Programme", description: "Outreach connects polar and ocean research with students, educators and the public." },
];

export const institutionalPages: Record<string, { title: string; section: string; intro: string; details: string[]; links?: SiteLink[] }> = {
  overview: { title: "About NCPOR", section: "About NCPOR", intro: "The National Centre for Polar and Ocean Research (NCPOR), under the Ministry of Earth Sciences, Government of India, is the national institution responsible for coordinating and advancing India’s research activities in the polar regions and the Southern Ocean.", details: ["NCPOR is headquartered at Headland Sada, Vasco-da-Gama, Goa.", "Its programmes include polar expeditions, oceanographic research, cryosphere studies, scientific data services and international collaboration.", "The centre supports research logistics, observations and dissemination of scientific knowledge."], links: [{ label: "Explore research programmes", href: "/research/polar-science" }, { label: "Browse the knowledge repository", href: "/explore" }] },
  chairman: { title: "Our Chairman", section: "About NCPOR", intro: "The Secretary, Ministry of Earth Sciences, serves as Chairman of the NCPOR Society.", details: ["This section provides institutional leadership information and official announcements.", "For current office-holder details, refer to the Ministry of Earth Sciences and NCPOR official channels."], links: [{ label: "Ministry of Earth Sciences", href: "https://moes.gov.in/", external: true }] },
  director: { title: "Our Director", section: "About NCPOR", intro: "The Director leads the centre’s scientific programmes, research infrastructure and institutional operations.", details: ["NCPOR brings together multidisciplinary teams working across the polar regions, the oceans and high-altitude environments.", "Official leadership information and notices are published by NCPOR." ] },
  organisation: { title: "Organisation", section: "About NCPOR", intro: "NCPOR’s organisation supports research planning, field operations, data services and administration.", details: ["Scientific sections coordinate research programmes and expeditions.", "Technical and operational teams support logistics, infrastructure and data systems.", "Administrative divisions provide institutional services and procurement."], links: [{ label: "People directory", href: "/institution/people" }, { label: "Management & support", href: "/institution/administration" }] },
  "governing-body": { title: "Governing Body", section: "About NCPOR", intro: "The Governing Body provides institutional oversight for the NCPOR Society.", details: ["Membership, meeting records and official decisions are maintained through institutional channels.", "For the latest approved documents, consult NCPOR’s official publications." ] },
  committees: { title: "Committees", section: "About NCPOR", intro: "NCPOR’s committees support governance, financial oversight and scientific advice.", details: ["Finance Committee", "Research Advisory Committee", "Other committees constituted for institutional governance and programme guidance." ] },
  "former-directors": { title: "Former Directors", section: "About NCPOR", intro: "NCPOR acknowledges the scientists and leaders who have guided the institution and its predecessor, NCAOR.", details: ["This directory is intended to preserve institutional history.", "Names and tenures should be maintained against approved NCPOR records." ] },
  "annual-reports": { title: "Annual Reports", section: "Publications", intro: "Annual reports document NCPOR’s research, expeditions, institutional work and major outcomes.", details: ["Browse reports in the knowledge repository or visit NCPOR’s official publications page.", "Reports can be filtered by year and programme when records are available."], links: [{ label: "Search publications", href: "/explore?type=publication" }] },
  magazine: { title: "In-house Magazine", section: "Publications", intro: "The in-house magazine shares institutional updates, research highlights and stories from NCPOR programmes.", details: ["Digital issues and related publications can be added to the repository.", "Use search to discover stories, reports and media from polar research."], links: [{ label: "Read science stories", href: "/community?type=story" }] },
  people: { title: "People Directory", section: "Information Services", intro: "NCPOR’s scientists, technical specialists and support staff enable research in demanding polar and ocean environments.", details: ["People directory information should be published according to official institutional records.", "For general enquiries, use the contact details on this portal." ] },
  its: { title: "Information Technology Services", section: "Information Services", intro: "Information Technology Services support NCPOR’s digital infrastructure, information systems and public web services.", details: ["For technical support, contact the official NCPOR IT service desk.", "Data and science platforms may operate on separate NCPOR subdomains." ] },
  library: { title: "Library", section: "Information Services", intro: "The library supports polar and ocean research through access to scientific publications, reports and institutional knowledge.", details: ["Use the Polar Portal repository to search reports, datasets, publications and media.", "Contact the library through NCPOR for access and reference assistance."], links: [{ label: "Search the repository", href: "/explore" }] },
  administration: { title: "Administration", section: "Management & Support", intro: "Administrative services support NCPOR’s staff, programmes and research operations.", details: ["Official administrative circulars and forms should be published through NCPOR channels.", "For career and internship information, visit Opportunities."], links: [{ label: "Careers and opportunities", href: "/careers" }] },
  finance: { title: "Finance", section: "Management & Support", intro: "The Finance section supports budgeting, accounting and financial administration for the centre.", details: ["Finance-related documents and notices are published subject to applicable Government of India rules.", "Tender and procurement notices are listed separately."], links: [{ label: "Tenders", href: "/tenders" }] },
  estate: { title: "Estate", section: "Management & Support", intro: "Estate services maintain NCPOR’s campus, facilities and institutional infrastructure.", details: ["Facilities support scientific, technical and administrative work at the Goa campus.", "Official service notices are shared through the NCPOR website." ] },
  "former-staff": { title: "NCPOR Staff", section: "About NCPOR", intro: "A directory of the people and sections contributing to NCPOR’s scientific and institutional mission.", details: ["Directory details are maintained by the institution.", "For current official contacts, use the NCPOR contact page." ] },
  society: { title: "NCPOR Society", section: "About NCPOR", intro: "NCPOR is an autonomous institution under the Ministry of Earth Sciences, Government of India.", details: ["The Society’s governance framework supports the centre’s institutional mandate.", "For current memoranda, membership and governing documents, refer to official NCPOR records." ] },
  "organisation-chart": { title: "Organisation Chart", section: "About NCPOR", intro: "Explore the organisational structure supporting NCPOR’s research, administration and operations.", details: ["NCPOR works through scientific sections, technical teams and administrative divisions.", "The approved organisation chart and reporting structure should be verified in the latest official publication." ] },
  procurement: { title: "Procurement", section: "Management & Support", intro: "Procurement supports the equipment, supplies and services needed for polar and ocean research.", details: ["Procurement opportunities and notices are published through the tender section and Government portals.", "Suppliers should review the complete tender document and amendments before submitting a bid."], links: [{ label: "Browse tenders", href: "/tenders" }] },
  "india-in-antarctica": { title: "India in Antarctica", section: "Expeditions", intro: "India’s Antarctic programme conducts scientific research and maintains a sustained presence on the continent.", details: ["India’s Antarctic activities are undertaken in accordance with the Antarctic Treaty System and national rules.", "Maitri and Bharati support year-round scientific observations and field operations.", "Expedition records and research outputs can be explored in the knowledge repository."], links: [{ label: "Maitri Station", href: "/institution/maitri" }, { label: "Bharati Station", href: "/institution/bharati" }, { label: "Antarctic expedition page", href: "/expeditions/antarctica" }] },
  maitri: { title: "Maitri Research Station", section: "Expeditions · Antarctica", intro: "Maitri is India’s research station in the Schirmacher Oasis region of Queen Maud Land, Antarctica.", details: ["The station supports scientific and logistical work in Antarctica.", "Research programmes include atmospheric and earth science observations and environmental monitoring.", "Consult current expedition information for operating details and programme updates."], links: [{ label: "Explore Antarctic research", href: "/expeditions/antarctica" }] },
  bharati: { title: "Bharati Research Station", section: "Expeditions · Antarctica", intro: "Bharati is India’s research station in the Larsemann Hills region of East Antarctica.", details: ["The station supports multidisciplinary research and field operations.", "Research includes ocean, atmosphere, earth and biological sciences.", "Consult current expedition information for operating details and programme updates."], links: [{ label: "Explore Antarctic research", href: "/expeditions/antarctica" }] },
  "environment-and-treaty": { title: "Environment and Treaty obligations", section: "Expeditions · Antarctica", intro: "Antarctic activities are governed by international agreements and national legislation intended to protect the Antarctic environment.", details: ["The Antarctic Treaty System includes the Protocol on Environmental Protection to the Antarctic Treaty (Madrid Protocol).", "India’s Antarctic activities are also governed by national laws and rules, including the Indian Antarctic Act, 2022 and the Indian Antarctic Rules, 2023.", "The official legal texts and permit instructions must be consulted before any Antarctic activity."], links: [{ label: "Antarctic Treaty Secretariat", href: "https://www.ats.aq/", external: true }] },
  permits: { title: "Permits and participation", section: "Expeditions · Antarctica", intro: "Activities in Antarctica may require prior authorisation and environmental assessment under applicable laws and rules.", details: ["Do not undertake Antarctic activities without required approvals.", "Application forms, assessment requirements, offences and penalties are established by applicable Indian Antarctic legislation and rules.", "Use official NCPOR and Government of India forms and guidance for current requirements."], links: [{ label: "Indian Antarctic Act, 2022", href: "https://www.indiacode.nic.in/", external: true }, { label: "Antarctic Treaty Secretariat", href: "https://www.ats.aq/", external: true }] },
  "antarctic-records": { title: "Antarctic records and timeline", section: "Expeditions · Antarctica", intro: "Explore milestones from Antarctic discovery, the development of India’s Antarctic programme and scientific expeditions.", details: ["NCPOR’s official Antarctic records preserve expedition information and programme milestones.", "Use expedition reports and archive resources for research and historical reference."], links: [{ label: "Search Antarctic records", href: "/explore?expedition=Antarctica" }, { label: "Indian Antarctic Programme", href: "/institution/india-in-antarctica" }] },
  "antarctic-life": { title: "Antarctic fauna and flora", section: "Expeditions · Antarctica", intro: "Antarctic and Southern Ocean ecosystems include organisms adapted to extreme cold, seasonality and isolated habitats.", details: ["Biodiversity research examines marine and terrestrial life and the environmental conditions that sustain it.", "All field activities must follow environmental protections and applicable permit requirements."], links: [{ label: "Biological Sciences", href: "/research/biological-sciences" }, { label: "Environment and Treaty obligations", href: "/institution/environment-and-treaty" }] },
  "expedition-management": { title: "Expedition management", section: "Expeditions", intro: "Expedition management coordinates participation, operational readiness and support for field science.", details: ["Expedition participation is subject to programme selection, operational planning and applicable safety requirements.", "Current participant forms and advisories are issued through official NCPOR systems."], links: [{ label: "Performance Appraisal Portal", href: "https://isea.ncpor.res.in/", external: true }, { label: "Contact NCPOR", href: "/contact" }] },
  rti: { title: "Right to Information", section: "Public information", intro: "Information about public authorities, transparency and requests under the Right to Information Act.", details: ["For current NCPOR RTI disclosures and designated contacts, use the official NCPOR RTI page.", "RTI requests should follow Government of India procedures and be addressed to the appropriate public authority."], links: [{ label: "NCPOR official website", href: "https://ncpor.res.in/", external: true }] },
  "result-framework": { title: "Result Framework", section: "Public information", intro: "Institutional result frameworks present objectives, indicators and performance information.", details: ["The latest approved result framework should be used for official performance reporting.", "Visit NCPOR’s official website for current downloadable documents."], links: [{ label: "Annual reports", href: "/institution/annual-reports" }] },
  disclaimer: { title: "Disclaimer", section: "Website policies", intro: "Information on this portal is provided for public information and research discovery.", details: ["Official notices, policies, legal requirements and deadlines should be verified on the responsible Government or NCPOR source.", "External websites are managed by their respective organisations." ] },
  copyright: { title: "Copyright Policy", section: "Website policies", intro: "Content, documents, photographs and datasets may have different reuse conditions.", details: ["Check the licence and attribution requirements attached to each resource before reuse.", "Some official material may be subject to Government of India copyright and other terms." ] },
};
