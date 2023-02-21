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

const date = () => {
  let today = new Date();
  let dd = String(today.getDate()).padStart(2, "0");
  let mm = String(today.getMonth() + 1).padStart(2, "0");
  let year = today.getFullYear();
  return (today = year + "-" + mm + "-" + dd);
};

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
};

const fetchData = async () => {
  const res = await fetch(
    // `https://onefootball.com/proxy-web-experience/en/matches?date=${date()}`
    `https://onefootball.com/proxy-web-experience/en/matches?date=2023-02-18`
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

fetchData();

fetchData().then(async (data) => {
  //   Loop through each league and matchCards and insert them into the database
  for (const league in data) {
    const matches = data[league].matchCards;
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

      await knex("matches")
        .insert({
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
        })
        .then(() => {
          console.log("Data inserted successfully");
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }
});
