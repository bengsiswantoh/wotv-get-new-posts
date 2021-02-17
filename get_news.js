const axios = require('axios');
const cheerio = require('cheerio');

const debug = false;
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

const createContent = (contents) => {
  const content = contents.join('\n\n');
  return content;
};

const sendMessage = async (contents) => {
  const content = createContent(contents);
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

  const selector = cheerio.load(data);
  const images = selector('img');

  let result = '';
  images.each(async function (index, e) {
    const src = selector(this).get(0).attribs['src'];
    result = `${result}${urlRoot}${src}\n`;
  });

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

    items.each(async function (index, e) {
      const id = selector(this).get(0).attribs['data-tab'];

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
        const details = await getDetails(url);

        const newContent = `${info.text()}\n${url}\n${details}`;

        contents.push(newContent);

        let content = createContent(contents);
        if (content.length > maxLength) {
          contents.pop();
          await sendMessage(contents);

          contents = [newContent];
        }
      }
    });

    // if new content/s found
    if (contents.length > 0) {
      dataFile.last_id = dataFile.new_id;
      delete dataFile.new_id;

      await sendMessage(contents);

      fs.writeFileSync(dataFilename, JSON.stringify(dataFile));
    }
  } catch (err) {
    console.log(err);
  }
};

main(dataFile);
