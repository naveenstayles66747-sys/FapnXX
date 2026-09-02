async function testStream() {
  const code = "c3dbc9a5d726288d8a4b";
  const url = "https://www.pornhub.org/embed/" + code;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Referer": "https://www.pornhub.org/"
    }
  });
  const html = await res.text();
  console.log("Fetched embed HTML length:", html.length);
  
  const flashMatch = html.match(/var\s+flashvars_\d+\s*=\s*(\{.+?\});/);
  if (flashMatch) {
    console.log("Found flashvars JSON object!");
    try {
      const data = JSON.parse(flashMatch[1]);
      console.log("Video title:", data.video_title);
      console.log("Media definitions count:", data.mediaDefinitions?.length);
      if (data.mediaDefinitions) {
        data.mediaDefinitions.forEach(m => console.log("Format:", m.format, "Quality:", m.quality, "URL:", m.videoUrl));
      }
    } catch (e) {
      console.log("Parse error:", e.message);
    }
  } else {
    console.log("No flashvars found.");
  }
}
testStream();
