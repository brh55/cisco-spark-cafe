
const req = require('request');
const cheerio = require('cheerio');
const filter = require('lodash.filter');

const STATION_KEY = {
	0: {
    type: 'Weekly',
    id: -1
  },
  1: {
    type: 'Breakfest',
    id: 1301
  },
  2: {
    type: 'Grill',
    id: 1238
  },
  3: {
    type: 'Euro Deli',
    id: 1684
  },
  4: {
    type: 'Mediterranean',
    id: 1190
  },
  5: {
    type: 'Indian',
    id: 1783
  },
  6: {
    type: 'Smokehouse Grill',
    id: 1785
  },
  7: {
    type: 'Soup',
    id: 1711
  },
  8: {
    type: 'Global',
    id: 1748
  }
};

const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const dayIds = days.map(day => `${day}Column`);

const MENU_URL = 'http://www.aramarkcafe.com/layouts/canary_2015/locationhome.aspx?locationid=4021&pageid=20&stationID=';

const getItems = (nameRawHtml) => {
	const matches = nameRawHtml.match(/(?!(<br>)).+/g).map(formatItem).map(item => item.trim());
	return filter(matches, (m) => m !== '') || 'Not available';
};

const formatItem = unformattedItem => {
	let itemClean = unformattedItem;
	if (unformattedItem.includes('br>')) {
		itemClean = itemClean.substr(3, itemClean.length);
	}

	if (itemClean.includes('-')) {
		itemClean = itemClean.substr(2, itemClean.length);
	}

	return itemClean;
};

// dayCheerioInstance -> item
const deriveMenu = (dayHtml, index) => {
	if (!dayHtml) return {
		day: days[index],
		item: 'none'
	};

	const rawHtml = dayHtml('.noNutritionalLink').html();
	const items = getItems(rawHtml);
	const description = dayHtml('div span').text();
	const itemPrice = dayHtml('.item-price').text();

	const item = {
		day: days[index],
		items,
		description,
		itemPrice
	};

	return item;
};

module.exports = function(controller) {

    controller.hears(['food', 'menu'], 'direct_message,direct_mention', function(bot, message) {
      
      bot.startConversation(message, function(err, convo) {
        convo.ask(`Which menu do you want to see?
1. Weekly
2. Breakfest
3. Grill
4. Euro Deli
5. Mediterranean
6. Indian
7. Smokehouse Grill
8. Soup
9. Global`, (resp) => {
          const menuIndex = parseInt(resp.text) - 1;

          const station = STATION_KEY[menuIndex];
          req(MENU_URL + station.id, (err, resp, body) => {
            const $ = cheerio.load(body);

            const foodItems = dayIds
                .map(dayId => {
                  const parseHtml = $(`#${dayId}`).html();
                  return (parseHtml) ? cheerio.load(parseHtml) : null
                })
                .map((dayHtml, index) => deriveMenu(dayHtml, index))
                .reduce((acc, cv) =>  {
                  acc[cv.day] = cv;
                  return acc;
                }, {});
            
            const d = new Date();
            const today = days[d.getDay()];

            const todayItems = foodItems[today].items;
            let todayItemToMd = `### 🍱 The Menu Today for ${station.type} ${todayItems.map(item => `\n\n - ${item}`).toString()}`;
            convo.say(todayItemToMd);
            convo.next();
          });
        });
    });
});
}