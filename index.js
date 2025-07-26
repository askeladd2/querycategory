const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const scrapeVideoUrl = require('./searcherv1.js');
require('dotenv').config();

const app = express();
const PORT = 3434;

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });


const urls = [
  '3d', 'abuse', 'alien', 'amputee', 'analfisting', 'anorexic', 'assylum',
  'ballbusting', 'bdsm', 'beating', 'torture', 'bondage-torture', 'boxing',
  'breathplay', 'choking', 'cnc', 'crackhead', 'creepy', 'crippled', 'crucified',
  'cruel', 'crying', 'diaper', 'downsyndrome', 'dungeon', 'facialabuseporn', 'snuff',
  'fart', 'femdom', 'foot-torture', 'gangbang', 'goth', 'gynecologist', 'hentai',
  'high', 'homeless', 'horrorporn', 'humiliation', 'insertions', 'kidnapped',
  'kink', 'menstruationperiod', 'misogyny', 'monsters', 'mummification', 'pain',
  'painal', 'piss', 'pkf', 'pregnant', 'professionals', 'puke', 'pussy-torture',
  'rough', 'satanic', 'scream', 'slave', 'sleep', 'tattooed', 'tits-torture',
  'uncategorized', 'vampire', 'wheelchair', 'whipping', 'wtf', 'zombie'
];

// Track user state
const userStates = {};

// Helper: Shuffle array
function shuffleArray(array) {
  const temp = [...array];
  for (let i = temp.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [temp[i], temp[j]] = [temp[j], temp[i]];
  }
  return temp;
}

// Helper: Chunk array into rows
function chunkArray(array, size) {
  const shuffled = shuffleArray(array);
  const result = [];
  for (let i = 0; i < shuffled.length; i += size) {
    result.push(shuffled.slice(i, i + size));
  }
  return result;
}

// Create category buttons
function createCategoryButtons() {
  return chunkArray(
    urls.map(url => ({
      text: url,
      callback_data: url
    })),
    4
  );
}

// Create "Back" button
function createBackButton() {
  return [
    [{ text: '🔙 Back to Categories', callback_data: '__back_to_categories' }]
  ];
}

// Format duration nicely
function formatDuration(seconds) {
  if (!seconds) return 'Duration not available';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Scrape multiple pages
async function scrapeAllPages(baseSearchUrl, totalPages) {
  const allLinks = [];

  for (let page = 1; page <= totalPages; page++) {
    const url = page === 1 ? baseSearchUrl : `${baseSearchUrl.replace('?', `/page/${page}/?`)}`;

    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const $ = cheerio.load(response.data);

      $('.video-block a.thumb').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href) allLinks.push(href);
      });

    } catch (err) {
      console.error(`Failed to fetch page ${page}:`, err.message);
    }
  }
  const shuffledLinks = shuffleArray(allLinks);
  const videoData = await scrapeVideoUrl(shuffledLinks);
  return videoData;
}

// Handle actual search
async function handleSearchQuery(chatId, query) {
  const searchQuery = encodeURIComponent(query);

  await bot.sendMessage(chatId, `🔍 Searching for "${query}"...`);

  try {
    const links = await scrapeAllPages(`https://punishworld.com/?s=${searchQuery}&filter=most-viewed`, 10);

    if (links.length > 0) {
      for (const link of links) {
        try {
          const message = `
<b> ${link.headline}</b>
⌛ ${formatDuration(link.duration)}
👍 ${link.likecount}`;


if(true){
          await bot.sendPhoto(chatId, link.thumb, {
            caption: message,
            parse_mode: 'HTML',
            reply_markup: {
             inline_keyboard: [
  [
    {
      text: '🎬 Watch without ads',
      web_app: {
        url: `${link.video}`
      }
    }
  ]
]
            }
 
          });
}else{

           await bot.sendPhoto(chatId, link.thumb, {
            caption: message,
            parse_mode: 'HTML',
            reply_markup: {
             inline_keyboard: [
  [
    {
      text: '🎬 Watch in App',
      web_app: {
        url: `https://toffee-smoky.vercel.app/?video=${encodeURIComponent(link.video)}`
      }
    }
  ]
]
            }
          });
        }
          await new Promise(res => setTimeout(res, 300)); // Small delay
        } catch (error) {
          console.error('Send error:', error.message);
          await bot.sendMessage(chatId, '⚠️ Failed to send one video.');
        }
      }

      await bot.sendMessage(chatId, `✅ Done! Sent ${links.length} videos.`, {
       reply_markup: {
        inline_keyboard: [
          [{ text: '🔍 Search Query', callback_data: '__search_query' }],
          [{ text: '🗂️ Show Categories', callback_data: createBackButton}]
        ]
      }
      });

    } else {
      await bot.sendMessage(chatId, '🙁 No videos found.', {
        reply_markup: { inline_keyboard: createBackButton() }
      });
    }
  } catch (error) {
    console.error('Scraping error:', error.message);
    await bot.sendMessage(chatId, '❌ Error while scraping.', {
      reply_markup: { inline_keyboard: createBackButton() }
    });
  }
}

// Handle messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  // if (text === '/start') {
  //   await bot.sendMessage(chatId, `👋 Welcome! Choose a category:`, {
  //     reply_markup: { inline_keyboard: createCategoryButtons() }
  //   });
  //   return;
  // }
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, '👋 Welcome! What would you like to do?', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔍 Search Query', callback_data: '__search_query' }],
          [{ text: '🗂️ Show Categories', callback_data: '__show_categories' }]
        ]
      }
    });
  });

  if (text === '/search') {
    userStates[chatId] = 'awaiting_search_query';
    await bot.sendMessage(chatId, `🔎 Please type your search query:`);
    return;
  }

  if (userStates[chatId] === 'awaiting_search_query') {
    await handleSearchQuery(chatId, text);
    userStates[chatId] = null;
    return;
  }
});

// Handle button presses
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  await bot.answerCallbackQuery(callbackQuery.id); // Close loading spinner

  if (data === '__back_to_categories') {
    await bot.sendMessage(chatId, `👋 Choose a category:`, {
      reply_markup: { inline_keyboard: createCategoryButtons() }
    });
    return;
  }
 if (data === '__show_categories') {
  await bot.sendMessage(chatId, `👋 Choose a category:`, {
    reply_markup: { inline_keyboard: createCategoryButtons() }
  });
  return;
}

  if (data === '__search_query') {
    userStates[chatId] = 'awaiting_search_query';
    await bot.sendMessage(chatId, `🔍 Please type your search query now:`);
    return;
  }

  // Treat button text as search query
  await handleSearchQuery(chatId, data);
});

// Express web server
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Express server started on http://localhost:${PORT}`);
});
