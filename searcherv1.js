const axios = require('axios');
const cheerio = require('cheerio');

// Now accept an ARRAY of links
async function scrapeVideoUrls(pageUrls) {
  const videoLinks = [];

  for (const pageUrl of pageUrls) {
    try {
      console.log(`Scraping video from: ${pageUrl}`);
      
      const { data: html } = await axios.get(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        }
      });
           
      const $ = cheerio.load(html);

      // const videoUrl = $('meta[itemprop="contentURL"]').attr('content');
      const thumbsRaw = html.match(/https:\/\/st1\.nosofiles\.com\/[^\s"']+/g) || [];
      const likecount = $('.vid-likes .likes_count').text() || 'No likes info found';
      const jsonLdScript = $('script[type="application/ld+json"]').html();
      const jsonData = JSON.parse(jsonLdScript);
  
      // Extracting headline from the JSON-LD data
      const headline = jsonData['@graph'][0].headline || 'No headline found';

      const scriptContent = $('script')
        .toArray()
        .map(script => $(script).html())
        .join('\n');
      
      // Extract the fluidPlayerOptions JSON-like object
      const durationMatch = scriptContent.match(/duration:\s*"(\d+\.\d+)"/);
      let duration = null;
const videoMatch = scriptContent.match(/https:\/\/[^"']+\.mp4\?verify=[^"']+/);
const videoUrl = videoMatch ? videoMatch[0] : null;
      if (durationMatch|| likecount) {
        duration = durationMatch[1];  // Extracts the duration value
        console.log('✅ Duration found:', duration );
        console.log('✅ likecount found:', likecount );
      } else {
        console.log('❌ Duration not found in script');
      }

      // Filter only poster.jpg URLs
      const thumb = thumbsRaw.filter(t => t.includes('poster.jpg'));

      if (videoUrl && thumb[0] ) {
        console.log('✅ Found video URL:', videoUrl);
        console.log('✅ Found IMAGE URL:', thumb[0]);
        console.log('duration is', duration);
        console.log('duration is', headline);
        videoLinks.push({ video: videoUrl, thumb: thumb[0], duration: duration, headline: headline, likecount: likecount });
        console.log(`👍👍👍👍👍👍${videoLinks.video}👍👍👍👍`);

        if (videoLinks.length == 10) {
          break;
        }
      } else {  
        console.log('❌ Video URL or Image URL or Duration not found on page:', pageUrl);
      }

    } catch (error) {
      console.error('Error scraping page:', pageUrl, error.message);
    }
  }

  return videoLinks; // Return all found video URLs
}

module.exports = scrapeVideoUrls;

// Example usage:
// const urlsss = ['https://punishworld.com/75151-crying-as-a-big-black-cock-roughs-her-throat/'];
// scrapeVideoUrls(urlsss);
