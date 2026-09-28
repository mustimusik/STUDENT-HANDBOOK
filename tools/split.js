// Fast top-level splitter for document.xml body.
const fs = require("fs")
module.exports = function load(file) {
  const xml = fs.readFileSync(file, "utf8")
  const bStart = xml.indexOf("<w:body>") + 8, bEnd = xml.lastIndexOf("</w:body>")
  const els = []
  let i = bStart
  const tagAt = (k) => (xml.startsWith("<w:p>", k) || xml.startsWith("<w:p ", k) ? "w:p" : xml.startsWith("<w:tbl>", k) || xml.startsWith("<w:tbl ", k) ? "w:tbl" : xml.startsWith("<w:sectPr", k) ? "w:sectPr" : null)
  while (i < bEnd) {
    const t = tagAt(i)
    if (!t) { i++; continue }
    let d = 0, k = i
    const open = new RegExp("<" + t + "[ >]|</" + t + ">", "g")
    open.lastIndex = i
    let m
    while ((m = open.exec(xml))) { if (m[0][1] === "/") d--; else d++; if (d === 0) { k = open.lastIndex; break } }
    els.push(xml.slice(i, k)); i = k
  }
  return { xml, bStart, bEnd, els }
}
