const axios = require("axios");
const cheerio = require("cheerio");

const urlList =
  "https://site.na.wotvffbe.com/whatsnew/list?page=1&category=info&platform=&lang=en";
const urlDetail =
  "https://site.na.wotvffbe.com/whatsnew/detail?group_id={id}&lang=en";

require("dotenv").config();
const urlDiscord = process.env.urlDiscord;

main = async () => {
  try {
    let url = urlList;
    const { data } = await axios({
      method: "get",
      url,
    });

    const selector = cheerio.load(data);

    const newItems = selector(".postList_item_label-new");

    const titles = [];
    newItems.each(async function (i, e) {
      const header = selector(this).parent().parent();
      const id = header.get(0).attribs["data-tab"];

      url = urlDetail.replace("{id}", id);

      const info = header.find("p");
      titles.push(info.text());
    });

    await axios({
      method: "post",
      url: urlDiscord,
      data: {
        content: titles.join("\n"),
      },
    });
  } catch (err) {
    console.log(err);
  }
};

main();
