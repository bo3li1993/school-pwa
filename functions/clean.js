const fs = require("fs");
const content = fs.readFileSync("index.js", "utf8");
const lines = content.split("\n");
const clean = lines.map(line => {
  if (line.length > 300) {
    return line.replace(/"[^"]{80,}"/g, '"[msg]"').replace(/`[^`]{80,}`/g, "`[msg]`");
  }
  return line;
});
const result = clean.join("\n");
fs.writeFileSync("index_clean.js", result, "utf8");
require("fs").appendFileSync("clean_done.txt", "Size: " + result.length + "\n");
