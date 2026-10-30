#!/bin/sh
# Builds one study page from the shell: head.html, then the page's own sources (STUDY and its painters), then shell.js, as one
# self-contained HTML file.
#   sh "<skill>/shell/build.sh" "Spinner look" page.html src/study.js [src/painters.js ...]
set -e
here=$(cd "$(dirname "$0")" && pwd)
title=$1; out=$2; shift 2
esc=$(printf '%s' "$title" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/[\/&]/\\&/g')
{
  sed "s/{{TITLE}}/$esc/" "$here/head.html"
  printf '<script>\n(() => {\n'"'"'use strict'"'"';\n'
  for f in "$@"; do printf '// ---- %s\n' "$(basename "$f")"; cat "$f"; printf '\n'; done
  cat "$here/shell.js"
  printf '})();\n</script>\n'
} > "$out"
wc -c "$out"
