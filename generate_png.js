import { Jimp } from "jimp";

async function generateAppIcon() {
  // Create a new 512x512 image
  const image = new Jimp({ width: 512, height: 512, color: 0x06b6d4ff }); // Cyan background
  
  // Save as app-icon.png
  await image.write("app-icon.png");
  console.log("Successfully created app-icon.png using Jimp");
}

generateAppIcon().catch(console.error);
