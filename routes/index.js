const express = require("express");
const router = express.Router();

const ServiceRepository = require("../repositories/ServiceRepo");
const _serviceRepo = new ServiceRepository();

router.get("/", async (req, res, next) => {
  const bibles = await _serviceRepo.getBibles();
  res.status(200).send(bibles);
});

router.post("/calculate", async (req, res, next) => {
  const {
    body: { bibles, period },
  } = req;
  const dailyPhraseCount = await _serviceRepo.getDailyPhraseCount(
    bibles,
    period
  );
  const dailyPhraseCountString = dailyPhraseCount.toString();
  if (dailyPhraseCountString !== false) {
    res.status(200).send(dailyPhraseCountString);
    return;
  }
  res.sendStatus(500);
});

router.post("/subscribe", async (req, res, next) => {
  const {
    body: { bibles, period },
  } = req;
  const insertSucceeded = await _serviceRepo.registerSubscription(
    bibles,
    period
  );
  res.send(`result: ${insertSucceeded}`);
});

router.post("/send", async (req, res, next) => {
  const {
    body: { token },
  } = req;
  if (token !== "dongeun") return;
  const result = await _serviceRepo.sendPhrases();
  if (result !== true) {
    res.sendStatus(500);
    return;
  }
  res.sendStatus(200);
});

router.post("/toggle", async (req, res, next) => {
  const {
    body: { token, subs },
  } = req;
  if (token !== "dongeun") return;
  const result = await _serviceRepo.toggleSubs(subs);
  if (result !== true) {
    res.sendStatus(500);
    return;
  }
  res.sendStatus(200);
});

router.post("/check", async (req, res, next) => {
  const {
    body: { user, subs },
  } = req;
  const percentage = await _serviceRepo.checkPercentage(user, subs);
  const trimmedPercentage = percentage.toFixed(4);
  res.status(200).send(`progress: ${trimmedPercentage * 100}%`);
});

module.exports = router;
