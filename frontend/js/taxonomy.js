/* ============================================================
   Meridian — shared vocabularies for tutors and programmes.
   Add a subject here and it appears in the filters automatically.
   ============================================================ */
window.MERIDIAN_TAXONOMY = {
  subjects: {
    sat: { en: 'SAT', ka: 'SAT', ar: 'SAT' },
    act: { en: 'ACT', ka: 'ACT', ar: 'ACT' },
    ielts: { en: 'IELTS', ka: 'IELTS', ar: 'IELTS' },
    toefl: { en: 'TOEFL', ka: 'TOEFL', ar: 'TOEFL' },
    duolingo: { en: 'Duolingo test', ka: 'Duolingo ტესტი', ar: 'اختبار Duolingo' },
    'flex-prep': { en: 'FLEX preparation', ka: 'FLEX-ის მომზადება', ar: 'التحضير لبرنامج FLEX' },
    'uwc-prep': { en: 'UWC preparation', ka: 'UWC-ის მომზადება', ar: 'التحضير لكليات UWC' },
    mun: { en: 'Model UN & debate', ka: 'MUN და დებატები', ar: 'نموذج الأمم المتحدة والمناظرة' },
    olympiad: { en: 'Olympiad training', ka: 'ოლიმპიადისთვის მომზადება', ar: 'التدريب على الأولمبيادات' },
    'us-admissions': { en: 'US admissions', ka: 'აშშ-ის მიღება', ar: 'القبول في الجامعات الأمريكية' },
    'uk-admissions': { en: 'UK admissions', ka: 'ბრიტანეთის მიღება', ar: 'القبول في الجامعات البريطانية' },
    'eu-admissions': { en: 'Europe admissions', ka: 'ევროპის მიღება', ar: 'القبول في الجامعات الأوروبية' },
    'asia-admissions': { en: 'Asia admissions', ka: 'აზიის მიღება', ar: 'القبول في الجامعات الآسيوية' },
    essays: { en: 'Essays & statements', ka: 'ესეები და განაცხადები', ar: 'المقالات وخطابات الدوافع' },
    cv: { en: 'CV / résumé', ka: 'CV / რეზიუმე', ar: 'السيرة الذاتية' },
    interview: { en: 'Interview prep', ka: 'ინტერვიუს მომზადება', ar: 'التحضير للمقابلات' },
    'financial-aid': { en: 'Financial aid', ka: 'ფინანსური დახმარება', ar: 'المساعدات المالية' },
    math: { en: 'Mathematics', ka: 'მათემატიკა', ar: 'الرياضيات' },
    physics: { en: 'Physics', ka: 'ფიზიკა', ar: 'الفيزياء' },
    chemistry: { en: 'Chemistry', ka: 'ქიმია', ar: 'الكيمياء' },
    biology: { en: 'Biology', ka: 'ბიოლოგია', ar: 'الأحياء' },
    english: { en: 'English', ka: 'ინგლისური', ar: 'اللغة الإنجليزية' },
    cs: { en: 'Computer science', ka: 'კომპიუტერული მეცნიერება', ar: 'علوم الحاسوب' },
    ap: { en: 'AP subjects', ka: 'AP საგნები', ar: 'مواد AP' },
    history: { en: 'History', ka: 'ისტორია', ar: 'التاريخ' },
    german: { en: 'German', ka: 'გერმანული', ar: 'اللغة الألمانية' },
    italian: { en: 'Italian', ka: 'იტალიური', ar: 'اللغة الإيطالية' },
    japanese: { en: 'Japanese', ka: 'იაპონური', ar: 'اللغة اليابانية' }
  },
  // admissions help belongs to the Counselling page, not the tutor filters
  counselling: ['us-admissions', 'uk-admissions', 'eu-admissions', 'asia-admissions', 'essays', 'cv', 'interview', 'financial-aid'],
  // where the student wants to study: continents
  regions: {
    europe: { en: 'Europe', ka: 'ევროპა', ar: 'أوروبا' },
    'north-america': { en: 'North America', ka: 'ჩრდილოეთ ამერიკა', ar: 'أمريكا الشمالية' },
    asia: { en: 'Asia', ka: 'აზია', ar: 'آسيا' },
    oceania: { en: 'Oceania', ka: 'ოკეანეთი', ar: 'أوقيانوسيا' },
    'south-america': { en: 'South America', ka: 'სამხრეთ ამერიკა', ar: 'أمريكا الجنوبية' },
    africa: { en: 'Africa', ka: 'აფრიკა', ar: 'أفريقيا' }
  },
  // tutors who signed up before continents (us/uk) — read as their continent
  legacyRegions: { us: 'north-america', uk: 'europe' },
  languages: {
    ka: { en: 'Georgian', ka: 'ქართული', ar: 'الجورجية' },
    en: { en: 'English', ka: 'ინგლისური', ar: 'الإنجليزية' },
    ar: { en: 'Arabic', ka: 'არაბული', ar: 'العربية' },
    de: { en: 'German', ka: 'გერმანული', ar: 'الألمانية' },
    it: { en: 'Italian', ka: 'იტალიური', ar: 'الإيطالية' },
    fr: { en: 'French', ka: 'ფრანგული', ar: 'الفرنسية' },
    ja: { en: 'Japanese', ka: 'იაპონური', ar: 'اليابانية' },
    ru: { en: 'Russian', ka: 'რუსული', ar: 'الروسية' },
    tr: { en: 'Turkish', ka: 'თურქული', ar: 'التركية' }
  }
};
