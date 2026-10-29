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

  /* ---------------------------------------------------------- pillars */
  var PILLARS = [
    {
      icon: 'layers', stat: '7.3M',
      title: { en: 'Every opportunity, checked, in one place', ka: 'ყველა შესაძლებლობა, გადამოწმებული, ერთ სივრცეში' },
      body: {
        en: 'About 7.3 million students study outside their home country (UNESCO, 2023), more than three times as many as in 2000. The opportunities they apply to are spread over thousands of sites. Meridian keeps projects, scholarships and universities in one database, and every entry links to the official page it was checked against.',
        ka: 'დაახლოებით 7.3 მილიონი სტუდენტი სწავლობს საკუთარი ქვეყნის გარეთ (UNESCO, 2023) — სამჯერ მეტი, ვიდრე 2000 წელს. შესაძლებლობები, რომლებზეც ისინი განაცხადს აგზავნიან, ათასობით საიტზეა გაფანტული. Meridian ერთ ბაზაში ინახავს პროექტებს, სტიპენდიებსა და უნივერსიტეტებს, და ყველა ჩანაწერს ახლავს იმ ოფიციალური გვერდის ბმული, რომელზეც გადამოწმდა.'
      },
      href: '/programs'
    },
    {
      icon: 'users', stat: '48%',
      title: { en: 'Tutoring without the 33% cut', ka: 'რეპეტიტორობა 33%-იანი საკომისიოს გარეშე' },
      body: {
        en: 'Private tutoring has no regulation at all in 48% of the world\'s education systems (UNESCO GEM Report). On Meridian every tutor is reviewed before going live, lessons are online so distance is not a barrier, and the tutor keeps their whole price. Preply keeps 18–33%.',
        ka: 'მსოფლიოს საგანმანათლებლო სისტემების 48%-ში კერძო რეპეტიტორობა საერთოდ არ რეგულირდება (UNESCO GEM). Meridian-ზე ყველა რეპეტიტორი გამოქვეყნებამდე მოწმდება, გაკვეთილები ონლაინაა, ასე რომ მანძილი ბარიერი აღარ არის, რეპეტიტორი კი მთელ თავის ფასს იღებს. Preply 18–33%-ს იტოვებს.'
      },
      href: '/teachers'
    },
    {
      icon: 'compass', stat: '1 : 15',
      title: { en: 'Counselling priced for families, not for a few', ka: 'კონსულტირება ოჯახებისთვის ხელმისაწვდომ ფასად' },
      body: {
        en: 'For every high-achieving low-income student who applies to a selective university, about 15 wealthier peers do (Hoxby & Avery, 2013). Sending students tailored information, at about $6 each, changed where they applied. Meridian sells that guidance as a monthly membership; private counselling packages often start above $25,000.',
        ka: 'ყოველ დაბალი შემოსავლის წარჩინებულზე, ვინც შერჩევით უნივერსიტეტს მიმართავს, დაახლოებით 15 შეძლებული თანატოლი მოდის (ჰოქსბი და ეივერი, 2013). მორგებულმა ინფორმაციამ, დაახლოებით $6 თითოზე, შეცვალა, სად აგზავნიდნენ განაცხადს. Meridian ამ დახმარებას ყოველთვიური წევრობით სთავაზობს; კერძო საკონსულტაციო პაკეტები ხშირად $25,000-ზე მეტი ღირს.'
      },
      href: '/pricing'
    },
    {
      icon: 'trending', stat: '3',
      title: { en: 'Apply without leaving Meridian', ka: 'განაცხადი Meridian-ის დატოვების გარეშე' },
      body: {
        en: 'Projects, scholarships and universities each have their own section, every opportunity has its own page, and your profile tracks every application: what is done, what is missing and how many days are left.',
        ka: 'პროექტებს, სტიპენდიებსა და უნივერსიტეტებს თავისი განყოფილება აქვს, ყველა შესაძლებლობას — საკუთარი გვერდი, შენი პროფილი კი ყველა განაცხადს აკონტროლებს: რა გაკეთდა, რა აკლია და რამდენი დღე დარჩა.'
      },
      href: '/about/research'
    }
  ];

  function paintPillars() {
    var host = document.getElementById('pillarList');
    if (!host) return;
    host.innerHTML = PILLARS.map(function (pillar) {
      return '<a class="pillar" href="' + pillar.href + '" data-reveal>' +
        '<span class="pillar-mark">' + M.icon(pillar.icon, 24) + '</span>' +
          '<b class="pillar-stat">' + M.esc(pillar.stat) + '</b>' +
        '<span>' +
          '<h3 style="font-size:var(--step-1);margin-bottom:.5rem">' + M.esc(M.pick(pillar.title)) + '</h3>' +
          '<p class="muted" style="font-size:.94rem">' + M.esc(M.pick(pillar.body)) + '</p>' +
          '<span class="btn-link" style="margin-top:.8rem">' + M.t('common.learnMore') + M.icon('arrowRight', 16) + '</span>' +
        '</span>' +
      '</a>';
    }).join('');
    M.observeReveal(host);
  }

  /* ---------------------------------------------------------- founders */
  var FOUNDERS = [
    {
      initials: 'DB',
      name: { en: 'Demetre Bzekalava', ka: 'დემეტრე ბზეკალავა' },
      school: 'Carnegie Mellon University',
      bio: {
        en: 'Co-founder. Studies at Carnegie Mellon University. Built the first version of Meridian after going through international applications himself and finding that the hardest part was never the work — it was finding out what existed in time.',
        ka: 'თანადამფუძნებელი. სწავლობს Carnegie Mellon University-ში. Meridian-ის პირველი ვერსია შექმნა მას შემდეგ, რაც თავად გაიარა საერთაშორისო განაცხადების პროცესი და მიხვდა, რომ ყველაზე რთული არასდროს ყოფილა შრომა — რთული იყო დროულად გაგება, რა არსებობდა.'
      },
      focus: { en: 'Product, platform and the programme database', ka: 'პროდუქტი, პლატფორმა და პროგრამების ბაზა' }
    },
    {
      initials: 'PL',
      name: { en: 'Petre Labartkava', ka: 'პეტრე ლაბარტყავა' },
      school: 'Georgetown University',
      bio: {
        en: 'Co-founder. Studies at Georgetown University. Leads counselling standards and partnerships — deciding what a Meridian counsellor must be able to do before a student is ever charged for it.',
        ka: 'თანადამფუძნებელი. სწავლობს Georgetown University-ში. ხელმძღვანელობს კონსულტირების სტანდარტებსა და პარტნიორობებს — განსაზღვრავს, რა უნდა შეეძლოს Meridian-ის კონსულტანტს, სანამ მოსწავლე ამაში გადაიხდის.'
      },
      focus: { en: 'Counselling, partnerships and legal', ka: 'კონსულტირება, პარტნიორობები და იურიდიული საკითხები' }
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
    { title: { en: 'Programme researcher', ka: 'პროგრამების მკვლევარი' },
      body: { en: 'Finds programmes continuously, keeps the data accurate, and writes the short brief that explains why a programme matters and who it suits.',
              ka: 'უწყვეტად ეძებს პროგრამებს, ინარჩუნებს მონაცემების სიზუსტეს და წერს მოკლე აღწერას — რატომ არის პროგრამა მნიშვნელოვანი და ვის შეეფერება.' } },
    { title: { en: 'Back-end engineer (Python)', ka: 'Back-end ინჟინერი (Python)' },
      body: { en: 'Keeps the data pipeline and the API healthy, ships new fields as the database grows, and owns accounts, payments and security.',
              ka: 'უვლის მონაცემთა ნაკადსა და API-ს, ამატებს ახალ ველებს ბაზის ზრდასთან ერთად და პასუხისმგებელია ანგარიშებზე, გადახდებსა და უსაფრთხოებაზე.' } },
    { title: { en: 'Front-end engineer', ka: 'Front-end ინჟინერი' },
      body: { en: 'Surfaces new programmes on the home page, keeps the interface sharp, and works directly with the researcher so the site is never stale.',
              ka: 'მთავარ გვერდზე გამოაქვს ახალი პროგრამები, ინარჩუნებს ინტერფეისის ხარისხს და პირდაპირ მუშაობს მკვლევართან, რომ საიტი არასდროს დაძველდეს.' } },
    { title: { en: 'Full-stack lead', ka: 'Full-stack ლიდი' },
      body: { en: 'Owns both ends, sets priorities with the founders and decides what ships next.',
              ka: 'აკონტროლებს ორივე მხარეს, დამფუძნებლებთან ერთად ადგენს პრიორიტეტებს და წყვეტს, რა გამოვა შემდეგ.' } },
    { title: { en: 'Marketing team (2–3)', ka: 'მარკეტინგის გუნდი (2–3)' },
      body: { en: 'TikTok and Instagram, short podcasts with our tutors, and answering — in public — the questions students keep asking.',
              ka: 'TikTok და Instagram, მოკლე პოდკასტები ჩვენს მასწავლებლებთან და საჯაროდ პასუხის გაცემა იმ კითხვებზე, რასაც მოსწავლეები მუდმივად სვამენ.' } }
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
      q: { en: 'Do I have to pay to use Meridian?', ka: 'უნდა გადავიხადო Meridian-ით სარგებლობისთვის?' },
      a: { en: 'No. Projects, scholarships, universities, deadlines and resources are free. A free account unlocks every entry, every tutor profile and the application tracker. You pay only for people: lessons (the tutor\'s own price plus 10%), Compass or Navigator memberships. Payments are Visa or Mastercard.',
           ka: 'არა. პროექტები, სტიპენდიები, უნივერსიტეტები, ვადები და რესურსები უფასოა. უფასო ანგარიში ხსნის ყველა ჩანაწერს, რეპეტიტორის ყველა პროფილს და განაცხადების ტრეკერს. იხდი მხოლოდ ადამიანებში: გაკვეთილებში (რეპეტიტორის ფასი + 10%), Compass ან Navigator წევრობაში. გადახდა Visa-თი ან Mastercard-ით.' }
    },
    {
      q: { en: 'Is Meridian only for one country?', ka: 'Meridian მხოლოდ ერთი ქვეყნისთვისაა?' },
      a: { en: 'No. Meridian is for students anywhere in the world. Every programme states which nationalities can apply, and you can filter by host country, level and funding. We are based in Doha, and the site is in English, Georgian and Arabic.',
           ka: 'არა. Meridian განკუთვნილია მსოფლიოს ნებისმიერი ქვეყნის სტუდენტისთვის. ყველა პროგრამაზე მითითებულია, რომელი ქვეყნის მოქალაქეებს შეუძლიათ განაცხადის შეტანა, და შეგიძლია გაფილტრო მასპინძელი ქვეყნით, დონითა და დაფინანსებით. ჩვენ დოჰაში ვართ, საიტი კი ინგლისურ, ქართულ და არაბულ ენებზეა.' }
    },
    {
      q: { en: 'How do you know the information is correct?', ka: 'საიდან იცით, რომ ინფორმაცია სწორია?' },
      a: { en: 'Each entry is checked against the organiser\'s own official page, and every opportunity page shows those sources and the date of the check. Anything whose deadline has passed is removed from the site automatically and kept in our internal archive until a new round opens.',
           ka: 'ყოველი ჩანაწერი მოწმდება ორგანიზატორის საკუთარ ოფიციალურ გვერდზე, და ყველა შესაძლებლობის გვერდზე ჩანს ეს წყაროები და შემოწმების თარიღი. რისი ვადაც გავიდა, საიტიდან ავტომატურად იშლება და ჩვენს შიდა არქივში ინახება, სანამ ახალი რაუნდი არ გაიხსნება.' }
    },
    {
      q: { en: 'How are new opportunities found?', ka: 'როგორ ემატება ახალი შესაძლებლობები?' },
      a: { en: 'Research agents each cover one area (scholarships by region, universities, Erasmus+ projects, Model United Nations conferences, competitions and other projects) and a separate agent re-checks what they found against official pages. Nothing goes live until a person approves it.',
           ka: 'კვლევითი აგენტები თითო მიმართულებას იკვლევენ (სტიპენდიები რეგიონების მიხედვით, უნივერსიტეტები, Erasmus+ პროექტები, გაეროს მოდელირების კონფერენციები, კონკურსები და სხვა პროექტები), ცალკე აგენტი კი ნაპოვნს ოფიციალურ გვერდებზე ამოწმებს. საიტზე არაფერი ჩნდება, სანამ ადამიანი არ დაამტკიცებს.' }
    },
    {
      q: { en: 'Can I apply to universities through Meridian?', ka: 'შემიძლია უნივერსიტეტებში Meridian-ით განაცხადის გაგზავნა?' },
      a: { en: 'Yes. Every university has its own page with tuition, deadlines, tests and an application checklist. Press "Start application" and the checklist moves to your profile, where you upload documents and track each step, like the Common App. Our team reviews your file and submits it with you through the university\'s official system.',
           ka: 'დიახ. ყველა უნივერსიტეტს აქვს საკუთარი გვერდი სწავლის საფასურით, ვადებით, გამოცდებითა და განაცხადის ჩამონათვალით. დააჭირე „განაცხადის დაწყებას“ და ჩამონათვალი შენს პროფილში გადავა, სადაც დოკუმენტებს ატვირთავ და ყოველ ნაბიჯს აკონტროლებ, როგორც Common App-ში. ჩვენი გუნდი განიხილავს შენს საქმეს და შენთან ერთად აგზავნის უნივერსიტეტის ოფიციალური სისტემით.' }
    },
    {
      q: { en: 'How do you check that a tutor is qualified?', ka: 'როგორ ამოწმებთ, რომ რეპეტიტორი კვალიფიციურია?' },
      a: { en: 'A tutor applies with their degree, institution, scores and a photo. The application goes into our database as "pending" and is emailed to the team, and someone reviews it before the profile goes live. The "verified" mark appears only on approved, real accounts. Profiles that are only there to show the layout are labelled "Sample profile".',
           ka: 'რეპეტიტორი განაცხადს აგზავნის ხარისხით, დაწესებულებით, ქულებითა და ფოტოთი. განაცხადი ჩვენს ბაზაში „მოლოდინის“ სტატუსით ინახება და გუნდს ელფოსტით ეგზავნება; პროფილის გამოქვეყნებამდე ვინმე განიხილავს. „დადასტურებული“ ნიშანი მხოლოდ დამტკიცებულ, რეალურ ანგარიშებს აქვს. პროფილები, რომლებიც მხოლოდ დიზაინის საჩვენებლადაა, „ნიმუშის პროფილად“ არის მონიშნული.' }
    },
    {
      q: { en: 'Can my school buy Meridian for its students?', ka: 'შეუძლია ჩემს სკოლას Meridian-ის შეძენა მოსწავლეებისთვის?' },
      a: { en: 'Yes. Schools can buy Compass for a whole class or year group at a reduced price per student. The school sends us the students\' emails and we set up every account. Write to us from the Engage page.',
           ka: 'დიახ. სკოლებს შეუძლიათ Compass-ის შეძენა მთელი კლასისთვის ან ნაკადისთვის, ერთ მოსწავლეზე შემცირებულ ფასად. სკოლა გვიგზავნის მოსწავლეების ელფოსტებს და ჩვენ ყველა ანგარიშს ვქმნით. მოგვწერე თანამშრომლობის გვერდიდან.' }
    },
    {
      q: { en: 'Where is my personal data stored?', ka: 'სად ინახება ჩემი პერსონალური მონაცემები?' },
      a: { en: 'Your account (name, email, optional phone) and your application files are stored in Meridian\'s own database on our server. Passwords are hashed with PBKDF2 and cannot be read back, not even by us. Card numbers never reach our server: only the card brand and last four digits are kept. We do not sell data.',
           ka: 'შენი ანგარიში (სახელი, ელფოსტა, არასავალდებულო ტელეფონი) და განაცხადის ფაილები ინახება Meridian-ის საკუთარ ბაზაში ჩვენს სერვერზე. პაროლები დაჰეშილია PBKDF2-ით და უკან ვერ იკითხება, ჩვენც კი ვერ ვკითხულობთ. ბარათის ნომერი ჩვენს სერვერამდე არასდროს მოდის: ინახება მხოლოდ ბრენდი და ბოლო ოთხი ციფრი. მონაცემებს არ ვყიდით.' }
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
    { key: 'scholarship', icon: 'award', name: { en: 'Scholarships', ka: 'სტიპენდიები' },
      blurb: { en: 'Government, university and foundation scholarships, organised by host country, with the nationalities that can apply and the real deadline for each.',
               ka: 'სახელმწიფო, საუნივერსიტეტო და ფონდების სტიპენდიები, მასპინძელი ქვეყნების მიხედვით — თითოეულზე მითითებულია, რომელ მოქალაქეებს შეუძლიათ განაცხადი და რეალური ვადა.' } },
    { key: 'erasmus', icon: 'star', name: 'Erasmus+',
      blurb: { en: 'Concrete Erasmus+ youth exchanges, training courses, European Solidarity Corps placements and Erasmus Mundus masters, each with the organiser\'s own application form.',
               ka: 'კონკრეტული Erasmus+ ახალგაზრდული გაცვლები, ტრენინგ-კურსები, ევროპის სოლიდარობის კორპუსის ადგილები და Erasmus Mundus-ის მაგისტრატურები — თითოეული ორგანიზატორის საკუთარი სარეგისტრაციო ფორმით.' } },
    { key: 'mun', icon: 'globe', name: { en: 'Model United Nations', ka: 'გაეროს მოდელირება' },
      blurb: { en: 'MUN conferences on every continent, with dates, fees, committees and the registration page, for school and university delegates.',
               ka: 'გაეროს მოდელირების კონფერენციები ყველა კონტინენტზე — თარიღებით, საფასურით, კომიტეტებითა და სარეგისტრაციო გვერდით, სკოლისა და უნივერსიტეტის დელეგატებისთვის.' } },
    { key: 'uwc', icon: 'cap', name: 'UWC',
      blurb: { en: 'Two-year IB Diploma colleges. Students apply once through their own country\'s UWC national committee, which nominates them to a college; most nominees receive full or partial funding.',
               ka: 'ორწლიანი IB დიპლომის კოლეჯები. სტუდენტები ერთხელ აგზავნიან განაცხადს საკუთარი ქვეყნის UWC ეროვნულ კომიტეტში, რომელიც კოლეჯს ასახელებს; ნომინირებულთა უმეტესობა სრულ ან ნაწილობრივ დაფინანსებას იღებს.' } },
    { key: 'flex', icon: 'send', name: { en: 'Exchanges', ka: 'გაცვლები' },
      blurb: { en: 'Government-funded school and university exchanges such as FLEX Global, Global UGRAD and the Benjamin Franklin fellowship.',
               ka: 'სახელმწიფოს მიერ დაფინანსებული სასკოლო და საუნივერსიტეტო გაცვლები, მაგალითად FLEX Global, Global UGRAD და ბენჯამინ ფრანკლინის სტიპენდია.' } },
    { key: 'summer', icon: 'zap', name: { en: 'Summer schools', ka: 'საზაფხულო სკოლები' },
      blurb: { en: 'Selective research and maths programmes (RSI, SSP, PROMYS, Mathcamp), Yale Young Global Scholars and university summer sessions.',
               ka: 'შერჩევითი კვლევითი და მათემატიკური პროგრამები (RSI, SSP, PROMYS, Mathcamp), Yale Young Global Scholars და უნივერსიტეტების საზაფხულო სესიები.' } },
    { key: 'competition', icon: 'trending', name: { en: 'Competitions', ka: 'კონკურსები' },
      blurb: { en: 'Olympiads, essay prizes, hackathons, science fairs and student startup competitions such as the Diamond Challenge and the Hult Prize.',
               ka: 'ოლიმპიადები, ესეების კონკურსები, ჰაკათონები, სამეცნიერო გამოფენები და სტუდენტური სტარტაპ-კონკურსები, მაგალითად Diamond Challenge და Hult Prize.' } },
    { key: 'startup', icon: 'briefcase', name: { en: 'Startups & funding', ka: 'სტარტაპები და დაფინანსება' },
      blurb: { en: 'Accelerators and grants for young founders, from Y Combinator and the Thiel Fellowship to regional programmes in Doha and Tbilisi.',
               ka: 'აქსელერატორები და გრანტები ახალგაზრდა დამფუძნებლებისთვის — Y Combinator-იდან და Thiel Fellowship-იდან დოჰისა და თბილისის რეგიონულ პროგრამებამდე.' } },
    { key: 'youth', icon: 'sparkles', name: { en: 'Youth programmes', ka: 'ახალგაზრდული პროგრამები' },
      blurb: { en: 'Volunteering, leadership and fellowship programmes that are often the fastest first international experience.',
               ka: 'მოხალისეობა, ლიდერობისა და სტიპენდიის პროგრამები — ხშირად ყველაზე სწრაფი პირველი საერთაშორისო გამოცდილება.' } }
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
