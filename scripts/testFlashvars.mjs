async function inspectFlashvars() {
  const code = "c3dbc9a5d726288d8a4b";
  const url = "https://www.pornhub.org/embed/" + code;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Referer": "https://www.pornhub.org/"
    }
  });
  const html = await res.text();
  const match = html.match(/var\s+flashvars\s*=\s*(\{[\s\S]*?\});/);
  if (match) {
    console.log("Matched flashvars!");
    const data = JSON.parse(match[1]);
    console.log("Keys in flashvars:", Object.keys(data));
    console.log("mediaDefinitions:", data.mediaDefinitions);
    console.log("video_title:", data.video_title);
    console.log("image_url:", data.image_url);
  }
}
inspectFlashvars();
