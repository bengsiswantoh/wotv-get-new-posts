const axios = require("axios");
const cheerio = require("cheerio");

const urlList =
  "https://site.na.wotvffbe.com/whatsnew/list?page=1&category=info&platform=&lang=en";
const urlDetail =
  "https://site.na.wotvffbe.com/whatsnew/detail?group_id={id}&lang=en";

const urlDiscord = process.argv[2];

const fs = require("fs");
const dataFilename = "data.json";
let rawData = fs.readFileSync(dataFilename);
let dataFile = JSON.parse(rawData);

main = async (dataFile) => {
  try {
    let url = urlList;
    const { data } = await axios({
      method: "get",
      url,
    });

    const selector = cheerio.load(data);

    const newItems = selector(".postList_item_label-new");

    const contents = [];
    var found = false;
    newItems.each(async function (i, e) {
      const header = selector(this).parent().parent();
      const id = header.get(0).attribs["data-tab"];

      url = urlDetail.replace("{id}", id);

      // save latest id
      if (i === 0) {
        dataFile.new_id = id;
      }

      // ignore if id already posted
      if (dataFile.last_id == id) {
        found = true;
      }

      // add if info new
      if (!found) {
        const info = header.find("p");
        contents.push(info.text());
      }
    });

    // if new content/s found
    if (contents.length > 0) {
      dataFile.last_id = dataFile.new_id;

      await axios({
        method: "post",
        url: urlDiscord,
        data: {
          content: titles.join("\n"),
        },
      });

      fs.writeFileSync(dataFilename, JSON.stringify(dataFile));
    }
  } catch (err) {
    console.log(err);
  }
};

main(dataFile);
