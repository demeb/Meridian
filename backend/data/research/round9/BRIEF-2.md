# Round 9, second pass — universities still below the bar

Read `backend/data/research/round9/BRIEF.md` and follow it, with these changes:
- Your batch is `backend/data/research/round9/batches2/eNNN.json` (8 universities).
  `previous_attempt` names the round-9 file with the latest record for each id and
  `facts_so_far` how many of the 8 quality-bar items it already has. Start from that
  record and add only what is missing, so each reaches at least 4.
- The first pass already tried the obvious pages. Try what it may have missed:
  the national portal (Study in China/Campus China, Study in India, Wafeden for Egypt,
  Study in Saudi, Study in Jordan, Study in Indonesia (Darmasiswa / IISMA pages),
  Study in Australia / CRICOS, Campus France, Study in Chile, Brazil PEC-G), the
  international office's PDF guide (use the PDF reader), the faculty pages, official
  social media posts of the international office, and `site:` searches in the local
  language (e.g. `site:edu.cn 留学生 本科 招生简章`, `site:ac.id mahasiswa asing`,
  `site:edu.eg الطلاب الوافدين`).
- At most 15 WebSearch calls.
Write `backend/data/research/round9/universities-eNNN.json` (same NNN), complete
records, `verified_at` "2026-11-16". Finish with `eNNN: X reach the bar, Y still below`.
