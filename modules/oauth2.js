/**
 *      __         ___            __        __
 *     / /_  ___  / (_)___ ______/ /___  __/ /
 *    / __ \/ _ \/ / / __ `/ ___/ __/ / / / / 
 *   / / / /  __/ / / /_/ / /__/ /_/ /_/ / /  
 *  /_/ /_/\___/_/_/\__,_/\___/\__/\__, /_/   
 *                               /____/      
 * 
 *     Heliactyl 18.0.0 (Ironclad Ridge)
 * 
 */

"use strict";

const loadConfig = require("../handlers/config.js");
const settings = loadConfig("./config.toml");
const fetch = require("node-fetch");
const indexjs = require("../app.js");
const log = require("../handlers/log.js");
const fs = require("fs");
const ejs = require("ejs");
const vpnCheck = require("../handlers/vpnCheck.js");

if (settings.api.client.oauth2.link.slice(-1) == "/")
    settings.api.client.oauth2.link = settings.api.client.oauth2.link.slice(
      0,
      -1
    );
  
  if (settings.api.client.oauth2.callbackpath.slice(0, 1) !== "/")
    settings.api.client.oauth2.callbackpath =
      "/" + settings.api.client.oauth2.callbackpath;
  
  if (settings.pterodactyl.domain.slice(-1) == "/")
    settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);

/* Ensure platform release target is met */
const heliactylModule = { "name": "Discord OAuth2", "target_platform": "10.0.0" };

/* Module */
module.exports.heliactylModule = heliactylModule;
module.exports.load = async function (app, db) {
    app.get("/login", async (req, res) => {
      if (req.query.redirect) req.session.redirect = "/" + req.query.redirect;
      
      // If prompt parameter is provided or immediate authentication is requested
      if (req.query.prompt || req.query.immediate === 'true') {
        return res.redirect(
          `https://discord.com/api/oauth2/authorize?client_id=${
            settings.api.client.oauth2.id
          }&redirect_uri=${encodeURIComponent(
            settings.api.client.oauth2.link +
              settings.api.client.oauth2.callbackpath
          )}&response_type=code&scope=identify%20email${
            settings.api.client.bot.joinguild.enabled == true
              ? "%20guilds.join"
              : ""
          }${settings.api.client.j4r.enabled == true ? "%20guilds" : ""}${
            settings.api.client.oauth2.prompt == false
              ? "&prompt=none"
              : req.query.prompt
              ? req.query.prompt == "none"
                ? "&prompt=none"
                : ""
              : ""
          }`
        );
      }
      
      // Otherwise, render the login page
      let theme = indexjs.get(req);
      ejs.renderFile(
        `./views/login.ejs`, 
        await indexjs.renderdataeval(req, theme),
        null,
        function (err, str) {
          if (err) {
            console.log(`[WEBSITE] An error has occurred while attempting to render the login page: ${err}`);
            return res.send("An error has occurred while attempting to render the login page. Please contact an administrator for assistance.");
          }
          res.status(200);
          res.send(str);
        }
      );
    });
  
    app.get("/oauth/discord", async (req, res) => {
      if (req.query.redirect) req.session.redirect = "/" + req.query.redirect;
      res.redirect(
        `https://discord.com/api/oauth2/authorize?client_id=${
          settings.api.client.oauth2.id
        }&redirect_uri=${encodeURIComponent(
          settings.api.client.oauth2.link +
            settings.api.client.oauth2.callbackpath
        )}&response_type=code&scope=identify%20email${
          settings.api.client.bot.joinguild.enabled == true
            ? "%20guilds.join"
            : ""
        }${settings.api.client.j4r.enabled == true ? "%20guilds" : ""}${
          settings.api.client.oauth2.prompt == false
            ? "&prompt=none"
            : req.query.prompt
            ? req.query.prompt == "none"
              ? "&prompt=none"
              : ""
            : ""
        }`
      );
    });
  
    app.get("/logout", (req, res) => {
      let theme = indexjs.get(req);
      req.session.destroy(() => {
        return res.redirect(
          theme.settings.redirect.logout ? theme.settings.redirect.logout : "/"
        );
      });
    });
  
    app.get(settings.api.client.oauth2.callbackpath, async (req, res) => {
      if (!req.query.code) return res.redirect(`/login`);
      res.send(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${settings.name} - Authentication</title>
  <link rel="icon" href="${settings.icon}">
  <link rel="stylesheet" href="../assets/tailwind.css">
  <link rel="stylesheet" href="../assets/fixes.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--background-color);
      color: var(--foreground-color);
      min-height: 100vh;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  </style>
</head>
<body class="auth-container">
  <div class="auth-card">
    <div class="flex flex-col items-center justify-center space-y-6">
      <div class="h-16 w-16 rounded-full icon-bg flex items-center justify-center">
        <svg class="animate-spin h-8 w-8 icon-color" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
      </div>
      
      <div class="text-center">
        <h2 class="text-2xl font-bold mb-2">Authenticating...</h2>
        <p class="text-muted">Please wait while we log you in with Discord</p>
      </div>
      
      <div class="w-full">
        <div class="progress-bar">
          <div class="progress-value"></div>
        </div>
      </div>
    </div>
  </div>
  
  <script type="text/javascript" defer>
    history.pushState('/login', 'Logging in...', '/login')
    window.location.replace('/submitlogin?code=${encodeURIComponent(
      req.query.code.replace(/'/g, "")
    )}')
  </script>
</body>
</html>
`);
    });
  
    app.get(`/submitlogin`, async (req, res) => {
      let customredirect = req.session.redirect;
      delete req.session.redirect;
      if (!req.query.code) return res.send("Missing code.");
    
      let ip =
        settings.api.client.oauth2.ip["trust x-forwarded-for"] == true
          ? req.headers["x-forwarded-for"] || req.connection.remoteAddress
          : req.connection.remoteAddress;
      ip = (ip ? ip : "::1")
        .replace(/::1/g, "::ffff:127.0.0.1")
        .replace(/^.*:/, "");
      if (
        settings.antivpn.status &&
        ip !== "127.0.0.1" &&
        !settings.antivpn.whitelistedIPs.includes(ip)
      ) {
        const vpn = await vpnCheck(settings.antivpn.APIKey, db, ip, res);
        if (vpn) return;
      }
  
      let json = await fetch("https://discord.com/api/oauth2/token", {
        method: "post",
        body:
          "client_id=" +
          settings.api.client.oauth2.id +
          "&client_secret=" +
          settings.api.client.oauth2.secret +
          "&grant_type=authorization_code&code=" +
          encodeURIComponent(req.query.code) +
          "&redirect_uri=" +
          encodeURIComponent(
            settings.api.client.oauth2.link +
              settings.api.client.oauth2.callbackpath
          ),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (json.ok == true) {
        let codeinfo = JSON.parse(await json.text());
        let scopes = codeinfo.scope;
        let missingscopes = [];
  
        if (scopes.replace(/identify/g, "") == scopes)
          missingscopes.push("identify");
        if (scopes.replace(/email/g, "") == scopes) missingscopes.push("email");
        if (settings.api.client.bot.joinguild.enabled == true)
          if (scopes.replace(/guilds.join/g, "") == scopes)
            missingscopes.push("guilds.join");
        if (settings.api.client.j4r.enabled)
          if (scopes.replace(/guilds/g, "") == scopes)
            missingscopes.push("guilds");
        if (missingscopes.length !== 0)
          return res.send("Missing scopes: " + missingscopes.join(", "));
        let userjson = await fetch("https://discord.com/api/users/@me", {
          method: "get",
          headers: {
            Authorization: `Bearer ${codeinfo.access_token}`,
          },
        });
        let userinfo = JSON.parse(await userjson.text());
  
        if (settings.whitelist.status) {
          if (!settings.whitelist.users.includes(userinfo.id))
            return res.send("Service is under maintenance.");
        }
  
        let guildsjson = await fetch("https://discord.com/api/users/@me/guilds", {
          method: "get",
          headers: {
            Authorization: `Bearer ${codeinfo.access_token}`,
          },
        });
        let guildsinfo = await guildsjson.json();
        if (userinfo.verified == true) {
          if (settings.api.client.oauth2.ip.block.includes(ip))
            return res.send(
              "You could not sign in, because your IP has been blocked from signing in."
            );
  
          if (
            settings.api.client.oauth2.ip["duplicate check"] == true &&
            ip !== "127.0.0.1"
          ) {
            const ipuser = await db.get(`ipuser-${ip}`);
            if (ipuser && ipuser !== userinfo.id) {
              ejs.renderFile(
                `./themes/${settings.defaulttheme}/alerts/alt.ejs`,
                {
                  settings: settings,
                  db,
                  extra: { home: { name: "VPN Detected" } },
                },
                null,
                (err, str) => {
                  if (err)
                    return res.send(
                      'Another account on your IP has been detected, there can only be one account per IP. Think this is a mistake? <a href="https://discord.gg/halexnodes" target="_blank">Join our discord.</a>'
                    );
                  res.status(200);
                  res.send(str);
                }
              );
              return;
            } else if (!ipuser) {
              await db.set(`ipuser-${ip}`, userinfo.id);
            }
          }
  
          if (settings.api.client.j4r.enabled) {
            if (guildsinfo.message == "401: Unauthorized")
              return res.send(
                "Please allow us to know what servers you are in to let the J4R system work properly. <a href='/login'>Login again</a>"
              );
            let userj4r = (await db.get(`j4rs-${userinfo.id}`)) ?? [];
            await guildsinfo;
  
            let coins = (await db.get(`coins-${userinfo.id}`)) ?? 0;
  
            // Checking if the user has completed any new j4rs
            for (const guild of settings.api.client.j4r.ads) {
              if (
                guildsinfo.find((g) => g.id === guild.id) &&
                !userj4r.find((g) => g.id === guild.id)
              ) {
                userj4r.push({
                  id: guild.id,
                  coins: guild.coins,
                });
                coins += guild.coins;
              }
            }
  
            // Checking if the user has left any j4r servers
            for (const j4r of userj4r) {
              if (!guildsinfo.find((g) => g.id === j4r.id)) {
                userj4r = userj4r.filter((g) => g.id !== j4r.id);
                coins -= j4r.coins;
              }
            }
  
            await db.set(`j4rs-${userinfo.id}`, userj4r);
            await db.set(`coins-${userinfo.id}`, coins);
          }
  
          if (settings.api.client.bot.joinguild.enabled == true) {
            if (typeof settings.api.client.bot.joinguild.guildid == "string") {
              await fetch(
                `https://discord.com/api/guilds/${settings.api.client.bot.joinguild.guildid}/members/${userinfo.id}`,
                {
                  method: "put",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bot ${settings.api.client.bot.token}`,
                  },
                  body: JSON.stringify({
                    access_token: codeinfo.access_token,
                  }),
                }
              );
            } else if (
              typeof settings.api.client.bot.joinguild.guildid == "object"
            ) {
              if (Array.isArray(settings.api.client.bot.joinguild.guildid)) {
                for (let guild of settings.api.client.bot.joinguild.guildid) {
                  await fetch(
                    `https://discord.com/api/guilds/${guild}/members/${userinfo.id}`,
                    {
                      method: "put",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bot ${settings.api.client.bot.token}`,
                      },
                      body: JSON.stringify({
                        access_token: codeinfo.access_token,
                      }),
                    }
                  );
                }
              } else {
                return res.send(
                  "api.client.bot.joinguild.guildid is not an array nor a string."
                );
              }
            } else {
              return res.send(
                "api.client.bot.joinguild.guildid is not an array nor a string."
              );
            }
          }
  
          //give role on login
          if (settings.api.client.bot.giverole.enabled == true) {
            if (
              typeof settings.api.client.bot.giverole.guildid == "string" &&
              typeof settings.api.client.bot.giverole.roleid == "string"
            ) {
              await fetch(
                `https://discord.com/api/guilds/${settings.api.client.bot.giverole.guildid}/members/${userinfo.id}/roles/${settings.api.client.bot.giverole.roleid}`,
                {
                  method: "put",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bot ${settings.api.client.bot.token}`,
                  },
                }
              );
            } else {
              return res.send(
                "api.client.bot.giverole.guildid or roleid is not a string."
              );
            }
          }
  
          // Applying role packages
          if (settings.api.client.packages.rolePackages.roles) {
            const member = await fetch(
              `https://discord.com/api/v9/guilds/${settings.api.client.packages.rolePackages.roleServer}/members/${userinfo.id}`,
              {
                headers: {
                  Authorization: `Bot ${settings.api.client.bot.token}`,
                },
              }
            );
            const memberinfo = await member.json();
            if (memberinfo.user) {
              const currentpackage = await db.get(`package-${userinfo.id}`);
              if (
                Object.values(
                  settings.api.client.packages.rolePackages.roles
                ).includes(currentpackage)
              ) {
                for (const rolePackage of Object.keys(
                  settings.api.client.packages.rolePackages.roles
                )) {
                  if (
                    settings.api.client.packages.rolePackages.roles[
                      rolePackage
                    ] === currentpackage
                  ) {
                    if (!memberinfo.roles.includes(rolePackage)) {
                      await db.set(
                        `package-${userinfo.id}`,
                        settings.api.client.packages.default
                      );
                    }
                  }
                }
              }
              for (const role of memberinfo.roles) {
                if (settings.api.client.packages.rolePackages.roles[role]) {
                  await db.set(
                    `package-${userinfo.id}`,
                    settings.api.client.packages.rolePackages.roles[role]
                  );
                }
              }
            }
          }
  
          if (!(await db.get("users-" + userinfo.id))) {
            if (settings.api.client.allow.newusers == true) {
              let genpassword = null;
              if (settings.api.client.passwordgenerator.signup == true)
                genpassword = makeid(
                  settings.api.client.passwordgenerator["length"]
                );
              let accountjson = await fetch(
                settings.pterodactyl.domain + "/api/application/users",
                {
                  method: "post",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${settings.pterodactyl.key}`,
                  },
                  body: JSON.stringify({
                    username: userinfo.id,
                    email: userinfo.email,
                    first_name: userinfo.username,
                    last_name: "#" + userinfo.discriminator,
                    password: genpassword,
                  }),
                }
              );
              if ((await accountjson.status) == 201) {
                let accountinfo = JSON.parse(await accountjson.text());
                let userids = (await db.get("users"))
                  ? await db.get("users")
                  : [];
                userids.push(accountinfo.attributes.id);
                await db.set("users", userids);
                await db.set("users-" + userinfo.id, accountinfo.attributes.id);
                req.session.newaccount = true;
                req.session.password = genpassword;
              } else {
                let accountlistjson = await fetch(
                  settings.pterodactyl.domain +
                    "/api/application/users?include=servers&filter[email]=" +
                    encodeURIComponent(userinfo.email),
                  {
                    method: "get",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${settings.pterodactyl.key}`,
                    },
                  }
                );
                let accountlist = await accountlistjson.json();
                let user = accountlist.data.filter(
                  (acc) => acc.attributes.email == userinfo.email
                );
                if (user.length == 1) {
                  let userid = user[0].attributes.id;
                  let userids = (await db.get("users"))
                    ? await db.get("users")
                    : [];
                  if (userids.filter((id) => id == userid).length == 0) {
                    userids.push(userid);
                    await db.set("users", userids);
                    await db.set("users-" + userinfo.id, userid);
                    req.session.pterodactyl = user[0].attributes;
                  } else {
                    return res.send(
                      "We have detected an account with your Discord email on it but the user id has already been claimed on another Discord account."
                    );
                  }
                } else {
                  return res.send(
                    "An error has occured when attempting to create your account."
                  );
                }
              }
              log(
                "signup",
                `${userinfo.username} logged in to the dashboard for the first time!`
              );
            } else {
              return res.send("New users cannot signup currently.");
            }
          }
  
          let cacheaccount = await fetch(
            settings.pterodactyl.domain +
              "/api/application/users/" +
              (await db.get("users-" + userinfo.id)) +
              "?include=servers",
            {
              method: "get",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${settings.pterodactyl.key}`,
              },
            }
          );
          if ((await cacheaccount.statusText) == "Not Found")
            return res.send(
              "An error has occured while attempting to get your user information."
            );
          let cacheaccountinfo = JSON.parse(await cacheaccount.text());
          req.session.pterodactyl = cacheaccountinfo.attributes;
  
          req.session.userinfo = userinfo;
          let theme = indexjs.get(req);
          if (customredirect) return res.redirect(customredirect);
          return res.redirect(
            theme.settings.redirect.callback
              ? theme.settings.redirect.callback
              : "/"
          );
        }
        res.send(
          "Not verified a Discord account. Please verify the email on your Discord account."
        );
      } else {
        res.redirect(`/login`);
      }
    });
  };
  
  function makeid(length) {
    let result = "";
    let characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }