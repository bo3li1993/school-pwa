import re
with open("index.js", "r", encoding="utf-8", errors="replace") as f:
    content = f.read()
lines = content.split("\n")
clean = []
for line in lines:
    if len(line) > 300:
        line = re.sub(r'"[^"]{80,}"', '"[msg]"', line)
        line = re.sub(r"`[^`]{80,}`", "`[msg]`", line)
    clean.append(line)
result = "\n".join(clean)
with open("index_clean.js", "w", encoding="utf-8") as f:
    f.write(result)
print("Done. Size:", len(result)//1024, "KB")
