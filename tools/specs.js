// Export the visual specs of a level's content.js for tools/visuals.ps1.
// Usage: node tools/specs.js [level]   -> level-N/specs.json
const fs = require("fs")
const path = require("path")
const LEVEL = process.argv[2] ?? "0"
const dir = path.join(__dirname, "..", `level-${LEVEL}`)
const C = require(path.join(dir, "content.js"))
const specs = C.skills.filter((s) => s.visual).map((s) => ({ file: `skill${String(s.n).padStart(2, "0")}.png`, spec: s.visual }))
fs.writeFileSync(path.join(dir, "specs.json"), JSON.stringify(specs, null, 1))
console.log(`${specs.length} visual specs -> level-${LEVEL}/specs.json`)
