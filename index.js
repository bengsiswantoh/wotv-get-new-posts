const axios = require("axios");
const cheerio = require("cheerio");

const debug = false;
const maxLength = 2000;
const urlList =
  "https://site.na.wotvffbe.com/whatsnew/list?page=1&category=info&platform=&lang=en";
const urlDetail =
  "https://site.na.wotvffbe.com/whatsnew/detail?group_id={id}&lang=en";

const urlDiscord = process.argv[2];

const fs = require("fs");
const dataFilename = "data.json";
let rawData = fs.readFileSync(dataFilename);
let dataFile = JSON.parse(rawData);

const createContent = (contents) => {
  const content = contents.join("\n\n");
  return content;
};

const sendMessage = async (contents) => {
  const content = createContent(contents);
  if (debug) {
    console.log("===");
    console.log(content);
  } else {
    await axios({
      method: "post",
      url: urlDiscord,
      data: {
        content,
      },
    });
  }
};

const main = async (dataFile) => {
  try {
    let url = urlList;
    const { data } = await axios({
      method: "get",
      url,
    });

    const selectorList = cheerio.load(data);

    const items = selectorList("li");

    let contents = [];
    var found = false;
    items.each(async function (index, e) {
      const id = selectorList(this).get(0).attribs["data-tab"];

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
        const info = selectorList(this).find("p");

        const url = urlDetail.replace("{id}", id);
        const newContent = info.text() + "\n" + url;
        // const content = info.text();
        contents.push(newContent);

        let content = createContent(contents);
        if (content.length > maxLength) {
          contents.pop();
          sendMessage(contents);

          contents = [];
          contents.push(newContent);
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
