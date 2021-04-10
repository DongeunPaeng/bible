const axios = require("axios");

const BaseRepository = require("./BaseRepo");

module.exports = class ServiceRepository {
  constructor() {
    this._baseRepo = new BaseRepository();
  }

  // directly called from '/get'
  async getBibles() {
    const queryString = `select distinct bible from bibles`;
    const bibles = await this._baseRepo.selectAll(queryString);
    const arrayBibles = bibles.map((bible) => bible.bible);
    return arrayBibles;
  }

  // directly called from '/calculate'
  async getDailyPhraseCount(bibles, period) {
    const phrases = await this.calculatePhrases(bibles);
    try {
      return Math.ceil(phrases / period);
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  // directly called from '/subscribe'
  async registerSubscription(bibles, period) {
    const subscriptionId = Math.random().toString(36).substr(2, 9);
    const userId = 1; // FIXME: give the id later.
    const dailyPhraseCount = await this.getDailyPhraseCount(bibles, period);
    const queryString = `insert into subscriptions (subs_id, user_id, bible, count, type, created_at) values (?, ?, ?, ?, ?, now())`;
    try {
      for (const bible of bibles) {
        await this._baseRepo.insert(queryString, [
          subscriptionId,
          userId,
          bible,
          dailyPhraseCount,
          "start",
        ]);
      }
      return true;
    } catch (err) {
      return err;
    }
  }

  // directly called from '/send'
  async sendPhrases() {
    try {
      const subscriptions = await this.getSubscriptions();
      let todayArray = [];
      for (const subscription of subscriptions) {
        const { user_id, subs_id, phone } = subscription;
        const phrases = await this.getPhraseForAUser(user_id, subs_id);
        const userAndPhrases = await this.makeArrayForUser(
          subs_id,
          phone,
          phrases
        );
        await this.logLastPhrase(subs_id);
        todayArray.push(userAndPhrases);
      }
      await this.convertToTextAndSend(todayArray);
      return true;
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  // directly called from '/toggle'
  async toggleSubs(subs) {
    try {
      const queryString = `update subscriptions set type = if(type='start', 'pause', 'start') where subs_id = ?`;
      const result = await this._baseRepo.update(queryString, [subs]);
      console.log(result);
      return true;
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  // directly called from '/check'
  async checkPercentage(user, subs) {
    const lastPhrase = await this.getLastPhrase(subs);
    const phrases = await this.getPhraseForAUser(user, subs);
    if (lastPhrase === undefined) {
      return 0;
    }
    const progress = lastPhrase.last_phrase;
    const totalPhraseCount = phrases.length;
    const percentage = progress / totalPhraseCount;
    return percentage;
  }

  // helper functions
  async calculatePhrases(bibles) {
    const queryString = `select count(id) as count from bibles where bible in (?)`;
    try {
      const row = await this._baseRepo.selectSingular(queryString, [bibles]);
      const count = row["count"];
      return count;
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  async getSubscriptionById(subs) {
    const queryString = `select distinct * from subscriptions where subs_id = ?`;
    const rows = await this._baseRepo.selectAll(queryString, [subs]);
    return rows;
  }

  async getPhraseForAUser(user, subs) {
    const queryString = `select phrase from bibles where bible in (select bible from subscriptions where user_id = ? and subs_id = ?)`;
    const phrases = await this._baseRepo.selectAll(queryString, [user, subs]);
    return phrases;
  }

  async getLastPhrase(subs) {
    const queryString = `select last_phrase from logs where subs_id = ? order by id desc limit 1`;
    const row = await this._baseRepo.selectSingular(queryString, [subs]);
    return row;
  }

  async makeArrayForUser(subs, phone, phrases) {
    let array = [];
    phrases.forEach((phrase) => array.push(phrase.phrase));
    const subscriptions = await this.getSubscriptionById(subs);
    const dailyCount = subscriptions[0].count;
    const lastPhrase = await this.getLastPhrase(subs);
    let filteredArray;
    if (lastPhrase === undefined) {
      filteredArray = array.slice(0, dailyCount);
    } else {
      filteredArray = array.slice(
        lastPhrase.last_phrase,
        lastPhrase.last_phrase + dailyCount
      );
    }
    return { phone, filteredArray };
  }

  async sendSlack(text) {
    axios
      .post(process.env.SLACK_BOT_URL, {
        text: text,
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then((res) => {
        return res;
      })
      .catch((err) => {
        return err;
      });
  }

  async convertToTextAndSend(array) {
    array.forEach((eachReceiver) => {
      let text = "";
      eachReceiver.filteredArray.forEach((phrase) => {
        text = text + phrase + "\n";
      });
      this.sendSlack(text);
    });
  }

  async logLastPhrase(subs) {
    try {
      const lastPhrase = await this.getLastPhrase(subs);
      const subscriptions = await this.getSubscriptionById(subs);
      const dailyCount = subscriptions[0].count;
      let updatedPhrase;
      if (lastPhrase === undefined) {
        updatedPhrase = dailyCount;
      } else {
        updatedPhrase = lastPhrase.last_phrase + dailyCount;
      }
      const queryString = `insert into logs (subs_id, last_phrase, sent_at) values (?, ?, now())`;
      await this._baseRepo.insert(queryString, [subs, updatedPhrase]);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  async getSubscriptions() {
    const queryString = `select distinct A.user_id, A.subs_id, B.phone from subscriptions A, users B where A.user_id = B.id and type not in ('pause', 'end')`;
    const subscriptions = await this._baseRepo.selectAll(queryString);
    return subscriptions;
  }
};
