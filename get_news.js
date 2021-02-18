const axios = require('axios');
const cheerio = require('cheerio');

const debug = true;
const maxLength = 2000;
const urlRoot = 'https://site.na.wotvffbe.com';
const urlList =
  urlRoot + '/whatsnew/list?page=1&category=info&platform=&lang=en';
const urlDetail = urlRoot + '/whatsnew/detail?group_id={id}&lang=en';

const urlDiscord = process.argv[2];

const fs = require('fs');
const dataFilename = 'data.json';
let rawData = fs.readFileSync(dataFilename);
let dataFile = JSON.parse(rawData);

const sendMessage = async (content) => {
  if (debug) {
    console.log('===');
    console.log(content);
  } else {
    await axios({
      method: 'post',
      url: urlDiscord,
      data: {
        content,
      },
    });
  }
};

const getDetails = async (url) => {
  const { data } = await axios({
    method: 'get',
    url,
  });

  let selector = cheerio.load(data);
  const articleBody = selector('.article_body').html();
  selector = cheerio.load(articleBody);

  const images = selector('img');

  let result = '';
  images.each(async function (index, e) {
    const src = selector(this).attr('src');
    result = `${result}${urlRoot}${src}\n`;
  });

  // const dives = selector('div');
  // dives.each(async function (index, e) {
  //   const text = selector(this).text();
  // });

  return result;
};

const main = async (dataFile) => {
  try {
    let url = urlList;
    const { data } = await axios({
      method: 'get',
      url,
    });

    const selector = cheerio.load(data);

    const items = selector('li');

    let contents = [];
    var found = false;

    items.each(function (index, e) {
      const id = selector(this).data('tab');

      // save latest id
      if (index === 0) {
        dataFile.new_id = id;
      }

      // ignore if id already posted
      if (dataFile.last_id == id) {
        found = true;
      }

      // add if info new
      if (!found) {
        const info = selector(this).find('p');

        const url = urlDetail.replace('{id}', id);
        const content = { url, message: `${info.text()}\n${url}\n` };
        contents.push(content);
      }
    });

    let message = '';
    // looping content for detail and send to discord
    for (const content of contents) {
      const details = await getDetails(content.url);
      // await sendMessage(content.message + details);
      const newMessage = `${content.message}${details}`;
      const tempMessage = `${message}${newMessage}`;
      if (message.length > maxLength) {
        sendMessage(message);
        message = newMessage;
      } else {
        message = tempMessage;
      }
    }

    sendMessage(message);

    // if new content/s found update data.json
    if (contents.length > 0) {
      dataFile.last_id = dataFile.new_id;
      delete dataFile.new_id;

      fs.writeFileSync(dataFilename, JSON.stringify(dataFile));
    }
  } catch (err) {
    console.log(err);
  }
};

main(dataFile);
