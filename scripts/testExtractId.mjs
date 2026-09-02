const embed = `<iframe src="https://www.pornhub.com/embed/c3dbc9a5d726288d8a4b" frameborder="0" height="481" width="608" scrolling="no"></iframe>`;
const match = embed.match(/\/embed\/([a-zA-Z0-9_-]+)/i);
console.log("Extracted video key:", match ? match[1] : "none");
