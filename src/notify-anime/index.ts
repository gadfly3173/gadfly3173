import * as fs from 'fs-extra';
import * as moment from "moment";
import * as nodemailer from "nodemailer";
import parse from '../util/rss-parser';
import 'moment/locale/zh-cn';
export default {}

main();

function getParams(prefix = "-"): { [k: string]: string | true } {
  return process.argv.slice(2).reduce((obj, it) => {
    const sp = it.split("=");
    const key = sp[0].replace(prefix, "");
    obj[key] = sp[1] || true;
    return obj;
  }, {} as ReturnType<typeof getParams>);
}

async function main() {
  moment.locale('zh-cn');
  const params = getParams();
  const mailUser = params["mailUser"]?.toString();
  const mailPass = params["mailPass"]?.toString();
  const mailTo = params["mailTo"]?.toString();
  const mailFrom = params["mailFrom"]?.toString();

  // 获取当前路径下的rss-list.txt文件，读取文件内容，将文件内容按行分割，然后将每一行的内容添加到rssList数组中。
  const rssJson: { name: string, link: string }[] = JSON.parse(fs.readFileSync(__dirname + '/rss-list.json', 'utf-8'));
  // Array of valid RSS URLs
  console.log('订阅列表\n', rssJson);
  const notifiedJson: { guid: string, name: string }[] = JSON.parse(fs.readFileSync(__dirname + '/last-notified.json', 'utf-8'));

  // 使用rss-parser解析rssList。
  let mailInfoList: {
    title: string;
    link: string;
    pubDate: Date;
    guid: string;
    name: string;
  }[] = [];
  console.log('开始检查更新');
  for (let i = 0; i < rssJson.length; i++) {
    const rssInfo = rssJson[i];
    const notifiedLastId = notifiedJson.find(item => item.name === rssInfo.name)?.guid;
    // 获取rss结果
    const rssResult = await parse(rssInfo.link);
    if (rssResult.items.length > 0) {
      const lastItem = rssResult.items[0];
      const title = lastItem.title;
      const guid = lastItem.guid;
      const link = lastItem.link;
      const pubDate = new Date(lastItem.torrent.pubDate);
      // 根据最后一次通知的guid来判断有没有更新
      if (guid === notifiedLastId) {
        continue;
      }
      console.log(`《${title}》更新了，更新时间： ${moment(pubDate).format('YYYY-MM-DD HH:mm:ss')}`);
      const mailInfo = {
        title,
        link,
        pubDate,
        guid,
        name: rssInfo.name,
      }
      mailInfoList.push(mailInfo);
    }
  }

  if (mailInfoList.length === 0) {
    console.log("没有更新");
    return;
  }

  // TODO: 根据mailInfoList发送邮件
  let transporter = nodemailer.createTransport({
    host: "smtp.exmail.qq.com", // 第三方邮箱的主机地址
    port: 465,
    secure: true,
    auth: {
      user: mailUser, // 发送方邮箱的账号
      pass: mailPass, // 邮箱授权密码
    },
  });
  let mailSubject = "";
  let mailText = "";
  if (mailInfoList.length === 1) {
    const mailInfo = mailInfoList[0];
    mailSubject = `你订阅的番剧《${mailInfo.name}》更新了`;
    mailText = `${mailInfo.title} 于 ${moment(mailInfo.pubDate).format('YYYY-MM-DD HH:mm:ss')} 更新`;
  } else {
    mailSubject = `你订阅的${mailInfoList.length}部番剧更新了`;
    mailInfoList.forEach(mailInfo => {
      mailText += `${mailInfo.title} 于 ${moment(mailInfo.pubDate).format('YYYY-MM-DD HH:mm:ss')} 更新\n`;
    });
  }
  await transporter.sendMail({
    from: `"Gadfly Anime Github" <${mailFrom}>`, // 发送方邮箱的账号
    to: mailTo, // 邮箱接受者的账号
    subject: mailSubject, // Subject line
    text: mailText, // 文本内容
  });
  console.log("邮件发送成功");
  mailInfoList.forEach(mailInfo => {
    const notifiedLastObjectIndex = notifiedJson.findIndex(item => item.name === mailInfo.name);
    const notifiedLastObject = notifiedJson[notifiedLastObjectIndex];
    // 如果存在，则删除，然后添加新的
    if (notifiedLastObjectIndex > -1) {
      notifiedJson.splice(notifiedLastObjectIndex, 1);
      notifiedLastObject.guid = mailInfo.guid;
      notifiedJson.push(notifiedLastObject);
    } else {
      notifiedJson.push({
        guid: mailInfo.guid,
        name: mailInfo.name,
      });
    }
  });
  fs.writeFileSync(__dirname + '/last-notified.json', JSON.stringify(notifiedJson, null, 2));
}
