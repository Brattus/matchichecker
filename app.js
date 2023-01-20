const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require('fs');

require('dotenv').config();

const middlewares = require('./middlewares');
const api = require('./api');

const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

// app.get('/', async (req, res) => {

//   res.json({
//     message: '🦄🌈✨👋🌎🌍🌏✨🌈🦄',
//   });
// });


app.get('/', async (req, res) => {
  const url = "https://www.matchi.se/facilities/ipvoldahallen";
  var newOccasion = false;
  axios(url).then(async (response) => {
    const html_data = response.data;
    const $ = cheerio.load(html_data);

    const occasions = $('.activity-occasion').map(function () {
      return {
        time: $(this).find("td:first").find('strong').text().trim(),
        date: $(this).find("td:first").find('small').text().trim(),
        number: parseInt($(this).find(".fa-user-friends").parent().text().split("/")[0].trim()),
        id: ($(this).find("td:first").find('strong').text() + $(this).find("td:first").find('small').text()).trim().replace(/\s/g, ''),
      }
    }).toArray();

    // make an array of all the occasions that are less than 12 number of people named possibleOccasions
    const possibleOccasions = occasions.filter(occasion => occasion.number < 12);

    console.log(possibleOccasions);

    // Check if possibleOccaions exists in airtable already
    // If it does not exist, add it to airtable
    // If it does exist, do nothing
    // If possibleOccasions is empty, do nothing
    if (possibleOccasions.length > 0) {

      //get all occasions from airtable
      const url = "https://api.airtable.com/v0/appw91HSIZHn8hxIs/Occasions";
      const config = {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      };


      let airtableOccasions = [];
      airtableOccasions = await getCurrentIds(url, config);

      console.log("AIRTABLE OCCASIONS", airtableOccasions);




      for (let i = 0; i < possibleOccasions.length; i++) {
        console.log("Occasion id", possibleOccasions[i].id);

        //if the occasion is not in airtable, add it to airtable
        if (airtableOccasions.includes(possibleOccasions[i].id)) {
          console.log("Occasion already exists in airtable");
        }
        else {

          console.log("Occasion does not exist in airtable");
          //add occasion-id to body and post it to airtable

          const body = {
            "records": [
              {
                "fields": {
                  "OccasionId": possibleOccasions[i].id,
                  "Date": possibleOccasions[i].date,
                }
              }
            ]
          };

          console.log('body', body);

          let madeItToAirtable = addOccasionToAirtable (url, config, body);
          if(madeItToAirtable){
            newOccasion = true;
          }
        }
      }

    }
    else {
      console.log("No occasions available");
    }


    res.send(newOccasion);
    // res.send(occasions);
  });

});

async function getCurrentIds(url, config) {
  try {
    let airtableOccasions = [];
    const response = await axios.get(url, config);
    console.log("AIRTABLE OCCASIONS", response.data.records);
    response.data.records.forEach(occasion => {
      airtableOccasions.push(occasion.fields.OccasionId);
    });
    return airtableOccasions;
  } catch (error) {
    console.log(error);
  }
}

async function addOccasionToAirtable(url, config, body) {
  try {
    const response = await axios.post(url, body, config);
    console.log("NEW OCCASION ADDED TO AIRTABLE");
    return true;
  } catch (error) {
    return false;
  }
}

app.use('/api/v1', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

module.exports = app;
