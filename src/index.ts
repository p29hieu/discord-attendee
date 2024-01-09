import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import axios from "axios";
import fs from "fs/promises";
import nodeCron from "node-cron";

import config from "../config.json";

const ONE_DAY_MS = 24 * 3600 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

function generateRandomNumberString(length: number) {
  let result = "";
  const characters = "0123456789";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters.charAt(randomIndex);
  }

  return result;
}

const getAuthorizationKey = async () => {
  return process.env.DISCORD_AUTHORIZED;
};

const init = async () => {
  // create result file
  await fs.appendFile("./log.txt", ``);
  await fs.appendFile("./error.txt", ``);
};

const addLog = async (log: any) => {
  await fs.appendFile(
    "./log.txt",
    `${new Date().toISOString()}: ${JSON.stringify(log)} \n`
  );
};

const addError = async (error: any) => {
  await fs.appendFile(
    "./error.txt",
    `${new Date().toISOString()}: ${JSON.stringify(error)}\n`
  );
};

const updateConfig = async () => {
  config.lastSuccessTime = new Date().toISOString();
  await fs.writeFile("config.json", JSON.stringify(config, null, 2));
};

const attendee = async ({
  updateSuccessTime = false,
}: {
  updateSuccessTime?: boolean;
}) => {
  try {
    const data = await axios
      .post(
        config.channel,
        {
          mobile_network_type: "unknown",
          content: "!daily",
          nonce: generateRandomNumberString(19),
          tts: false,
          flags: 0,
        },
        {
          headers: {
            accept: "*/*",
            authorization: await getAuthorizationKey(),
            "content-type": "application/json",
          },
        }
      )
      .then(async (r) => {
        return r.data;
      });
    if (updateSuccessTime) {
      await updateConfig();
    }
    await addLog(data);
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      await addError(error.response?.data);
    }
  }
};

const handleCron = async () => {
  const lastSuccessTime = new Date(config.lastSuccessTime).getTime();
  const diff = ONE_DAY_MS - (Date.now() - lastSuccessTime);

  for (let i = 0; i < config.totalMinute; i++) {
    for (let j = 0; j < config.numberRequestPerMinute; j++) {
      const timeout =
        diff +
        ONE_MINUTE_MS * i +
        j * Math.floor(ONE_MINUTE_MS / config.numberRequestPerMinute) +
        config.timeoutBetweenAttendee;
      console.log(
        "===next message will be send at: ",
        new Date(Date.now() + timeout)
      );
      setTimeout(() => {
        attendee({ updateSuccessTime: i === 0 && j === 0 });
      }, timeout);
    }
  }
};

const main = async () => {
  await init();
  nodeCron.schedule("0 0 * * *", () => handleCron(), {
    runOnInit: true,
  });
};

main();
