/* ============================================================
   Meridian — About cluster (overview, leadership, FAQ,
   offerings, teachers around the world)
   ============================================================ */
(function () {
  'use strict';

  var SUB = [
    ['/about', 'nav.overview'],
    ['/about/leadership', 'nav.leadership'],
    ['/about/offerings', 'nav.offerings'],
    ['/about/global-teachers', 'nav.globalTeachers'],
    ['/about/research', 'nav.research'],
    ['/about/faq', 'nav.faq']
  ];

  function paintSubnav() {
    var host = document.getElementById('aboutSubnav');
    if (!host) return;
    var here = window.location.pathname.replace(/\/$/, '') || '/about';
    host.innerHTML = SUB.map(function (item) {
      return '<a href="' + item[0] + '"' + (here === item[0] ? ' class="is-active" aria-current="page"' : '') +
        '>' + M.t(item[1]) + '</a>';
    }).join('');
  }

  /* ---------------------------------------------------------- principles */
  var PILLARS = [
    {
      icon: 'shield', href: '/programs',
      title: { en: 'Checked at the source', ka: 'გადამოწმებული წყაროსთან', ar: 'موثّقة من المصدر' },
      body: { en: 'Every programme, scholarship and university links to the official page we checked it against. Closed calls leave the site on their own.',
              ka: 'ყველა პროგრამა, სტიპენდია და უნივერსიტეტი იმ ოფიციალური გვერდის ბმულს შეიცავს, რომელზეც გადავამოწმეთ. დახურული კონკურსები საიტიდან თავისით ქრება.',
              ar: 'كل برنامج ومنحة وجامعة مرتبط بالصفحة الرسمية التي تحققنا منها. والفرص المغلقة تختفي من الموقع تلقائياً.' }
    },
    {
      icon: 'compass', href: '/pricing',
      title: { en: 'Free at the core', ka: 'მთავარი — უფასოდ', ar: 'الأساس مجاني' },
      body: { en: 'Searching, saving, exam prep and courses cost nothing. Memberships add organisation and people, never the information itself.',
              ka: 'ძიება, შენახვა, გამოცდებისთვის მზადება და კურსები უფასოა. წევრობა ამატებს ორგანიზებასა და ადამიანებს და არა თავად ინფორმაციას.',
              ar: 'البحث والحفظ والتحضير للاختبارات والدورات مجانية. العضويات تضيف التنظيم والأشخاص، لا المعلومات نفسها.' }
    },
    {
      icon: 'users', href: '/teachers',
      title: { en: 'Real people beside you', ka: 'ნამდვილი ადამიანები შენს გვერდით', ar: 'أشخاص حقيقيون إلى جانبك' },
      body: { en: 'Tutors and counsellors are reviewed before they go live. Tutors keep their full price; our 10% fee is always shown before you pay.',
              ka: 'რეპეტიტორები და კონსულტანტები გამოქვეყნებამდე მოწმდებიან. რეპეტიტორი მთელ ფასს იღებს; ჩვენი 10% ყოველთვის ჩანს გადახდამდე.',
              ar: 'تتم مراجعة المدرّسين والمرشدين قبل نشر ملفاتهم. يحصل المدرّس على سعره كاملاً، ورسومنا البالغة 10% تظهر دائماً قبل الدفع.' }
    },
    {
      icon: 'globe', href: '/universities',
      title: { en: 'Made for every student', ka: 'შექმნილია ყველა მოსწავლისთვის', ar: 'مصمَّم لكل طالب' },
      body: { en: 'In English, Georgian and Arabic, for students in any country, starting where information is hardest to find.',
              ka: 'ინგლისურად, ქართულად და არაბულად, ნებისმიერი ქვეყნის მოსწავლეებისთვის — იქიდან დაწყებული, სადაც ინფორმაციის პოვნა ყველაზე რთულია.',
              ar: 'بالإنجليزية والجورجية والعربية، لطلاب أي بلد، بدءاً من حيث يصعب العثور على المعلومات.' }
    }
  ];

  function paintPillars() {
    var host = document.getElementById('pillarList');
    if (!host) return;
    host.innerHTML = PILLARS.map(function (pillar, i) {
      return '<a class="principle" href="' + pillar.href + '" data-reveal>' +
        '<span class="principle-n">0' + (i + 1) + '</span>' +
        '<span class="principle-ico">' + M.icon(pillar.icon, 22) + '</span>' +
        '<h3>' + M.esc(M.pick(pillar.title)) + '</h3>' +
        '<p>' + M.esc(M.pick(pillar.body)) + '</p>' +
      '</a>';
    }).join('');
    M.observeReveal(host);
  }

  /* the two founders, small, on the overview (full bios on /about/leadership) */
  function paintPeople() {
    var host = document.getElementById('aboutPeople');
    if (!host) return;
    host.innerHTML = FOUNDERS.map(function (person) {
      return '<div class="about-person"><span class="avatar avatar-lg">' + person.initials + '</span>' +
        '<span><b>' + M.esc(M.pick(person.name)) + '</b><small>' + M.t('about.team.cofounder') + ' · ' + M.esc(person.school) + '</small>' +
        '<small class="dim">' + M.esc(M.pick(person.focus)) + '</small></span></div>';
    }).join('');
  }

  /* ---------------------------------------------------------- founders */
  var FOUNDERS = [
    {
      initials: 'DB',
      name: { en: 'Demetre Bzekalava', ka: 'დემეტრე ბზეკალავა', ar: 'ديميتري بزيكالافا' },
      school: 'Carnegie Mellon University',
      bio: {
        en: 'Co-founder. Studies at Carnegie Mellon University. Built the first version of Meridian after going through international applications himself and finding that the hardest part was never the work — it was finding out what existed in time.',
        ka: 'თანადამფუძნებელი. სწავლობს Carnegie Mellon University-ში. Meridian-ის პირველი ვერსია შექმნა მას შემდეგ, რაც თავად გაიარა საერთაშორისო განაცხადების პროცესი და მიხვდა, რომ ყველაზე რთული არასდროს ყოფილა შრომა — რთული იყო დროულად გაგება, რა არსებობდა.',
        ar: 'شريك مؤسس. يدرس في Carnegie Mellon University. بنى النسخة الأولى من Meridian بعد أن خاض بنفسه عملية التقديم الدولي، واكتشف أن الجزء الأصعب لم يكن العمل نفسه، بل معرفة ما هو متاح في الوقت المناسب.'
      },
      focus: { en: 'Product, platform and the programme database', ka: 'პროდუქტი, პლატფორმა და პროგრამების ბაზა', ar: 'المنتج والمنصة وقاعدة بيانات البرامج' }
    },
    {
      initials: 'PL',
      name: { en: 'Petre Labartkava', ka: 'პეტრე ლაბარტყავა', ar: 'بيتري لابارتكافا' },
      school: 'Georgetown University',
      bio: {
        en: 'Co-founder. Studies at Georgetown University. Leads counselling standards and partnerships — deciding what a Meridian counsellor must be able to do before a student is ever charged for it.',
        ka: 'თანადამფუძნებელი. სწავლობს Georgetown University-ში. ხელმძღვანელობს კონსულტირების სტანდარტებსა და პარტნიორობებს — განსაზღვრავს, რა უნდა შეეძლოს Meridian-ის კონსულტანტს, სანამ მოსწავლე ამაში გადაიხდის.',
        ar: 'شريك مؤسس. يدرس في Georgetown University. يقود معايير الإرشاد والشراكات، ويحدد ما يجب أن يكون مرشد Meridian قادراً عليه قبل أن يُطلب من أي طالب دفع مقابله.'
      },
      focus: { en: 'Counselling, partnerships and legal', ka: 'კონსულტირება, პარტნიორობები და იურიდიული საკითხები', ar: 'الإرشاد والشراكات والشؤون القانونية' }
    }
  ];

  function paintFounders() {
    var host = document.getElementById('founderList');
    if (!host) return;
    host.innerHTML = FOUNDERS.map(function (person) {
      return '<article class="card card-pad-lg founder-card" data-reveal>' +
        '<span class="avatar avatar-lg">' + person.initials + '</span>' +
        '<div>' +
          '<h3>' + M.esc(M.pick(person.name)) + '</h3>' +
          '<p class="founder-role">' + M.t('leadership.founder') + '</p>' +
          '<p class="founder-school">' + M.icon('cap', 16) + M.t('leadership.studies') + ' ' + M.esc(person.school) + '</p>' +
          '<p class="muted" style="margin-top:1rem;font-size:.94rem">' + M.esc(M.pick(person.bio)) + '</p>' +
          '<div class="cluster" style="margin-top:1.1rem">' +
            '<span class="badge badge-brand">' + M.esc(M.pick(person.focus)) + '</span>' +
          '</div>' +
          '<div class="footer-social" style="margin-top:1.1rem">' +
            '<a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">' + M.icon('linkedin', 18) + '</a>' +
            '<a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">' + M.icon('instagram', 18) + '</a>' +
            '<a href="mailto:hello@meridian.ge" aria-label="Email">' + M.icon('mail', 18) + '</a>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
    M.observeReveal(host);
  }

  var ROLES = [
    { title: { en: 'Programme researcher', ka: 'პროგრამების მკვლევარი', ar: 'باحث البرامج' },
      body: { en: 'Finds programmes continuously, keeps the data accurate, and writes the short brief that explains why a programme matters and who it suits.',
              ka: 'უწყვეტად ეძებს პროგრამებს, ინარჩუნებს მონაცემების სიზუსტეს და წერს მოკლე აღწერას — რატომ არის პროგრამა მნიშვნელოვანი და ვის შეეფერება.',
              ar: 'يبحث عن البرامج باستمرار، ويحافظ على دقة البيانات، ويكتب الملخص القصير الذي يشرح أهمية البرنامج ولمن يناسب.' } },
    { title: { en: 'Back-end engineer (Python)', ka: 'Back-end ინჟინერი (Python)', ar: 'مهندس الواجهة الخلفية (Python)' },
      body: { en: 'Keeps the data pipeline and the API healthy, ships new fields as the database grows, and owns accounts, payments and security.',
              ka: 'უვლის მონაცემთა ნაკადსა და API-ს, ამატებს ახალ ველებს ბაზის ზრდასთან ერთად და პასუხისმგებელია ანგარიშებზე, გადახდებსა და უსაფრთხოებაზე.',
              ar: 'يعتني بمسار البيانات وواجهة API، ويضيف حقولاً جديدة مع نمو قاعدة البيانات، ويتولى الحسابات والمدفوعات والأمان.' } },
    { title: { en: 'Front-end engineer', ka: 'Front-end ინჟინერი', ar: 'مهندس الواجهة الأمامية' },
      body: { en: 'Surfaces new programmes on the home page, keeps the interface sharp, and works directly with the researcher so the site is never stale.',
              ka: 'მთავარ გვერდზე გამოაქვს ახალი პროგრამები, ინარჩუნებს ინტერფეისის ხარისხს და პირდაპირ მუშაობს მკვლევართან, რომ საიტი არასდროს დაძველდეს.',
              ar: 'يعرض البرامج الجديدة في الصفحة الرئيسية، ويحافظ على جودة الواجهة، ويعمل مباشرة مع الباحث حتى لا يصبح الموقع قديماً أبداً.' } },
    { title: { en: 'Full-stack lead', ka: 'Full-stack ლიდი', ar: 'قائد التطوير المتكامل (Full-stack)' },
      body: { en: 'Owns both ends, sets priorities with the founders and decides what ships next.',
              ka: 'აკონტროლებს ორივე მხარეს, დამფუძნებლებთან ერთად ადგენს პრიორიტეტებს და წყვეტს, რა გამოვა შემდეგ.',
              ar: 'يتولى الطرفين معاً، ويحدد الأولويات مع المؤسسين، ويقرر ما سيُطلق لاحقاً.' } },
    { title: { en: 'Marketing team (2–3)', ka: 'მარკეტინგის გუნდი (2–3)', ar: 'فريق التسويق (2–3)' },
      body: { en: 'TikTok and Instagram, short podcasts with our tutors, and answering — in public — the questions students keep asking.',
              ka: 'TikTok და Instagram, მოკლე პოდკასტები ჩვენს მასწავლებლებთან და საჯაროდ პასუხის გაცემა იმ კითხვებზე, რასაც მოსწავლეები მუდმივად სვამენ.',
              ar: 'TikTok وInstagram، وبودكاست قصير مع مدرّسينا، والإجابة علناً عن الأسئلة التي يكررها الطلاب.' } }
  ];

  function paintRoles() {
    var host = document.getElementById('roleList');
    if (!host) return;
    host.innerHTML = ROLES.map(function (role) {
      return '<article class="card card-hover value-card" data-reveal>' +
        '<span class="value-icon">' + M.icon('briefcase', 22) + '</span>' +
        '<h3 style="font-size:1.02rem">' + M.esc(M.pick(role.title)) + '</h3>' +
        '<p>' + M.esc(M.pick(role.body)) + '</p>' +
      '</article>';
    }).join('');
    M.observeReveal(host);
  }

  /* ---------------------------------------------------------- FAQ */
  var FAQ = [
    {
      q: { en: 'Do I have to pay to use Meridian?', ka: 'უნდა გადავიხადო Meridian-ით სარგებლობისთვის?', ar: 'هل عليّ أن أدفع لاستخدام Meridian؟' },
      a: { en: 'No. Projects, scholarships, universities, deadlines and resources are free. A free account unlocks every entry, every tutor profile and the application tracker. You pay only for people: lessons (the tutor\'s own price plus 10%), Compass or Navigator memberships. Payments are Visa or Mastercard.',
           ka: 'არა. პროექტები, სტიპენდიები, უნივერსიტეტები, ვადები და რესურსები უფასოა. უფასო ანგარიში ხსნის ყველა ჩანაწერს, რეპეტიტორის ყველა პროფილს და განაცხადების ტრეკერს. იხდი მხოლოდ ადამიანებში: გაკვეთილებში (რეპეტიტორის ფასი + 10%), Compass ან Navigator წევრობაში. გადახდა Visa-თი ან Mastercard-ით.',
           ar: 'لا. المشاريع والمنح والجامعات والمواعيد النهائية والموارد كلها مجانية. يفتح لك الحساب المجاني كل الإدخالات وكل ملفات المدرّسين ومتتبّع الطلبات. تدفع فقط مقابل الأشخاص: الدروس (سعر المدرّس نفسه زائد 10%)، أو عضويتَي Compass وNavigator. الدفع ببطاقة Visa أو Mastercard.' }
    },
    {
      q: { en: 'Is Meridian only for one country?', ka: 'Meridian მხოლოდ ერთი ქვეყნისთვისაა?', ar: 'هل Meridian لبلد واحد فقط؟' },
      a: { en: 'No. Meridian is for students anywhere in the world. Every programme states which nationalities can apply, and you can filter by host country, level and funding. We are based in Doha, and the site is in English, Georgian and Arabic.',
           ka: 'არა. Meridian განკუთვნილია მსოფლიოს ნებისმიერი ქვეყნის სტუდენტისთვის. ყველა პროგრამაზე მითითებულია, რომელი ქვეყნის მოქალაქეებს შეუძლიათ განაცხადის შეტანა, და შეგიძლია გაფილტრო მასპინძელი ქვეყნით, დონითა და დაფინანსებით. ჩვენ დოჰაში ვართ, საიტი კი ინგლისურ, ქართულ და არაბულ ენებზეა.',
           ar: 'لا. Meridian مخصص للطلاب في أي مكان في العالم. يحدد كل برنامج الجنسيات المسموح لها بالتقديم، ويمكنك التصفية حسب بلد الدراسة والمستوى والتمويل. مقرنا في الدوحة، والموقع متاح بالإنجليزية والجورجية والعربية.' }
    },
    {
      q: { en: 'How do you know the information is correct?', ka: 'საიდან იცით, რომ ინფორმაცია სწორია?', ar: 'كيف تعرفون أن المعلومات صحيحة؟' },
      a: { en: 'Each entry is checked against the organiser\'s own official page, and every opportunity page shows those sources and the date of the check. Anything whose deadline has passed is removed from the site automatically and kept in our internal archive until a new round opens.',
           ka: 'ყოველი ჩანაწერი მოწმდება ორგანიზატორის საკუთარ ოფიციალურ გვერდზე, და ყველა შესაძლებლობის გვერდზე ჩანს ეს წყაროები და შემოწმების თარიღი. რისი ვადაც გავიდა, საიტიდან ავტომატურად იშლება და ჩვენს შიდა არქივში ინახება, სანამ ახალი რაუნდი არ გაიხსნება.',
           ar: 'يُتحقق من كل إدخال في الصفحة الرسمية الخاصة بالجهة المنظِّمة، وتعرض كل صفحة فرصة تلك المصادر وتاريخ التحقق. وكل ما انتهى موعده النهائي يُزال من الموقع تلقائياً ويُحفظ في أرشيفنا الداخلي إلى أن تُفتح جولة جديدة.' }
    },
    {
      q: { en: 'How are new opportunities found?', ka: 'როგორ ემატება ახალი შესაძლებლობები?', ar: 'كيف تُكتشف الفرص الجديدة؟' },
      a: { en: 'Research agents each cover one area (scholarships by region, universities, Erasmus+ projects, Model United Nations conferences, competitions and other projects) and a separate agent re-checks what they found against official pages. Nothing goes live until a person approves it.',
           ka: 'კვლევითი აგენტები თითო მიმართულებას იკვლევენ (სტიპენდიები რეგიონების მიხედვით, უნივერსიტეტები, Erasmus+ პროექტები, გაეროს მოდელირების კონფერენციები, კონკურსები და სხვა პროექტები), ცალკე აგენტი კი ნაპოვნს ოფიციალურ გვერდებზე ამოწმებს. საიტზე არაფერი ჩნდება, სანამ ადამიანი არ დაამტკიცებს.',
           ar: 'يغطي كل وكيل بحث مجالاً واحداً (المنح حسب المنطقة، والجامعات، ومشاريع Erasmus+، ومؤتمرات نموذج الأمم المتحدة، والمسابقات، وغيرها من المشاريع)، ويعيد وكيل منفصل التحقق مما وجدوه في الصفحات الرسمية. ولا يُنشر شيء حتى يوافق عليه شخص حقيقي.' }
    },
    {
      q: { en: 'Can I apply to universities through Meridian?', ka: 'შემიძლია უნივერსიტეტებში Meridian-ით განაცხადის გაგზავნა?', ar: 'هل يمكنني التقديم إلى الجامعات عبر Meridian؟' },
      a: { en: 'Yes. Every university has its own page with tuition, deadlines, tests and an application checklist. Press "Start application" and the checklist moves to your profile, where you upload documents and track each step, like the Common App. Our team reviews your file and submits it with you through the university\'s official system.',
           ka: 'დიახ. ყველა უნივერსიტეტს აქვს საკუთარი გვერდი სწავლის საფასურით, ვადებით, გამოცდებითა და განაცხადის ჩამონათვალით. დააჭირე „განაცხადის დაწყებას“ და ჩამონათვალი შენს პროფილში გადავა, სადაც დოკუმენტებს ატვირთავ და ყოველ ნაბიჯს აკონტროლებ, როგორც Common App-ში. ჩვენი გუნდი განიხილავს შენს საქმეს და შენთან ერთად აგზავნის უნივერსიტეტის ოფიციალური სისტემით.',
           ar: 'نعم. لكل جامعة صفحتها الخاصة بالرسوم الدراسية والمواعيد النهائية والاختبارات وقائمة مراجعة التقديم. اضغط «ابدأ التقديم» فتنتقل القائمة إلى ملفك الشخصي، حيث ترفع المستندات وتتابع كل خطوة، كما في Common App. يراجع فريقنا ملفك ويقدّمه معك عبر النظام الرسمي للجامعة.' }
    },
    {
      q: { en: 'How do you check that a tutor is qualified?', ka: 'როგორ ამოწმებთ, რომ რეპეტიტორი კვალიფიციურია?', ar: 'كيف تتحققون من كفاءة المدرّس؟' },
      a: { en: 'A tutor applies with their degree, institution, scores and a photo. The application goes into our database as "pending" and is emailed to the team, and someone reviews it before the profile goes live. The "verified" mark appears only on approved, real accounts. Profiles that are only there to show the layout are labelled "Sample profile".',
           ka: 'რეპეტიტორი განაცხადს აგზავნის ხარისხით, დაწესებულებით, ქულებითა და ფოტოთი. განაცხადი ჩვენს ბაზაში „მოლოდინის“ სტატუსით ინახება და გუნდს ელფოსტით ეგზავნება; პროფილის გამოქვეყნებამდე ვინმე განიხილავს. „დადასტურებული“ ნიშანი მხოლოდ დამტკიცებულ, რეალურ ანგარიშებს აქვს. პროფილები, რომლებიც მხოლოდ დიზაინის საჩვენებლადაა, „ნიმუშის პროფილად“ არის მონიშნული.',
           ar: 'يتقدم المدرّس بشهادته والمؤسسة التي تخرج فيها ودرجاته وصورته. يُحفظ الطلب في قاعدة بياناتنا بحالة «قيد الانتظار» ويُرسل بالبريد الإلكتروني إلى الفريق، ويراجعه أحد أعضائه قبل نشر الملف. لا تظهر علامة «موثّق» إلا على الحسابات الحقيقية المعتمدة. أما الملفات الموجودة فقط لعرض التصميم فتحمل عبارة «ملف نموذجي».' }
    },
    {
      q: { en: 'Can my school buy Meridian for its students?', ka: 'შეუძლია ჩემს სკოლას Meridian-ის შეძენა მოსწავლეებისთვის?', ar: 'هل يمكن لمدرستي شراء Meridian لطلابها؟' },
      a: { en: 'Yes. Schools can buy Compass for a whole class or year group at a reduced price per student. The school sends us the students\' emails and we set up every account. Write to us from the Engage page.',
           ka: 'დიახ. სკოლებს შეუძლიათ Compass-ის შეძენა მთელი კლასისთვის ან ნაკადისთვის, ერთ მოსწავლეზე შემცირებულ ფასად. სკოლა გვიგზავნის მოსწავლეების ელფოსტებს და ჩვენ ყველა ანგარიშს ვქმნით. მოგვწერე თანამშრომლობის გვერდიდან.',
           ar: 'نعم. يمكن للمدارس شراء Compass لصف كامل أو لدفعة دراسية بسعر مخفّض للطالب الواحد. ترسل لنا المدرسة البريد الإلكتروني للطلاب ونُنشئ نحن كل الحسابات. راسلنا من صفحة التعاون.' }
    },
    {
      q: { en: 'Where is my personal data stored?', ka: 'სად ინახება ჩემი პერსონალური მონაცემები?', ar: 'أين تُخزَّن بياناتي الشخصية؟' },
      a: { en: 'Your account (name, email, optional phone) and your application files are stored in Meridian\'s own database on our server. Passwords are hashed with PBKDF2 and cannot be read back, not even by us. Card numbers never reach our server: only the card brand and last four digits are kept. We do not sell data.',
           ka: 'შენი ანგარიში (სახელი, ელფოსტა, არასავალდებულო ტელეფონი) და განაცხადის ფაილები ინახება Meridian-ის საკუთარ ბაზაში ჩვენს სერვერზე. პაროლები დაჰეშილია PBKDF2-ით და უკან ვერ იკითხება, ჩვენც კი ვერ ვკითხულობთ. ბარათის ნომერი ჩვენს სერვერამდე არასდროს მოდის: ინახება მხოლოდ ბრენდი და ბოლო ოთხი ციფრი. მონაცემებს არ ვყიდით.',
           ar: 'يُخزَّن حسابك (الاسم والبريد الإلكتروني ورقم هاتف اختياري) وملفات طلباتك في قاعدة بيانات Meridian الخاصة على خادمنا. تُشفَّر كلمات المرور بخوارزمية PBKDF2 ولا يمكن قراءتها مجدداً، ولا حتى من قِبلنا. ولا تصل أرقام البطاقات إلى خادمنا أبداً: لا نحتفظ إلا بنوع البطاقة وآخر أربعة أرقام. ولا نبيع البيانات.' }
    }
  ];

  function paintFaq() {
    var host = document.getElementById('faqList');
    if (!host) return;
    host.innerHTML = FAQ.map(function (item, index) {
      return '<div class="accordion-item' + (index === 0 ? ' is-open' : '') + '">' +
        '<button type="button" class="accordion-trigger" aria-expanded="' + (index === 0) + '">' +
          '<span>' + M.esc(M.pick(item.q)) + '</span>' +
          '<span class="accordion-icon">' + M.icon('plus', 15) + '</span>' +
        '</button>' +
        '<div class="accordion-panel"><div><p>' + M.esc(M.pick(item.a)) + '</p></div></div>' +
      '</div>';
    }).join('');
    M.bindAccordions(host);
  }

  /* ---------------------------------------------------------- offerings */
  var FAMILIES = [
    { key: 'scholarship', icon: 'award', name: { en: 'Scholarships', ka: 'სტიპენდიები', ar: 'المنح الدراسية' },
      blurb: { en: 'Government, university and foundation scholarships, organised by host country, with the nationalities that can apply and the real deadline for each.',
               ka: 'სახელმწიფო, საუნივერსიტეტო და ფონდების სტიპენდიები, მასპინძელი ქვეყნების მიხედვით — თითოეულზე მითითებულია, რომელ მოქალაქეებს შეუძლიათ განაცხადი და რეალური ვადა.',
               ar: 'منح حكومية وجامعية ومنح المؤسسات، منظمة حسب بلد الدراسة، مع الجنسيات المسموح لها بالتقديم والموعد النهائي الفعلي لكل منحة.' } },
    { key: 'erasmus', icon: 'star', name: 'Erasmus+',
      blurb: { en: 'Concrete Erasmus+ youth exchanges, training courses, European Solidarity Corps placements and Erasmus Mundus masters, each with the organiser\'s own application form.',
               ka: 'კონკრეტული Erasmus+ ახალგაზრდული გაცვლები, ტრენინგ-კურსები, ევროპის სოლიდარობის კორპუსის ადგილები და Erasmus Mundus-ის მაგისტრატურები — თითოეული ორგანიზატორის საკუთარი სარეგისტრაციო ფორმით.',
               ar: 'تبادلات Erasmus+ الشبابية الفعلية، والدورات التدريبية، ومواقع هيئة التضامن الأوروبية، وماجستير Erasmus Mundus، لكلٍّ منها نموذج التقديم الخاص بالجهة المنظِّمة.' } },
    { key: 'mun', icon: 'globe', name: { en: 'Model United Nations', ka: 'გაეროს მოდელირება', ar: 'نموذج الأمم المتحدة' },
      blurb: { en: 'MUN conferences on every continent, with dates, fees, committees and the registration page, for school and university delegates.',
               ka: 'გაეროს მოდელირების კონფერენციები ყველა კონტინენტზე — თარიღებით, საფასურით, კომიტეტებითა და სარეგისტრაციო გვერდით, სკოლისა და უნივერსიტეტის დელეგატებისთვის.',
               ar: 'مؤتمرات نموذج الأمم المتحدة في كل قارة، مع التواريخ والرسوم واللجان وصفحة التسجيل، لمندوبي المدارس والجامعات.' } },
    { key: 'uwc', icon: 'cap', name: 'UWC',
      blurb: { en: 'Two-year IB Diploma colleges. Students apply once through their own country\'s UWC national committee, which nominates them to a college; most nominees receive full or partial funding.',
               ka: 'ორწლიანი IB დიპლომის კოლეჯები. სტუდენტები ერთხელ აგზავნიან განაცხადს საკუთარი ქვეყნის UWC ეროვნულ კომიტეტში, რომელიც კოლეჯს ასახელებს; ნომინირებულთა უმეტესობა სრულ ან ნაწილობრივ დაფინანსებას იღებს.',
               ar: 'كليات دبلوم البكالوريا الدولية (IB) لمدة عامين. يتقدم الطلاب مرة واحدة عبر اللجنة الوطنية لـ UWC في بلدهم، وهي ترشحهم إلى إحدى الكليات؛ ويحصل معظم المرشحين على تمويل كامل أو جزئي.' } },
    { key: 'flex', icon: 'send', name: { en: 'Exchanges', ka: 'გაცვლები', ar: 'التبادلات' },
      blurb: { en: 'Government-funded school and university exchanges such as FLEX Global, Global UGRAD and the Benjamin Franklin fellowship.',
               ka: 'სახელმწიფოს მიერ დაფინანსებული სასკოლო და საუნივერსიტეტო გაცვლები, მაგალითად FLEX Global, Global UGRAD და ბენჯამინ ფრანკლინის სტიპენდია.',
               ar: 'تبادلات مدرسية وجامعية بتمويل حكومي، مثل FLEX Global وGlobal UGRAD وزمالة بنجامين فرانكلين.' } },
    { key: 'summer', icon: 'zap', name: { en: 'Summer schools', ka: 'საზაფხულო სკოლები', ar: 'المدارس الصيفية' },
      blurb: { en: 'Selective research and maths programmes (RSI, SSP, PROMYS, Mathcamp), Yale Young Global Scholars and university summer sessions.',
               ka: 'შერჩევითი კვლევითი და მათემატიკური პროგრამები (RSI, SSP, PROMYS, Mathcamp), Yale Young Global Scholars და უნივერსიტეტების საზაფხულო სესიები.',
               ar: 'برامج بحثية ورياضية انتقائية (RSI وSSP وPROMYS وMathcamp)، وYale Young Global Scholars، والدورات الصيفية في الجامعات.' } },
    { key: 'competition', icon: 'trending', name: { en: 'Competitions', ka: 'კონკურსები', ar: 'المسابقات' },
      blurb: { en: 'Olympiads, essay prizes, hackathons, science fairs and student startup competitions such as the Diamond Challenge and the Hult Prize.',
               ka: 'ოლიმპიადები, ესეების კონკურსები, ჰაკათონები, სამეცნიერო გამოფენები და სტუდენტური სტარტაპ-კონკურსები, მაგალითად Diamond Challenge და Hult Prize.',
               ar: 'أولمبيادات، وجوائز المقالات، وماراثونات البرمجة، ومعارض العلوم، ومسابقات الشركات الناشئة الطلابية مثل Diamond Challenge وHult Prize.' } },
    { key: 'startup', icon: 'briefcase', name: { en: 'Startups & funding', ka: 'სტარტაპები და დაფინანსება', ar: 'الشركات الناشئة والتمويل' },
      blurb: { en: 'Accelerators and grants for young founders, from Y Combinator and the Thiel Fellowship to regional programmes in Doha and Tbilisi.',
               ka: 'აქსელერატორები და გრანტები ახალგაზრდა დამფუძნებლებისთვის — Y Combinator-იდან და Thiel Fellowship-იდან დოჰისა და თბილისის რეგიონულ პროგრამებამდე.',
               ar: 'مسرّعات أعمال ومنح للمؤسسين الشباب، من Y Combinator وThiel Fellowship إلى البرامج الإقليمية في الدوحة وتبليسي.' } },
    { key: 'youth', icon: 'sparkles', name: { en: 'Youth programmes', ka: 'ახალგაზრდული პროგრამები', ar: 'البرامج الشبابية' },
      blurb: { en: 'Volunteering, leadership and fellowship programmes that are often the fastest first international experience.',
               ka: 'მოხალისეობა, ლიდერობისა და სტიპენდიის პროგრამები — ხშირად ყველაზე სწრაფი პირველი საერთაშორისო გამოცდილება.',
               ar: 'برامج التطوع والقيادة والزمالات، وغالباً ما تكون أسرع طريق إلى أول تجربة دولية.' } }
  ];

  function paintOfferings(programs) {
    var host = document.getElementById('familyList');
    if (!host) return;
    host.innerHTML = FAMILIES.map(function (family) {
      var members = programs.filter(function (p) { return p.family === family.key; });
      var names = members.slice(0, 5).map(function (p) {
        return '<li><a class="btn-link" style="font-weight:500;font-size:.88rem" href="/programs?p=' +
          encodeURIComponent(p.id) + '">' + p.flag + ' ' + M.esc(M.pick(p.name)) + '</a></li>';
      }).join('');
      return '<article class="card card-hover card-lit value-card" data-reveal>' +
        '<div class="spread">' +
          '<span class="value-icon">' + M.icon(family.icon, 22) + '</span>' +
          '<span class="badge badge-brand">' + members.length + '</span>' +
        '</div>' +
        '<h3>' + M.esc(typeof family.name === 'string' ? family.name : M.pick(family.name)) + '</h3>' +
        '<p>' + M.esc(M.pick(family.blurb)) + '</p>' +
        '<ul class="stack" style="gap:.35rem;margin-top:auto;padding-top:.8rem;border-top:1px solid var(--divider)">' +
          names + '</ul>' +
      '</article>';
    }).join('');
    M.observeReveal(host);
  }

  /* ---------------------------------------------------------- global teachers */
  function paintGlobalTeachers(teachers) {
    var host = document.getElementById('globalList');
    if (!host) return;
    var byCountry = {};
    teachers.forEach(function (teacher) {
      var key = M.pick(teacher.country) + '|' + teacher.flag;
      (byCountry[key] = byCountry[key] || []).push(teacher);
    });
    host.innerHTML = Object.keys(byCountry).map(function (key) {
      var bits = key.split('|');
      var list = byCountry[key];
      var subjects = {};
      list.forEach(function (teacher) {
        (teacher.subjects || []).forEach(function (slug) { subjects[slug] = 1; });
      });
      var chips = Object.keys(subjects).slice(0, 6).map(function (slug) {
        var table = window.MERIDIAN_TAXONOMY.subjects;
        return '<span class="badge">' + M.esc(table[slug] ? M.pick(table[slug]) : slug) + '</span>';
      }).join('');
      return '<article class="card card-hover value-card" data-reveal>' +
        '<div class="spread">' +
          '<span style="font-size:2rem;line-height:1">' + bits[1] + '</span>' +
          '<span class="badge badge-brand">' + list.length + '</span>' +
        '</div>' +
        '<h3 style="font-size:1.06rem">' + M.esc(bits[0]) + '</h3>' +
        '<p style="font-size:.88rem">' + list.map(function (teacher) {
          return M.esc(M.pick(teacher.name));
        }).join(' · ') + '</p>' +
        '<div class="tag-list" style="margin-top:auto">' + chips + '</div>' +
      '</article>';
    }).join('');
    M.observeReveal(host);
  }

  /* ---------------------------------------------------------- boot */
  function paintAll() {
    paintSubnav();
    paintPillars();
    paintPeople();
    paintFounders();
    paintRoles();
    paintFaq();
  }

  function init() {
    paintAll();

    if (document.getElementById('aboutStats')) {
      M.api('/api/research').then(function (data) {
        var live = data.live || {};
        document.querySelectorAll('[data-live]').forEach(function (node) {
          node.textContent = live[node.getAttribute('data-live')];
        });
      });
    }
    if (document.getElementById('familyList')) {
      M.api('/api/programs').then(function (data) {
        var programs = data.programs || [];
        paintOfferings(programs);
        window.addEventListener('meridian:lang', function () { paintOfferings(programs); });
      });
    }
    if (document.getElementById('globalList')) {
      M.api('/api/teachers').then(function (data) {
        var teachers = (data.teachers || []).filter(function (t) { return !t.locked; });
        paintGlobalTeachers(teachers);
        window.addEventListener('meridian:lang', function () { paintGlobalTeachers(teachers); });
      });
    }

    window.addEventListener('meridian:lang', paintAll);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
