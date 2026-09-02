async function inspectHtml() {
  const code = "c3dbc9a5d726288d8a4b";
  const url = "https://www.pornhub.org/embed/" + code;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Referer": "https://www.pornhub.org/"
    }
  });
  const html = await res.text();
  const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi);
  console.log("Total script tags:", scriptMatches?.length);
  if (scriptMatches) {
    for (let i = 0; i < scriptMatches.length; i++) {
      const s = scriptMatches[i];
      if (s.includes("player_") || s.includes("videoUrl") || s.includes("mediaDefinitions") || s.includes("quality") || s.includes("phncdn") || s.includes("player")) {
        console.log(`--- Script ${i} ---`);
        console.log(s.substring(0, 400));
      }
    }
  }
}
inspectHtml();
