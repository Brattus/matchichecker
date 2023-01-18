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
  //use local file for testing
  let occasions = [];
  let newOccasion = false;
  axios(url).then((response) => {
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
    
    // Check if occasions.json exists
    // If it does, read it and compare with the new id from occasions if the number is under 12
    // Skip if id already exists
    // If it doesn't, create it and write the new id to it
    if (fs.existsSync('occasions.json')) {
      const data = fs.readFileSync('occasions.json');
      const json = JSON.parse(data);
      //delete content of occasions.json
              //if the id is  in the json file and not in occasions.json, remove the id from json object
      for (let i = 0; i < json.length; i++) {
        if (!occasions.map(occasion => occasion.id).includes(json[i])) {
          json.splice(i, 1);
        }
      }
      
     fs.writeFileSync('occasions.json', JSON.stringify([]));
      for (let i = 0; i < occasions.length; i++) {

        if (occasions[i].number < 13) {
          if (!json.includes(occasions[i].id)) {
            newOccasion = true;
            json.push(occasions[i].id);
          }
        }
      }
      fs.writeFileSync('occasions.json', JSON.stringify(json));
    } else {
      const json = [];
      for (let i = 0; i < occasions.length; i++) {
        if (occasions[i].number < 13) {
          newOccasion = true;
          json.push(occasions[i].id);
        }
      }
      fs.writeFileSync('occasions.json', JSON.stringify(json));
    }


    //Send the response



    
    res.send(newOccasion);
    // res.send(occasions);
  });
  
});

app.use('/api/v1', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

module.exports = app;
