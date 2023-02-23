const express = require("express");
const cors = require("cors");

const knex = require("knex")({
  client: "pg",
  connection: {
    user: "isaicastro",
    host: "127.0.0.1",
    database: "soccer_data",
    password: "",
    port: 5432,
  },
});

const app = express();

app.use(express.json());
app.use(cors());

const today = new Date();
const localToday = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate()
); // sets the time to 00:00:00 in local timezone

app.get("/", (req, res) => res.json("It Works!"));

app.post("/", (req, res) => {
  const { date } = req.body;
  console.log("date", date);

  const dateObject = new Date(date);

  const newDate = new Date(
    dateObject.getFullYear(),
    dateObject.getMonth(),
    dateObject.getDate()
  );

  if (!date) {
    knex
      .select("*")
      .from(
        `matches_${localToday.getUTCFullYear()}-${
          localToday.getUTCMonth() + 1
        }-${localToday.getUTCDate()}`
      )
      .then((data) => {
        res.json(data);
      })
      .catch((error) => {
        console.log(error);
      });
  } else {
    knex
      .select("*")
      .from(
        `matches_${newDate.getUTCFullYear()}-${
          newDate.getUTCMonth() + 1
        }-${newDate.getUTCDate()}`
      )
      .then((data) => {
        res.json(data);
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`App is running on port ${process.env.PORT || 3001}`);
});

const leagues = {
  "Champions League": "Champions League",
  LaLiga: "La Liga",
  "Premier League": "Premier League",
  "Europa League": "Europa League",
  Bundesliga: "Bundesliga",
  "Serie A": "Serie A",
  "Ligue 1 Uber Eats": "Ligue 1",
  "LIGA BBVA MX CLAUSURA": "LIGA BBVA MX CLAUSURA",
  "SAUDI PROFESSIONAL LEAGUE": "SAUDI PROFESSIONAL LEAGUE",
  "EFL Cup": "EFL Cup",
  "FA Cup": "FA Cup",
  "Copa del Rey": "Copa del Rey",
};

let date = `${localToday.getUTCFullYear()}-${
  localToday.getUTCMonth() + 1
}-${localToday.getUTCDate()}`;

const fetchData = async () => {
  const res = await fetch(
    // `https://onefootball.com/proxy-web-experience/en/matches?date=${date}`
    `https://onefootball.com/proxy-web-experience/en/matches?date=2023-03-07`
  );
  const data = await res.json();
  let matches = {};
  const fixtures = data.containers.filter((item) => {
    return (
      item.fullWidth &&
      item.fullWidth.component &&
      item.fullWidth.component.matchCardsList
    );
  });
  fixtures.map((fixture) => {
    if (
      leagues[fixture.fullWidth.component.matchCardsList.sectionHeader.title]
    ) {
      matches[fixture.fullWidth.component.matchCardsList.sectionHeader.title] =
        fixture.fullWidth.component.matchCardsList;
    }
  });
  return matches;
};

fetchData().then(async (data) => {
  const firstItemKey = Object.keys(data)[0];
  const firstItem = data[firstItemKey];
  const matchDate = new Date(firstItem.matchCards[0].kickoff);
  const tableName = `matches_${matchDate.getUTCFullYear()}-${
    matchDate.getUTCMonth() + 1
  }-${matchDate.getUTCDate()}`; // Gives format YYYY-MM-DD

  const tableExists = await knex.schema.hasTable(tableName);

  if (!tableExists) {
    await knex.schema.createTable(tableName, (table) => {
      table.increments("id").primary();
      table.string("league");
      table.string("home_team");
      table.string("away_team");
      table.integer("home_score");
      table.integer("away_score");
      table.string("away_team_logo");
      table.string("home_team_logo");
      table.dateTime("kickoff");
      table.string("time_period");
      table.string("period");
    });
  }

  // Delete all data from table
  await knex(tableName).truncate();

  for (const league in data) {
    const matches = data[league].matchCards;

    // Insert new data into table
    for (const match of matches) {
      const homeTeamName = match.homeTeam.name;
      const awayTeamName = match.awayTeam.name;
      const homeScore = match.homeTeam.score;
      const awayScore = match.awayTeam.score;
      const awayTeamLogo = match.awayTeam.image;
      const homeTeamLogo = match.homeTeam.image;
      const kickoff = match.kickoff;
      const timePeriod = match.timePeriod;
      const period = match.period;

      try {
        await knex(tableName).insert({
          league,
          home_team: homeTeamName,
          away_team: awayTeamName,
          home_score: homeScore,
          away_score: awayScore,
          away_team_logo: awayTeamLogo,
          home_team_logo: homeTeamLogo,
          kickoff: kickoff,
          time_period: timePeriod,
          period: period,
        });
        console.log("Inserted data successfully");
      } catch (error) {
        console.error(error);
      }
    }
  }
});

// Store 9 days ( -2 -- 7 )
let weekDays = [];

// Update the weekDays array
const updateWeekDays = () => {
  let today = new Date();

  // Calculate the first day of the current week
  let firstDayOfWeek = new Date(
    today.setDate(today.getDate() - today.getDay() + 1)
  );

  weekDays = [];

  // Loop through the next 9 days, including the past 2 days, and adding each day to the array
  for (let i = -2; i < 7; i++) {
    let day = new Date(firstDayOfWeek);
    day.setDate(firstDayOfWeek.getDate() + i);
    const formattedDate = day.toLocaleDateString("en-US").replaceAll("/", "-");
    weekDays.push(`matches_${formattedDate}`);
  }
};

updateWeekDays();

console.log("weekDays after update", weekDays);

// Function to update the weekDays array every day
setInterval(() => {
  let now = new Date();

  let twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(now.getDate() - 2);

  // Check if the first day in the array has passed more than 2 days ago
  if (new Date(weekDays[0].split("_")[1]) < twoDaysAgo) {
    weekDays.shift();

    let ninthDay = new Date(now);
    ninthDay.setDate(now.getDate() + 7);
    const formattedDate = ninthDay
      .toLocaleDateString("en-US")
      .replaceAll("/", "-");
    weekDays.push(`matches_${formattedDate}`);
  }

  console.log(" in interval", weekDays);
}, 1000 * 60 * 60 * 24); // Run the function once a day (every 24 hours)
