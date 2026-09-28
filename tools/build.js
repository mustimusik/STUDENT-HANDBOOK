// Student Handbook Level 0 — built on the Student_Handbook_Grade_1.docx design
// (backgrounds, header/footer, Montserrat), with new content and visuals.
const fs = require("fs")
const path = require("path")
const JSZip = require("jszip")
const load = require("./split.js")
// Usage: node tools/build.js [level]   (default 0)
const LEVEL = process.argv[2] ?? "0"
const ROOT = path.join(__dirname, "..")
const LEVEL_DIR = path.join(ROOT, `level-${LEVEL}`)
const C = require(path.join(LEVEL_DIR, "content.js"))
const songs = require(path.join(ROOT, "data", `level-${LEVEL}-songs.json`))

const TEMPLATE = path.join(ROOT, "template", "Student_Handbook_Grade_1.docx")
const OUT = path.join(LEVEL_DIR, `Student_Handbook_Level_${LEVEL}.docx`)

// ---------- palette (from the template) ----------
const NAVY = "153B7A", WHITE = "FFFFFF", BORDER = "9DD4FF"
const PINK = "FF8FB3", LPINK = "FFF3F7", YELLOW = "FFD85A", LYELLOW = "FFF8DC"
const BLUE = "56B6FF", LBLUE = "EEF7FF", GREEN = "8DD764", LGREEN = "F1FAE9", CELL = "F8FCFF", GRAYTXT = "5D7383"
const ADV_COLORS = [PINK, YELLOW, GREEN, BLUE, "B99CFF"]
const FULL = 9978 // table width used by the template (twips)

// ---------- xml helpers ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const FONT = '<w:rFonts w:ascii="Montserrat" w:cs="Montserrat" w:eastAsia="Montserrat" w:hAnsi="Montserrat"/>'
function r(text, o = {}) {
  const sz = o.sz ?? 24 // half-points: 24 = 12 pt minimum
  return `<w:r><w:rPr>${FONT}${o.b ? '<w:b w:val="1"/><w:bCs w:val="1"/>' : ""}${o.i ? '<w:i w:val="1"/>' : ""}<w:color w:val="${o.color ?? NAVY}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`
}
function p(runs, o = {}) {
  return `<w:p><w:pPr><w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 0}" w:line="${o.line ?? 264}" w:lineRule="auto"/><w:jc w:val="${o.jc ?? "left"}"/></w:pPr>${Array.isArray(runs) ? runs.join("") : runs}</w:p>`
}
const spacer = (twips = 140) => `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${twips}" w:lineRule="exact"/></w:pPr></w:p>`
const pageBreak = () => `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`
function cell(paras, o = {}) {
  const b = (side) => `<w:${side} w:color="${o.border ?? BORDER}" w:space="0" w:sz="8" w:val="single"/>`
  return `<w:tc><w:tcPr><w:tcW w:w="${o.w}" w:type="dxa"/>${o.span ? `<w:gridSpan w:val="${o.span}"/>` : ""}<w:tcBorders>${b("top")}${b("left")}${b("bottom")}${b("right")}</w:tcBorders><w:shd w:fill="${o.fill ?? WHITE}" w:val="clear"/><w:tcMar><w:top w:w="${o.pad ?? 90}" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="${o.pad ?? 90}" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar><w:vAlign w:val="${o.v ?? "center"}"/></w:tcPr>${(Array.isArray(paras) ? paras : [paras]).join("")}</w:tc>`
}
function row(cells, o = {}) {
  return `<w:tr><w:trPr><w:cantSplit w:val="1"/>${o.h ? `<w:trHeight w:val="${o.h}" w:hRule="${o.hRule ?? "atLeast"}"/>` : ""}</w:trPr>${cells.join("")}</w:tr>`
}
function table(widths, rows) {
  const total = widths.reduce((a, b) => a + b, 0)
  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblLook w:val="0400"/></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>`
}
// Full-width coloured bar with a title (like "MATERI SINGKAT").
const bar = (text, fill, color = WHITE, sz = 28) => table([FULL], [row([cell(p(r(text, { b: true, sz, color }), { jc: "center" }), { w: FULL, fill, pad: 110 })])])

// ---------- images ----------
const images = [] // { id, file, name }
let docPr = 1000
function image(file, maxWcm, maxHcm) {
  const buf = fs.readFileSync(file)
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20)
  let wcm = maxWcm, hcm = (maxWcm * h) / w
  if (hcm > maxHcm) { hcm = maxHcm; wcm = (maxHcm * w) / h }
  const cx = Math.round(wcm * 360000), cy = Math.round(hcm * 360000)
  const id = `rIdHB${images.length + 1}`, name = `hb_${path.basename(file)}`
  images.push({ id, file, name })
  const n = ++docPr
  return `<w:p><w:pPr><w:spacing w:before="60" w:after="60"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Visual ${n}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
}

// Visual + caption inside an opaque white card, so the page background never shows through.
function visualCard(file, maxW, maxH, caption) {
  const paras = [image(file, maxW, maxH)]
  if (caption) paras.push(p(r(caption, { i: true, sz: 24, color: GRAYTXT }), { jc: "center", after: 40 }))
  return table([FULL], [row([cell(paras, { w: FULL, fill: WHITE, pad: 60 })])])
}
// Plain sentence on a white card (for intros on list pages).
const note = (text, o = {}) => table([FULL], [row([cell(p(r(text, { sz: o.sz ?? 24, b: o.b }), { jc: "center" }), { w: FULL, fill: o.fill ?? WHITE, pad: 90 })])])

// ---------- song data from the curriculum ----------
const bank = new Map()
for (const b of songs.bank) bank.set(`${b.term}-${b.no}`, b)
const bankRows = [...bank.values()].sort((a, b) => a.term - b.term || a.no - b.no)
function songInfo(n) {
  const note = songs.songNotes[n] ?? ""
  const slot = (note.match(/\[Lagu (\d+)\]/) || [])[1]
  const term = (note.match(/Term (\d+)/) || [])[1]
  const wajib = (note.match(/WAJIB A\d+: ([^·]+)/) || [])[1]?.trim()
  const how = (note.split("·").pop() || "").trim()
  return { slot, term, wajib, how }
}

// ---------- pages ----------
const body = []
const two = (n) => String(n).padStart(2, "0")

function titleTable(num, title, tag) {
  return table([1800, FULL - 1800], [row([
    cell(p(r(num, { b: true, sz: 32, color: WHITE }), { jc: "center" }), { w: 1800, fill: PINK }),
    cell(p([r(title, { b: true, sz: 30 }), tag ? r("   " + tag, { b: true, sz: 24, color: "C2185B" }) : ""]), { w: FULL - 1800, fill: LYELLOW }),
  ])])
}

function howToUse() {
  body.push(spacer(200), bar("CARA PAKAI HANDBOOK", BLUE, WHITE, 30), spacer())
  const steps = [
    ["Buka skill yang sedang kamu pelajari. Nomornya sama dengan nomor skill di app.", PINK],
    ["Baca Fokus Materi dan lihat gambarnya.", YELLOW],
    ["Baca Materi Singkat, lalu langsung coba di piano.", GREEN],
    ["Mainkan lagu untuk skill ini. Partiturnya ada di halaman berikutnya.", BLUE],
  ]
  body.push(table([1300, FULL - 1300], steps.map(([t, f], i) => row([
    cell(p(r(String(i + 1), { b: true, sz: 36, color: WHITE }), { jc: "center" }), { w: 1300, fill: f }),
    cell(p(r(t, { sz: 26 })), { w: FULL - 1300, fill: CELL, pad: 160 }),
  ]))))
  body.push(spacer(240), table([FULL], [row([cell([
    p(r("Tanda di handbook", { b: true, sz: 26 }), { after: 80 }),
    p([r("★ Checkpoint", { b: true, color: "C2185B" }), r("  —  tampil lagu wajib di akhir adventure.")], { after: 60 }),
    p([r("♛ Ujian Level", { b: true, color: "C2185B" }), r("  —  ujian di skill terakhir.")]),
  ], { w: FULL, fill: LYELLOW, pad: 180 })])]))
  body.push(pageBreak())
}

function levelMap() {
  body.push(spacer(200), bar(`PETA LEVEL ${C.level} — ${C.title.toUpperCase()}`, BLUE, WHITE, 30), spacer())
  const W1 = 3700, W2 = 1700, W3 = FULL - W1 - W2
  const head = row([
    cell(p(r("Adventure", { b: true, color: WHITE })), { w: W1, fill: NAVY }),
    cell(p(r("Skill", { b: true, color: WHITE }), { jc: "center" }), { w: W2, fill: NAVY }),
    cell(p(r("Lagu wajib", { b: true, color: WHITE })), { w: W3, fill: NAVY }),
  ])
  const rows = C.adventures.map((a, i) => row([
    cell(p([r(`${a.order}. `, { b: true }), r(a.title, { b: true })]), { w: W1, fill: ADV_COLORS[i] === BLUE || ADV_COLORS[i] === "B99CFF" ? LBLUE : i === 0 ? LPINK : i === 1 ? LYELLOW : LGREEN, pad: 150 }),
    cell(p(r(a.skills), { jc: "center" }), { w: W2, fill: CELL }),
    cell(p(r(`${a.song} (${a.genre})`)), { w: W3, fill: CELL }),
  ]))
  body.push(table([W1, W2, W3], [head, ...rows]))
  body.push(spacer(240), table([FULL], [row([cell([
    p(r("Checkpoint ★ ada di Skill 8, 16, 24, dan 32.", { sz: 24 }), { after: 60 }),
    p(r("Ujian Level 0 ♛ ada di Skill 40.", { sz: 24 })),
  ], { w: FULL, fill: LYELLOW, pad: 160 })])]))
  body.push(pageBreak())
}

function adventureOpener(a, i) {
  const color = ADV_COLORS[i]
  body.push(spacer(200))
  body.push(table([2600, FULL - 2600], [row([
    cell(p(r(`ADVENTURE ${a.order}`, { b: true, sz: 28, color: WHITE }), { jc: "center" }), { w: 2600, fill: color === YELLOW || color === GREEN ? NAVY : color }),
    cell(p(r(a.title, { b: true, sz: 36 })), { w: FULL - 2600, fill: LYELLOW, pad: 160 }),
  ])]))
  body.push(spacer(), table([FULL], [row([cell([
    p(r("Di adventure ini kamu belajar:", { b: true, sz: 26 }), { after: 80 }),
    p(r(a.about, { sz: 26 }), { line: 300 }),
  ], { w: FULL, fill: CELL, pad: 180 })])]))
  body.push(spacer(), bar("SKILL DI ADVENTURE INI", BLUE))
  const list = C.skills.filter((s) => s.n >= Number(a.skills.split("–")[0]) && s.n <= Number(a.skills.split("–")[1]))
  body.push(table([1300, FULL - 1300], list.map((s) => row([
    cell(p(r(two(s.n), { b: true, color: WHITE }), { jc: "center" }), { w: 1300, fill: s.kind ? "C2185B" : PINK, pad: 60 }),
    cell(p([r(s.title), s.kind === "checkpoint" ? r("  ★", { b: true, color: "C2185B" }) : "", s.kind === "ujian" ? r("  ♛", { b: true }) : ""]), { w: FULL - 1300, fill: CELL, pad: 60 }),
  ]))))
  body.push(spacer(), table([3000, FULL - 3000], [row([
    cell(p(r("LAGU WAJIB", { b: true, color: WHITE }), { jc: "center" }), { w: 3000, fill: GREEN }),
    cell(p([r(a.song, { b: true, sz: 26 }), r(`  (${a.genre})`)]), { w: FULL - 3000, fill: LGREEN, pad: 120 }),
  ])]))
  body.push(pageBreak())
}

function songTable(s) {
  const info = songInfo(s.n)
  const LEFT = 3000
  let left, right
  if (s.kind === "ujian") {
    left = [p(r("LAGU UJIAN", { b: true, sz: 24 }), { jc: "center" })]
    right = [p([r("Lagu wajib: ", { b: true }), r("What a Wonderful World")], { after: 60 }), p(r("+ 2 lagu pilihan dari Level 0 dengan genre berbeda."))]
  } else if (info.wajib) {
    left = [p(r("★ LAGU WAJIB", { b: true, sz: 24 }), { jc: "center" })]
    right = [p(r(info.wajib, { b: true, sz: 28 }), { after: 60 }), p(r(s.kind === "checkpoint" ? "Tampil: mainkan utuh di depan guru." : `Latihan: ${info.how.replace(/^Belajar: /, "")}.`))]
  } else {
    left = [p(r(`LAGU ${info.slot}`, { b: true, sz: 24 }), { jc: "center", after: 40 }), p(r(`Pilihan Term ${info.term}`, { sz: 24 }), { jc: "center" })]
    const learn = /^Belajar/.test(info.how)
    right = [
      p([r(learn ? "Pilih 1 lagu dari Daftar Lagu Term " + info.term + "." : "Lagu yang sama dengan skill sebelumnya.", { b: true })], { after: 60 }),
      p(r(learn ? "Pelajari bagian awal: tangan terpisah, lalu gabung." : "Mantapkan: lagu utuh, tempo stabil, dinamika."), { after: 80 }),
      p([r("Lagu pilihanku: ", { b: true }), r("______________________________")]),
    ]
  }
  return [
    bar("LAGU UNTUK SKILL INI", GREEN),
    table([LEFT, FULL - LEFT], [row([cell(left, { w: LEFT, fill: LGREEN, pad: 140 }), cell(right, { w: FULL - LEFT, fill: CELL, pad: 140 })])]),
  ]
}

function skillPages(s) {
  const tag = s.kind === "checkpoint" ? "★ CHECKPOINT" : s.kind === "ujian" ? "♛ UJIAN" : ""
  // Page A — materi
  body.push(spacer(160), titleTable(two(s.n), s.title, tag), spacer(100))
  body.push(table([2600, FULL - 2600], [row([
    cell(p(r("FOKUS MATERI", { b: true, sz: 24 }), { jc: "center" }), { w: 2600, fill: YELLOW }),
    cell(p(r(s.fokus, { sz: 24 })), { w: FULL - 2600, fill: CELL, pad: 110 }),
  ])]))
  if (s.visual) {
    const tall = { hands: 5.2, staff: 5.6, staff2: 5.4, times: 4.2 }[s.visual.type] ?? 4.4
    body.push(visualCard(path.join(LEVEL_DIR, "img", `skill${two(s.n)}.png`), 15.5, tall, s.visual.caption), spacer(100))
  } else body.push(spacer(120))
  const NUM = 900
  body.push(bar("MATERI SINGKAT", BLUE))
  body.push(table([NUM, FULL - NUM], [
    ...s.points.map(([label, text], i) => row([
      cell(p(r(String(i + 1), { b: true, sz: 26, color: "C2185B" }), { jc: "center" }), { w: NUM, fill: LPINK, pad: 80 }),
      cell(p([r(label + ": ", { b: true }), r(text)]), { w: FULL - NUM, fill: i % 2 ? LBLUE : CELL, pad: 80 }),
    ])),
    row([cell(p([r("➜ Target: ", { b: true }), r(s.target)]), { w: FULL, span: 2, fill: LYELLOW, pad: 100 })]),
  ]))
  body.push(spacer(120), songPointer(s), pageBreak())
}

// One line on the skill page telling which song to play; the songs themselves
// are collected in the Lagu section at the end of the book.
function songPointer(s) {
  const info = songInfo(s.n)
  const LEFT = 2600
  const what = s.kind === "ujian"
    ? "Lagu 20 (What a Wonderful World) + 2 lagu pilihan beda genre"
    : info.wajib ? `Lagu ${info.slot}: ${info.wajib} (lagu wajib)` : `Lagu ${info.slot} (pilihan Term ${info.term})`
  const how = s.kind === "checkpoint" ? "Tampil utuh di depan guru." : s.kind === "ujian" ? "" : /^Belajar/.test(info.how) ? "Pelajari bagian awal, tangan terpisah lalu gabung." : "Mantapkan: lagu utuh, tempo stabil, dinamika."
  return table([LEFT, FULL - LEFT], [row([
    cell(p(r("🎵 LAGU", { b: true, color: WHITE }), { jc: "center" }), { w: LEFT, fill: GREEN }),
    cell([p(r(what, { b: true })), how ? p(r(how)) : "", p(r("Partitur ada di bagian Lagu, di akhir buku.", { i: true, color: GRAYTXT }))], { w: FULL - LEFT, fill: LGREEN, pad: 110 }),
  ])])
}

// Lagu 1–20 of the level: which skills use each, and its title when it is a lagu wajib.
function songSlots() {
  const slots = new Map()
  for (const sk of C.skills) {
    const info = songInfo(sk.n)
    if (!info.slot) continue
    const e = slots.get(info.slot) ?? { slot: Number(info.slot), skills: [], term: info.term, wajib: info.wajib }
    e.skills.push(sk.n)
    if (info.wajib && !e.wajib) e.wajib = info.wajib // keep the plain title, not the exam note
    slots.set(info.slot, e)
  }
  return [...slots.values()].sort((a, b) => a.slot - b.slot)
}

function songSectionOpener() {
  body.push(spacer(200), bar("BAGIAN LAGU", GREEN, WHITE, 34), spacer())
  body.push(table([FULL], [row([cell([
    p(r("Semua lagu Level " + C.level + " ada di sini. Pilih lagu dari Daftar Lagu; lagu wajib (★) sama untuk semua murid.", { sz: 24 })),
  ], { w: FULL, fill: CELL, pad: 120 })])]))
  body.push(spacer(), bar("LAGU LEVEL " + C.level, BLUE))
  const W1 = 1700, W2 = 2700
  body.push(table([W1, W2, FULL - W1 - W2], songSlots().map((e) => row([
    cell(p(r("Lagu " + e.slot, { b: true, color: WHITE }), { jc: "center", line: 240 }), { w: W1, fill: e.wajib ? "C2185B" : PINK, pad: 20 }),
    cell(p(r("Skill " + e.skills.join(", ")), { line: 240 }), { w: W2, fill: CELL, pad: 20 }),
    cell(p(r(e.wajib ? "★ " + e.wajib : "Pilihan Term " + e.term, { b: !!e.wajib }), { line: 240 }), { w: FULL - W1 - W2, fill: e.wajib ? LYELLOW : CELL, pad: 20 }),
  ]))))
  body.push(pageBreak())
}

function sheetPages() {
  for (const e of songSlots()) {
    body.push(spacer(160))
    body.push(table([1800, FULL - 1800], [row([
      cell(p(r("LAGU " + e.slot, { b: true, sz: 28, color: WHITE }), { jc: "center" }), { w: 1800, fill: e.wajib ? "C2185B" : PINK }),
      cell(p([r(e.wajib ? e.wajib : "Lagu pilihan", { b: true, sz: 30 }), e.wajib ? r("   ★ LAGU WAJIB", { b: true, sz: 24, color: "C2185B" }) : ""]), { w: FULL - 1800, fill: LYELLOW }),
    ])]), spacer(100))
    body.push(table([3200, FULL - 3200], [row([
      cell([p(r("Dipakai di", { b: true }), { jc: "center" }), p(r("Skill " + e.skills.join(" & "), { b: true }), { jc: "center" })], { w: 3200, fill: YELLOW }),
      cell(e.wajib
        ? [p(r("Lagu ini sama untuk semua murid."))]
        : [p([r("Judul lagu: ", { b: true }), r("______________________________")], { after: 60 }), p(r(`Pilih dari Daftar Lagu Term ${e.term}.`, { color: GRAYTXT }))], { w: FULL - 3200, fill: LGREEN, pad: 140 }),
    ])]), spacer(100))
    body.push(table([FULL], [row([cell([
      p(r("AREA SHEET MUSIC", { b: true, sz: 24, color: GRAYTXT }), { jc: "center", after: 80 }),
      p(r("Tempel atau sisipkan partitur lagu di sini.", { sz: 24, color: GRAYTXT }), { jc: "center" }),
    ], { w: FULL, fill: WHITE, v: "center" })], { h: 8200, hRule: "exact" })]))
    body.push(pageBreak())
  }
}

function songList() {
  const GW = Math.floor(FULL / 4)
  const widths = [GW, GW, GW, FULL - 3 * GW]
  for (const terms of [[1, 2], [3, 4]]) {
    body.push(spacer(160), bar(`DAFTAR LAGU LEVEL ${C.level}`, GREEN, WHITE, 30), spacer(80))
    body.push(note("Pilih lagu yang kamu suka. Centang lagu yang sudah kamu mainkan."), spacer(80))
    for (const t of terms) {
      const rows = bankRows.filter((b) => b.term === t)
      body.push(bar(`TERM ${t}  •  Skill ${(t - 1) * 10 + 1}–${t * 10}`, BLUE, WHITE, 26))
      const head = row(["Pop", "Jazz", "Worship", "Klasik"].map((g, k) => cell(p(r(g + (k === 3 ? " (segera)" : ""), { b: true, color: WHITE }), { jc: "center" }), { w: widths[k], fill: k === 3 ? "9AA9B8" : NAVY, pad: 70 })))
      const body2 = rows.map((b) => row(["pop", "jazz", "worship", "klasik"].map((k, j) => {
        const song = b[k] && !/KURANG LAGU/i.test(b[k].title) ? b[k].title.replace(/\s*—.*$/, "") : "—"
        return cell(p([r("☐ ", { sz: 24 }), r(song, { sz: 24, color: j === 3 ? GRAYTXT : NAVY })]), { w: widths[j], fill: j === 3 ? "F2F4F7" : CELL, pad: 70, v: "top" })
      })))
      body.push(table(widths, [head, ...body2]), spacer(160))
    }
    body.push(pageBreak())
  }
}

function checklist() {
  body.push(spacer(160), bar(`CHECKLIST NAIK LEVEL ${C.level}`, PINK, WHITE, 30), spacer(80))
  body.push(note("Centang kalau kamu sudah bisa!", { sz: 26, b: true }), spacer(80))
  const items = [
    "Aku bisa duduk seperti pianis dan melakukan 5 Langkah Siap Main.",
    "Aku bisa menemukan semua C dan F di piano, dan tahu Middle C.",
    "Aku hafal 7 huruf musik: A B C D E F G.",
    "Aku bisa membaca not angka 1–7 dan titik atas / bawah.",
    "Aku bisa memainkan chord C, F, G dan power chord tangan kiri.",
    "Aku bisa memainkan scale C, G, dan F (tangan terpisah).",
    "Aku bisa membaca Middle C sampai G di Kunci G, dan F sampai C di Kunci F.",
    "Aku tahu nilai not dan tanda diam (1, 2, 3, 4 ketuk).",
    "Aku bisa membedakan chord mayor (terang) dan minor (sedih).",
    "Aku tahu ♯ kres, ♭ mol, ♮ natural, dan tanda mula.",
    "Aku bisa bermain keras dan lembut (p, mp, mf, f).",
    "Aku bisa memainkan 5 lagu wajib Level 0.",
  ]
  body.push(table([900, FULL - 900], items.map((t, i) => row([
    cell(p(r("☐", { sz: 32 }), { jc: "center" }), { w: 900, fill: i % 2 ? LPINK : LYELLOW, pad: 70 }),
    cell(p(r(t, { sz: 24 })), { w: FULL - 900, fill: CELL, pad: 70 }),
  ]))))
  body.push(pageBreak())
}

function practiceLog() {
  body.push(spacer(160), bar("LOG LATIHAN MINGGUAN", YELLOW, NAVY, 30), spacer(80))
  body.push(note("Latihan 10–15 menit sehari. Isi menitnya, lalu minta paraf orang tua."), spacer(80))
  const days = ["Minggu", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min", "Paraf"]
  const w0 = 1500, wp = 1350, wd = Math.floor((FULL - w0 - wp) / 7)
  const widths = [w0, ...Array(7).fill(wd), FULL - w0 - wp - 7 * wd + wp]
  const head = row(days.map((d, i) => cell(p(r(d, { b: true, color: WHITE, sz: 24 }), { jc: "center" }), { w: widths[i], fill: NAVY, pad: 60 })))
  const rows = Array.from({ length: 10 }, (_, k) => row(days.map((d, i) => cell(p(r(i === 0 ? `Ke-${k + 1}` : "", { sz: 24, b: i === 0 }), { jc: "center" }), { w: widths[i], fill: i === 0 ? LBLUE : CELL, pad: 60 })), { h: 620 }))
  body.push(table(widths, [head, ...rows]))
}

// ---------- assemble ----------
;(async () => {
  const zip = await JSZip.loadAsync(fs.readFileSync(TEMPLATE))
  const docXml = await zip.file("word/document.xml").async("string")
  const tmp = path.join(require("os").tmpdir(), "hb-template-doc.xml")
  fs.writeFileSync(tmp, docXml)
  const { xml, bStart, bEnd, els } = load(tmp)

  // Cover: the template's first page, relabelled and with text at least 12 pt.
  const coverEnd = els.findIndex((e) => /w:br w:type="page"/.test(e))
  const cover = els.slice(0, coverEnd).filter((e) => !e.startsWith("<w:tbl")).map((e) =>
    e.replace(/GRADE 1/g, `LEVEL ${C.level}`)
      .replace(/<w:r(?: [^>]*)?>(<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t[^>]*>([^<]*)<\/w:t>/g, (m) => (/<w:t[^>]*> ?<\/w:t>/.test(m) ? m : m.replace(/<w:sz w:val="(\d+)"\/><w:szCs w:val="\d+"\/>/, (mm, v) => (Number(v) < 24 ? '<w:sz w:val="24"/><w:szCs w:val="24"/>' : mm)))),
  )
  body.push(...cover, pageBreak())

  howToUse()
  levelMap()
  C.adventures.forEach((a, i) => {
    adventureOpener(a, i)
    const [from, to] = a.skills.split("–").map(Number)
    C.skills.filter((s) => s.n >= from && s.n <= to).forEach(skillPages)
  })
  songSectionOpener()
  songList()
  sheetPages()
  checklist()
  practiceLog()

  const sectPr = xml.slice(xml.lastIndexOf("<w:sectPr"), bEnd)
  const newDoc = xml.slice(0, bStart) + body.join("") + sectPr + xml.slice(bEnd)
  zip.file("word/document.xml", newDoc)

  // Footer label, images, relationships, content types.
  const footer = await zip.file("word/footer1.xml").async("string")
  zip.file("word/footer1.xml", footer.replace(/GRADE 1/g, `LEVEL ${C.level}`))
  let rels = await zip.file("word/_rels/document.xml.rels").async("string")
  for (const im of images) {
    zip.file(`word/media/${im.name}`, fs.readFileSync(im.file))
    rels = rels.replace("</Relationships>", `<Relationship Id="${im.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${im.name}"/></Relationships>`)
  }
  zip.file("word/_rels/document.xml.rels", rels)
  let ct = await zip.file("[Content_Types].xml").async("string")
  if (!/Extension="png"/i.test(ct)) ct = ct.replace("<Types ", "<Types ").replace(/(<Types[^>]*>)/, '$1<Default Extension="png" ContentType="image/png"/>')
  zip.file("[Content_Types].xml", ct)

  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
  fs.writeFileSync(OUT, out)
  console.log("written", OUT, (out.length / 1024 / 1024).toFixed(1) + " MB", "| images", images.length, "| body parts", body.length)
  console.log("root has wp/a/pic ns:", /xmlns:wp=/.test(xml), /xmlns:a=/.test(xml), /xmlns:pic=/.test(xml), /xmlns:r=/.test(xml))
})()
