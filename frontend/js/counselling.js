/* ============================================================
   Meridian — College counselling
   Meridian AI studio, two self-tests, mini-courses, the private
   board of the student's partner school, and the counsellors.
   ============================================================ */
(function () {
  'use strict';

  var data = null;
  var dialog, dialogBody;

  /* What students can work on with Meridian AI; each opens the chat with a starter */
  var TOOLS = [
    { icon: 'compass', title: { en: 'Plan my path', ka: 'ჩემი გზის დაგეგმვა', ar: 'خطط لمساري' },
      desc: { en: 'A month-by-month plan for tests, applications and deadlines.', ka: 'თვეების მიხედვით გეგმა გამოცდებისთვის, განაცხადებისა და ვადებისთვის.', ar: 'خطة شهرية للاختبارات والطلبات والمواعيد.' },
      ask: { en: 'Help me build a month-by-month plan for my university applications, using my profile.', ka: 'დამეხმარე ჩემი პროფილის მიხედვით უნივერსიტეტების განაცხადების თვიური გეგმის შედგენაში.', ar: 'ساعدني في إعداد خطة شهرية لطلبات الجامعات بناءً على ملفي.' } },
    { icon: 'cap', title: { en: 'Choose universities', ka: 'უნივერსიტეტების არჩევა', ar: 'اختيار الجامعات' },
      desc: { en: 'A reach / match / likely list from your scores and goals.', ka: 'ამბიციური / შესაფერისი / სავარაუდო სია შენი ქულებით.', ar: 'قائمة طموحة / مناسبة / مرجّحة حسب درجاتك.' },
      ask: { en: 'I want a balanced university list. Ask me for my scores, budget and interests, then suggest reach, match and likely options from Meridian.', ka: 'მინდა დაბალანსებული უნივერსიტეტების სია. მკითხე ქულები, ბიუჯეტი და ინტერესები და შემომთავაზე ვარიანტები Meridian-იდან.', ar: 'أريد قائمة جامعات متوازنة. اسألني عن درجاتي وميزانيتي واهتماماتي ثم اقترح خيارات من Meridian.' } },
    { icon: 'edit', title: { en: 'Essay coach', ka: 'ესეს მწვრთნელი', ar: 'مدرب المقالات' },
      desc: { en: 'Brainstorm, outline and get honest feedback on your drafts.', ka: 'იდეები, გეგმა და გულწრფელი უკუკავშირი შენს მონახაზებზე.', ar: 'أفكار وهيكل وملاحظات صادقة على مسوداتك.' },
      ask: { en: 'Be my personal statement coach. Start by asking me three questions to find my story.', ka: 'იყავი ჩემი პირადი ესეს მწვრთნელი. დაიწყე სამი კითხვით, რომ ჩემი ისტორია ვიპოვოთ.', ar: 'كن مدربي في البيان الشخصي. ابدأ بثلاثة أسئلة لنجد قصتي.' } },
    { icon: 'file', title: { en: 'CV & Europass', ka: 'CV და Europass', ar: 'السيرة الذاتية وEuropass' },
      desc: { en: 'Turn your activities into strong, specific CV lines.', ka: 'აქტივობები გადააქციე ძლიერ, კონკრეტულ CV-ის ხაზებად.', ar: 'حوّل أنشطتك إلى سطور قوية ومحددة في سيرتك.' },
      ask: { en: 'Help me write a student CV. I will list my activities; turn them into strong bullet points.', ka: 'დამეხმარე სტუდენტური CV-ის დაწერაში. ჩამოვწერ აქტივობებს, შენ გადააქციე ძლიერ პუნქტებად.', ar: 'ساعدني في كتابة سيرة ذاتية طلابية. سأذكر أنشطتي، فحوّلها إلى نقاط قوية.' } },
    { icon: 'mail', title: { en: 'Letters & emails', ka: 'წერილები და ელფოსტა', ar: 'الرسائل والبريد' },
      desc: { en: 'Motivation letters, cover letters and professional emails.', ka: 'სამოტივაციო და თანმხლები წერილები, პროფესიული ელფოსტა.', ar: 'خطابات الدافع والتغطية والرسائل المهنية.' },
      ask: { en: 'I need to write a professional email or motivation letter. Ask me who it is for and what I want, then help me draft it.', ka: 'მჭირდება პროფესიული წერილის ან სამოტივაციო წერილის დაწერა. მკითხე ვისთვისაა და რა მინდა, მერე დამეხმარე.', ar: 'أحتاج إلى كتابة بريد مهني أو خطاب دافع. اسألني لمن هو وماذا أريد ثم ساعدني في صياغته.' } },
    { icon: 'message', title: { en: 'Interview practice', ka: 'გასაუბრების ვარჯიში', ar: 'تدريب على المقابلة' },
      desc: { en: 'A mock university or scholarship interview, with feedback.', ka: 'საცდელი გასაუბრება უნივერსიტეტისთვის ან სტიპენდიისთვის.', ar: 'مقابلة تجريبية للجامعة أو المنحة مع ملاحظات.' },
      ask: { en: 'Run a mock interview with me for a university or scholarship. Ask one question at a time and give feedback after each answer.', ka: 'ჩამიტარე საცდელი გასაუბრება. დამისვი თითო კითხვა და ყოველი პასუხის შემდეგ მომეცი უკუკავშირი.', ar: 'أجرِ معي مقابلة تجريبية. اسأل سؤالاً واحداً في كل مرة وقدّم ملاحظات بعد كل إجابة.' } },
    { icon: 'award', title: { en: 'Scholarship finder', ka: 'სტიპენდიების მოძიება', ar: 'البحث عن المنح' },
      desc: { en: 'Fully and partly funded options that match you.', ka: 'სრულად და ნაწილობრივ დაფინანსებული ვარიანტები.', ar: 'خيارات ممولة كلياً أو جزئياً تناسبك.' },
      ask: { en: 'Find scholarships on Meridian that fit me. Ask what level, country and field I want first.', ka: 'მიპოვე ჩემთვის შესაფერისი სტიპენდიები Meridian-ზე. ჯერ მკითხე საფეხური, ქვეყანა და სფერო.', ar: 'ابحث لي عن منح مناسبة على Meridian. اسألني أولاً عن المرحلة والبلد والمجال.' } },
    { icon: 'briefcase', title: { en: 'Career path', ka: 'კარიერული გზა', ar: 'المسار المهني' },
      desc: { en: 'Explore careers and what to study for them.', ka: 'გაიცანი პროფესიები და რა უნდა ისწავლო მათთვის.', ar: 'استكشف المهن وما تحتاج دراسته لها.' },
      ask: { en: 'Help me explore careers that fit my interests, and what I should study and do now to get there.', ka: 'დამეხმარე ჩემს ინტერესებზე მორგებული პროფესიების მოძიებაში და რა უნდა ვისწავლო ახლა.', ar: 'ساعدني في استكشاف مهن تناسب اهتماماتي وما يجب أن أدرسه الآن للوصول إليها.' } }
  ];

  function P(v) { return M.pick(v); }
  function list(v) { var x = P(v); return Array.isArray(x) ? x : x ? [x] : []; }
  function paras(text) {
    return String(text || '').split(/\n{2,}|\n/).filter(Boolean).map(function (p) { return '<p>' + M.esc(p) + '</p>'; }).join('');
  }

  /* ---------------------------------------------------------- studio */
  function paintTools() {
    document.getElementById('ccTools').innerHTML = TOOLS.map(function (tool) {
      return '<button type="button" class="cc-tool" data-ask-ai="' + M.esc(P(tool.ask)) + '">' +
        '<span class="cc-tool-ico">' + M.icon(tool.icon, 20) + '</span>' +
        '<b>' + M.esc(P(tool.title)) + '</b><span>' + M.esc(P(tool.desc)) + '</span></button>';
    }).join('');
  }

  /* ---------------------------------------------------------- dialog */
  function openDialog(html) {
    dialogBody.innerHTML = '<button type="button" class="cc-x" data-close aria-label="Close">' + M.icon('x', 20) + '</button>' + html;
    dialogBody.querySelector('[data-close]').addEventListener('click', function () { dialog.close(); });
    if (!dialog.open) dialog.showModal();
    dialogBody.scrollTop = 0;
  }

  /* ---------------------------------------------------------- self-tests */
  var QUIZ_META = {
    country: { icon: 'globe', minutes: 4 },
    career: { icon: 'briefcase', minutes: 5 }
  };

  function paintTests() {
    var quizzes = data.quizzes || {};
    var host = document.getElementById('ccTests');
    var keys = Object.keys(quizzes).filter(function (k) { return quizzes[k] && quizzes[k].questions; });
    host.innerHTML = keys.length ? keys.map(function (key) {
      var q = quizzes[key];
      var meta = QUIZ_META[key] || { icon: 'target', minutes: 4 };
      return '<article class="cc-test">' +
        '<span class="cc-test-ico">' + M.icon(meta.icon, 26) + '</span>' +
        '<h3>' + M.esc(P(q.title)) + '</h3>' +
        '<p class="muted">' + M.esc(P(q.intro)) + '</p>' +
        '<div class="cluster" style="margin-top:auto"><span class="badge">' + q.questions.length + ' ' + M.t('cc.questions') + '</span>' +
          '<span class="badge">~' + meta.minutes + ' min</span></div>' +
        '<button type="button" class="btn btn-primary" data-quiz="' + key + '">' + M.t('cc.start') + M.icon('arrowRight', 16) + '</button>' +
      '</article>';
    }).join('') : '<p class="muted">' + M.t('cc.soon') + '</p>';
    host.querySelectorAll('[data-quiz]').forEach(function (b) {
      b.addEventListener('click', function () { runQuiz(b.getAttribute('data-quiz')); });
    });
  }

  function runQuiz(key) {
    var quiz = data.quizzes[key];
    var answers = [];
    function step() {
      var i = answers.length;
      if (i >= quiz.questions.length) return finish();
      var q = quiz.questions[i];
      openDialog('<div class="quiz">' +
        '<div class="quiz-top"><span class="eyebrow">' + M.esc(P(quiz.title)) + '</span>' +
          '<span class="mono dim">' + (i + 1) + ' / ' + quiz.questions.length + '</span></div>' +
        '<div class="progress-line"><i style="width:' + Math.round(i / quiz.questions.length * 100) + '%"></i></div>' +
        '<h3 class="quiz-q">' + M.esc(P(q.q || q.question)) + '</h3>' +
        '<div class="quiz-options">' + (q.options || []).map(function (o, n) {
          return '<button type="button" data-opt="' + n + '">' + M.esc(P(o.t || o.text || o.label)) + '</button>';
        }).join('') + '</div>' +
        (i ? '<button type="button" class="link-btn" data-back>' + M.icon('chevronLeft', 14) + M.t('cc.back') + '</button>' : '') +
      '</div>');
      dialogBody.querySelectorAll('[data-opt]').forEach(function (b) {
        b.addEventListener('click', function () { answers.push(q.options[+b.getAttribute('data-opt')]); step(); });
      });
      var back = dialogBody.querySelector('[data-back]');
      if (back) back.addEventListener('click', function () { answers.pop(); step(); });
    }
    function finish() {
      var score = {};
      answers.forEach(function (o) {
        var s = o.score || o.scores || {};
        if (typeof s === 'string') s = (function () { var x = {}; x[s] = 1; return x; })();
        Object.keys(s).forEach(function (k) { score[k] = (score[k] || 0) + (+s[k] || 0); });
      });
      var ranked = Object.keys(score).sort(function (a, b) { return score[b] - score[a]; });
      var top = ranked.slice(0, key === 'career' ? 2 : 3).filter(function (k) { return quiz.results && quiz.results[k]; });
      M.track('page', 'quiz-' + key, { result: top.join(',') });
      openDialog('<div class="quiz quiz-result">' +
        '<span class="eyebrow">' + M.t('cc.result') + '</span>' +
        '<h3 class="quiz-q">' + M.esc(P(quiz.title)) + '</h3>' +
        top.map(function (k, n) { return resultCard(quiz.results[k], n, k, key); }).join('') +
        (P(quiz.note) ? '<p class="dim" style="font-size:.78rem">' + M.esc(P(quiz.note)) + '</p>' : '') +
        '<div class="cluster" style="margin-top:1rem">' +
          '<button type="button" class="btn btn-outline" data-again>' + M.t('cc.again') + '</button>' +
          '<button type="button" class="btn btn-primary" data-ask-ai="' + M.esc(M.t('cc.quizAi').replace('{r}', top.map(function (k) { return P(quiz.results[k].title) || k; }).join(', '))) + '">' +
            M.icon('sparkles', 16) + M.t('cc.discuss') + '</button>' +
        '</div></div>');
      dialogBody.querySelector('[data-again]').addEventListener('click', function () { answers = []; step(); });
      dialogBody.querySelector('[data-ask-ai]').addEventListener('click', function () { dialog.close(); });
    }
    step();
  }

  function resultCard(r, n, code, key) {
    var rows = [];
    ['body', 'description', 'why'].forEach(function (f) { if (P(r[f])) rows.push(paras(P(r[f]))); });
    if (P(r.costs)) rows.push('<p><b>' + M.t('cc.costs') + '</b> ' + M.esc(P(r.costs)) + '</p>');
    if (P(r.next)) rows.push('<p><b>' + M.t('cc.nextStep') + '</b> ' + M.esc(P(r.next)) + '</p>');
    var groups = [['professions', 'cc.professions'], ['careers', 'cc.professions'], ['fields', 'cc.fields'],
      ['study', 'cc.fields'], ['skills', 'cc.skills'], ['tips', 'cc.tips']];
    groups.forEach(function (g) {
      var items = list(r[g[0]]);
      if (items.length) rows.push('<p class="quiz-label">' + M.t(g[1]) + '</p><div class="tag-list">' +
        items.map(function (x) { return '<span class="badge">' + M.esc(typeof x === 'string' ? x : P(x)) + '</span>'; }).join('') + '</div>');
    });
    var search = P(r.search) || (key === 'country' ? P(r.title) : '');
    return '<article class="quiz-card' + (n === 0 ? ' is-top' : '') + '">' +
      '<div class="spread"><h4>' + (n === 0 ? '★ ' : '') + M.esc(P(r.title) || code) +
        (P(r.nickname) ? ' <small class="dim">· ' + M.esc(P(r.nickname)) + '</small>' : '') + '</h4>' +
      (search && key === 'country' ? '<a class="link-btn" href="/universities?q=' + encodeURIComponent(String(search).split(',')[0]) + '">' + M.t('cc.seeUnis') + '</a>' : '') +
      '</div>' + rows.join('') + '</article>';
  }

  /* ---------------------------------------------------------- courses */
  function paintCourses() {
    var host = document.getElementById('ccCourses');
    var courses = data.courses || [];
    host.innerHTML = courses.length ? courses.map(function (c, i) {
      return '<button type="button" class="cc-course" data-course="' + i + '">' +
        '<span class="cc-course-ico">' + M.icon(c.icon && M.icon(c.icon, 20) ? c.icon : 'book', 20) + '</span>' +
        '<b>' + M.esc(P(c.title)) + '</b>' +
        '<span>' + M.esc(P(c.summary)) + '</span>' +
        '<small>' + (c.lessons || []).length + ' ' + M.t('cc.lessons') + (c.minutes ? ' · ' + c.minutes + ' min' : '') + '</small>' +
      '</button>';
    }).join('') : '<p class="muted">' + M.t('cc.soon') + '</p>';
    host.querySelectorAll('[data-course]').forEach(function (b) {
      b.addEventListener('click', function () { openCourse(courses[+b.getAttribute('data-course')], 0); });
    });
  }

  function openCourse(course, index) {
    var lessons = course.lessons || [];
    var lesson = lessons[index];
    var nav = lessons.map(function (l, i) {
      return '<button type="button" data-lesson="' + i + '" aria-current="' + (i === index) + '"><span>' + (i + 1) + '</span>' + M.esc(P(l.title)) + '</button>';
    }).join('');
    var tips = list(lesson && lesson.tips);
    var last = index === lessons.length - 1;
    openDialog('<div class="course">' +
      '<span class="eyebrow">' + M.esc(P(course.title)) + '</span>' +
      '<div class="course-grid">' +
        '<nav class="course-nav">' + nav +
          (P(course.template) ? '<button type="button" data-lesson="template" aria-current="' + (index === 'template') + '"><span>✎</span>' + M.t('cc.template') + '</button>' : '') +
        '</nav>' +
        '<article class="course-body">' + (index === 'template'
          ? '<h3>' + M.t('cc.template') + '</h3><pre class="course-template">' + M.esc(P(course.template)) + '</pre>'
          : '<h3>' + M.esc(P(lesson.title)) + '</h3>' + paras(P(lesson.body)) +
            (tips.length ? '<div class="course-tips"><b>' + M.t('cc.tips') + '</b><ul>' + tips.map(function (t) { return '<li>' + M.esc(t) + '</li>'; }).join('') + '</ul></div>' : '')) +
          ((course.links || []).length && (last || index === 'template') ? '<div class="course-links">' + course.links.map(function (l) {
            return '<a href="' + M.esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + M.esc(P(l.title)) + M.icon('external', 13) + '</a>';
          }).join('') + '</div>' : '') +
          '<div class="cluster" style="margin-top:1.2rem">' +
            (typeof index === 'number' && !last ? '<button type="button" class="btn btn-primary btn-sm" data-lesson="' + (index + 1) + '">' + M.t('cc.next') + M.icon('arrowRight', 15) + '</button>' : '') +
            '<button type="button" class="btn btn-outline btn-sm" data-ask-ai="' + M.esc(M.t('cc.courseAi').replace('{c}', P(course.title))) + '">' + M.icon('sparkles', 15) + M.t('cc.practise') + '</button>' +
          '</div>' +
        '</article>' +
      '</div></div>');
    dialogBody.querySelectorAll('[data-lesson]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-lesson');
        openCourse(course, v === 'template' ? 'template' : +v);
      });
    });
    var ai = dialogBody.querySelector('[data-ask-ai]');
    if (ai) ai.addEventListener('click', function () { dialog.close(); });
  }

  /* ---------------------------------------------------------- my school */
  var KINDS = ['webinar', 'project', 'deadline', 'event', 'news'];

  function paintBoard() {
    var host = document.getElementById('ccBoard');
    var me = data.me;
    var mine = me.counsellor && me.counsellor.status === 'approved';
    var head = '<h2 class="op-h2">' + M.t('cc.board.title') + '</h2>';
    if (!me.schools.length) {
      host.innerHTML = head + '<div class="cc-board-empty">' + M.icon('building', 28) +
        '<p>' + M.t(me.authed ? 'cc.board.none' : 'cc.board.login') + '</p>' +
        (me.authed ? '<a class="btn btn-outline btn-sm" href="/pricing#schools">' + M.t('cc.board.invite') + '</a>'
          : '<a class="btn btn-primary btn-sm" href="/login?next=/counselling%23board">' + M.t('nav.login') + '</a>') +
      '</div>';
      return;
    }
    var posts = data.board || [];
    host.innerHTML = head +
      '<p class="muted">' + M.esc(me.schools.map(function (s) { return s.name; }).join(' · ')) + ' — ' + M.t('cc.board.private') + '</p>' +
      (mine ? postForm() : '') +
      '<div class="cc-posts">' + (posts.length ? posts.map(function (p) {
        return '<article class="cc-post">' +
          '<div class="cluster"><span class="badge badge-brand">' + M.t('cc.kind.' + p.kind) + '</span>' +
            (p.starts_at ? '<span class="badge">' + M.icon('calendar', 13) + ' ' + M.formatDate(p.starts_at) + '</span>' : '') + '</div>' +
          '<h3>' + M.esc(p.title) + '</h3>' + (p.body ? paras(p.body) : '') +
          '<div class="spread" style="margin-top:.6rem"><small class="dim">' + M.esc(p.first_name + ' ' + p.last_name) + ' · ' + M.esc(p.school) + '</small>' +
            '<span class="cluster">' + (p.link ? '<a class="link-btn" href="' + M.esc(p.link) + '" target="_blank" rel="noopener noreferrer">' + M.t('cc.open') + M.icon('external', 13) + '</a>' : '') +
            (mine ? '<button type="button" class="link-btn" data-del="' + p.id + '">' + M.t('cc.delete') + '</button>' : '') + '</span></div>' +
        '</article>';
      }).join('') : '<p class="muted">' + M.t('cc.board.empty') + '</p>') + '</div>';
    var form = document.getElementById('ccPostForm');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var body = { kind: form.kind.value, title: form.title.value, body: form.body.value, link: form.link.value, starts_at: form.starts.value };
      M.api('/api/school/posts', { body: body }).then(function (res) {
        if (!res.ok) return M.toast(M.t('common.error'), 'error');
        data.board = res.board; paintBoard(); M.toast(M.t('cc.posted'), 'success');
      });
    });
    host.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!window.confirm(M.t('cc.deleteConfirm'))) return;
        M.api('/api/school/posts/' + b.getAttribute('data-del'), { method: 'DELETE' }).then(function (res) {
          if (res.ok) { data.board = res.board; paintBoard(); }
        });
      });
    });
  }

  function postForm() {
    return '<form class="card cc-post-form" id="ccPostForm">' +
      '<b>' + M.t('cc.post.title') + '</b>' +
      '<div class="cc-form-row">' +
        '<label class="field"><span>' + M.t('cc.post.kind') + '</span><select class="select" name="kind">' +
          KINDS.map(function (k) { return '<option value="' + k + '">' + M.t('cc.kind.' + k) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>' + M.t('cc.post.date') + '</span><input class="input" type="date" name="starts" /></label>' +
      '</div>' +
      '<label class="field"><span>' + M.t('cc.post.heading') + '</span><input class="input" name="title" required maxlength="160" /></label>' +
      '<label class="field"><span>' + M.t('cc.post.body') + '</span><textarea class="textarea" name="body" rows="3" maxlength="3000"></textarea></label>' +
      '<label class="field"><span>' + M.t('cc.post.link') + '</span><input class="input" type="url" name="link" placeholder="https://" /></label>' +
      '<button type="submit" class="btn btn-primary btn-sm">' + M.t('cc.post.send') + '</button>' +
    '</form>';
  }

  /* ---------------------------------------------------------- counsellors */
  function paintPeople() {
    var host = document.getElementById('ccPeople');
    var people = data.counsellors || [];
    host.innerHTML = people.length ? people.map(function (c) {
      var initials = ((c.first_name || ' ')[0] + (c.last_name || ' ')[0]).toUpperCase();
      return '<article class="cc-person">' +
        '<span class="avatar avatar-md"><span>' + M.esc(initials) + '</span></span>' +
        '<div><h3>' + M.esc(c.first_name + ' ' + c.last_name) + '</h3>' +
        '<p class="muted">' + M.esc((c.title ? c.title + ' · ' : '') + c.school) + '</p>' +
        (c.expertise ? '<div class="tag-list" style="margin-top:.5rem">' + c.expertise.split(/\s*,\s*/).filter(Boolean).slice(0, 6).map(function (x) {
          return '<span class="badge">' + M.esc(x) + '</span>'; }).join('') + '</div>' : '') +
        (c.bio ? '<p style="margin-top:.6rem;font-size:.88rem">' + M.esc(c.bio) + '</p>' : '') +
        (c.languages ? '<p class="dim" style="font-size:.78rem;margin-top:.4rem">' + M.icon('globe', 13) + ' ' + M.esc(c.languages) + '</p>' : '') +
        '</div></article>';
    }).join('') : '<div class="cc-board-empty">' + M.icon('users', 28) + '<p>' + M.t('cc.c.empty') + '</p></div>';
  }

  function paintJoin() {
    var host = document.getElementById('ccJoin');
    var me = data.me;
    var btn = document.getElementById('ccJoinBtn');
    if (me.counsellor) {
      btn.hidden = true;
      host.innerHTML = '<div class="evidence" style="margin-top:1rem"><p><b>' + M.t('cc.join.status') + '</b> ' +
        M.t('cc.join.' + me.counsellor.status) + '</p></div>';
      return;
    }
    host.innerHTML = '<form class="card cc-join" id="join" hidden>' +
      '<h3>' + M.t('cc.join.title') + '</h3><p class="muted">' + M.t('cc.join.lede') + '</p>' +
      (me.authed ? '' : '<p class="evidence">' + M.t('cc.join.login') + '</p>') +
      '<div class="cc-form-row">' +
        '<label class="field"><span>' + M.t('cc.join.school') + '</span><input class="input" name="school" required maxlength="140" /></label>' +
        '<label class="field"><span>' + M.t('cc.join.role') + '</span><input class="input" name="title" maxlength="120" placeholder="' + M.esc(M.t('cc.join.rolePh')) + '" /></label>' +
      '</div>' +
      '<div class="cc-form-row">' +
        '<label class="field"><span>' + M.t('cc.join.expertise') + '</span><input class="input" name="expertise" maxlength="300" placeholder="' + M.esc(M.t('cc.join.expertisePh')) + '" /></label>' +
        '<label class="field"><span>' + M.t('cc.join.languages') + '</span><input class="input" name="languages" maxlength="120" placeholder="English, ქართული, العربية" /></label>' +
      '</div>' +
      '<label class="field"><span>' + M.t('cc.join.bio') + '</span><textarea class="textarea" name="bio" rows="3" maxlength="1500"></textarea></label>' +
      (me.authed ? '<button type="submit" class="btn btn-primary">' + M.t('cc.join.send') + '</button>'
        : '<a class="btn btn-primary" href="/login?mode=register&next=/counselling%23join">' + M.t('common.signUp') + '</a>') +
    '</form>';
    var form = document.getElementById('join');
    btn.onclick = function (e) { e.preventDefault(); form.hidden = false; form.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    if (window.location.hash === '#join') form.hidden = false;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      M.api('/api/counsellors/apply', { body: {
        school: form.school.value, title: form.title.value, expertise: form.expertise.value,
        languages: form.languages.value, bio: form.bio.value } }).then(function (res) {
        if (!res.ok) return M.toast(M.t(res.error === 'already_applied' ? 'cc.join.already' : 'common.error'), 'error');
        data.me.counsellor = { status: 'pending' };
        paintJoin();
        M.toast(M.t('cc.join.sent'), 'success', 3200);
      });
    });
  }

  function paintAll() {
    paintTools();
    if (!data) return;
    paintTests(); paintCourses(); paintBoard(); paintPeople(); paintJoin();
  }

  function init() {
    dialog = document.getElementById('ccDialog');
    dialogBody = document.getElementById('ccDialogBody');
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    paintTools();
    M.api('/api/counselling').then(function (res) { data = res; paintAll(); })
      .catch(function () { M.toast(M.t('common.error'), 'error'); });
    window.addEventListener('meridian:lang', paintAll);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
