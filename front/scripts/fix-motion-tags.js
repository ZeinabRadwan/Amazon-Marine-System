const fs = require('fs')
const p = process.argv[2]
let c = fs.readFileSync(p, 'utf8')
c = c.replace(/<\/?motion\.motion\.div>/gi, (m) => (m.startsWith('</') ? '</' : '<') + 'div>')
fs.writeFileSync(p, c)
