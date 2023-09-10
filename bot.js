//Main libraries
const colors = require("colors");
const arguments = process.argv.slice(2);
const mineflayer = require('mineflayer');

//Plugins
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

var owner = null;
var host = null;

//Status
let following = false;
let runningAway = false;
let mining = false;
let attack_status = false;

//Intervals
let miningInterval;
let defendInterval;
let eatInterval;

//Variables
let miningradius = 20;
let entityradius = 10;

//Stats
let health = null;
let food = null;
let armor = null;
let exp = null;

//Check if arguments are valid
try {
    owner = arguments[1];
    host = arguments[0];
} 
catch (err) {
    console.log('Error: ' + err);
    console.log('Usage: node index.js <host> <owner>');
    process.exit(1);
}

//Set colors
colors.setTheme({
    silly: 'rainbow',
    info: 'brightBlue',
    success: 'brightGreen',
    error: 'brightRed'
});

//Create bot
bot = mineflayer.createBot({
    host: process.argv[2],
    username: 'RageBot'
});

//Load plugins
bot.loadPlugin(pvp);
bot.loadPlugin(pathfinder);

//Functions
function getCurrentTime() {
    const date = new Date();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().padStart(4, '0');
    return `${hours}:${minutes}:${seconds} | ${day}:${month}:${year}`;
}

function updatePath() {
    if (following) {
      const player = bot.players[owner]?.entity;
  
      if (!player && !runningAway) {
        bot.chat("I can't see you.");
        console.log(`[${getCurrentTime()}] Error: ${owner} is not in the server.`.error);
        return;
      }
  
      bot.pathfinder.setMovements(new Movements(bot, player));
      bot.pathfinder.setGoal(new goals.GoalNear(player.position.x, player.position.y, player.position.z, 1));
    }
}

function findAndMineBlock(blockType, radius) {
    const targetBlock = bot.findBlock({
        matching: (block) => block.name === blockType,
        maxDistance: radius,
    });

    if (targetBlock) {
        console.log(`[${getCurrentTime()}] Found ${blockType} at (${targetBlock.position.x}, ${targetBlock.position.y}, ${targetBlock.position.z}).`.success);
        mining = true;

        bot.pathfinder.setMovements(new Movements(bot, targetBlock));
        bot.pathfinder.setGoal(new goals.GoalBlock(targetBlock.position.x, targetBlock.position.y, targetBlock.position.z));

        // Listen for the 'stoppedDigging' event to handle the mining completion
        bot.once('stoppedDigging', () => {
        console.log(`[${getCurrentTime()}] Mined ${blockType} at (${targetBlock.position.x}, ${targetBlock.position.y}, ${targetBlock.position.z}).`.success);
        mining = false;
        // Call findAndMineBlock again to continue mining if necessary
        findAndMineBlock(blockType, radius);
        });

        // Handle if mining is manually stopped
        bot.once('goal_updated', () => {
        if (!mining) return;
        mining = false;
        });
    } else {
        bot.chat(`${blockType} not found boss.`);
        console.log(`[${getCurrentTime()}] No more ${blockType} found in the area.`.error);
    }
}

function get_nearest_entity() {
    const filter = e => e.type !== 'player' && e.position.distanceTo(bot.entity.position) < entityradius &&
        e.mobType !== 'Armor Stand' && e.mobType !== 'Item Frame' && e.mobType !== 'Painting' && e.mobType !== 'Item' && e.mobType !== 'XPOrb'
        && e.mobType !== 'LeashKnot' && e.mobType !== 'Minecart' && e.mobType !== 'Boat' && e.mobType !== 'EnderCrystal' && e.mobType !== 'FallingBlock'
        && e.mobType !== 'Fireball' && e.mobType !== 'SmallFireball' && e.mobType !== 'WitherSkull' && e.mobType !== 'PrimedTnt' && e.mobType !== 'ThrownExpBottle'
        && e.mobType !== 'WitherSkull' && e.mobType !== 'ThrownPotion' && e.mobType !== 'ThrownEnderpearl' && e.mobType !== 'EyeOfEnderSignal' && e.mobType !== 'ThrownSnowball'
        && e.mobType !== 'ThrownEgg' && e.mobType !== 'FallingSand' && e.mobType !== 'FireworksRocketEntity' && e.mobType !== 'SpectralArrow' && e.mobType !== 'ShulkerBullet'
        && e.mobType !== 'DragonFireball' && e.mobType !== 'LlamaSpit' && e.mobType !== 'EvokerFangs' && e.mobType !== 'AreaEffectCloud' && e.mobType !== 'MinecartHopper'
        && e.mobType !== 'Arrow';  
    const entity = bot.nearestEntity(filter);
    return entity;
}

function get_best_food_item() {
    const foodDictionary = {
        'apple': true,
        'bread': true,
        'cooked_beef': true,
        'cooked_chicken': true,
        'cooked_mutton': true,
        'cooked_porkchop': true,
        'cooked_rabbit': true,
        'cooked_salmon': true,
        'cookie': true,
        'melon_slice': true,
        'beetroot_soup': true,
        'pumpkin_pie': true,
        'carrot': true,
    };

    for (const item of bot.inventory.items()) {
        const itemName = item.name
        if (foodDictionary[itemName]) {
            return item;
        }
    }
    return null;
}
    


//Triggers
bot.on('spawn', function () { //When the bot spawns
    console.log('');
    console.log('========= Data ========='.silly);
    console.log(`Host: ${host}`.info);
    console.log(`Username: ${bot.username}`.info);
    console.log(`Owner: ${owner}`.info);
    console.log('========================'.silly);
    console.log('');
    console.log(`[${getCurrentTime()}] Successfully connected to the server.`.success);
});

bot.on('kicked', (reason, loggedIn) => console.log(`[${getCurrentTime()}] Kicked for ${reason}`.error));

bot.on('error', err => console.log(`[${getCurrentTime()}] Error: ${err}`.error));

bot.on('death', () => {
    pos = bot.entity.position;
    console.log(`[${getCurrentTime()}] I died, my coords are ${pos}`.error);
    bot.chat(`I died in ${pos} boss.`);
});

bot.on('chat', (username, message) => {

    if (username === bot.username) return;

    if (username === owner && message === '!follow') { // !follow
        const player = bot.players[owner]?.entity;

        if (!player) {
        bot.chat("I can't see you.");
        console.log(`[${getCurrentTime()}] Error: ${owner} is not in the server.`.error);
        return;
        }

        bot.pathfinder.setMovements(new Movements(bot, player));
        bot.pathfinder.setGoal(new goals.GoalNear(player.position.x, player.position.y, player.position.z, 1));
        bot.chat(`ok, Im going to follow you boss.`);
        console.log(`[${getCurrentTime()}] Following ${owner}`.success);
        following = true;

        setInterval(updatePath, 300);
    }

    else if (username === owner && message === '!stop' && following) { // !stop
        bot.pathfinder.setGoal(null);
        bot.chat(`ok, Im not gonna follow you anymore boss.`);
        console.log(`[${getCurrentTime()}] Stopped following ${owner}`.success);
        following = false;
    }
    
    else if (username === owner && message.startsWith('!runcmd')) { // !runcmd <command>
        command = message.substring(8);
        bot.chat(command);
        bot.chat(`ok, executing command "${command}" boss.`);
        console.log(`[${getCurrentTime()}] Executed command: ${command}`.success);
    }

    else if (username === owner && message.startsWith('!dropitem')){ // !dropitem <itemname>
        itemname = message.substring(10);
        const itemToDrop = bot.inventory.items().find(item => item.name === itemname);
        if (itemToDrop) {
            bot.tossStack(itemToDrop);
            bot.chat(`ok, throwing item "${itemname}" boss.`);
            console.log(`[${getCurrentTime()}] Dropped item: ${itemname}`.success);
        } else {
            bot.chat(`I dont have that item "${itemname}" boss.`);
            console.log(`[${getCurrentTime()}] Error: I don't have the item "${itemname}"`.error);
        }
    }

    else if (username === owner && message.startsWith('!itemlist')) { // !itemlist
        bot.chat(`ok, look at the console boss.`);
        console.log(`[${getCurrentTime()}] Item list:`.success);
        bot.inventory.items().forEach(item => {
            console.log(`\t\t\t- ${item.name} x${item.count}`.info);
        }
        );
    }

    else if (username === owner && message.startsWith('!minefor')){ // !minefor <blockname>
        blockname = message.substring(9);
        bot.chat(`ok, going to mine ${blockname} boss.`);
        if (!miningInterval) {
            miningInterval = setInterval(() => {
                findAndMineBlock(blockname, miningradius);
            }, 5000);
        }
    }

    else if (username === owner && message.startsWith('!setminingradius')){ // !setradius <radius>
        miningradius = message.substring(17);
        console.log(`[${getCurrentTime()}] Radius set to ${miningradius}`.success);
        bot.chat(`ok, the search raduis is ${miningradius} blocks boss.`);
    }

    else if (username === owner && message === '!stopmining') {
        bot.chat(`ok, I stopped mining boss.`);
        bot.pathfinder.setGoal(null);
        mining = false;
        if (bot.isDigging) {
            bot.once('stoppedDigging', () => {
              console.log(`[${getCurrentTime()}] Stopped mining.`.success);
            });
            bot.stopDigging();
          } else {
            console.log(`[${getCurrentTime()}] Bot is not currently digging.`.info);
          }
          if (miningInterval) {
            clearInterval(miningInterval);
            miningInterval = null;
        }
    }

    else if (username === owner && message === '!defend') { // !defend
        const player = bot.players[owner]?.entity;
        bot.chat(`ok, defending myself boss.`);

        function defendfunc(player) {

            const sword = bot.inventory.items().find(item => item.name.includes('sword'));
            if (sword) {
                bot.equip(sword, 'hand', (err) => {
                    if (err) {
                        bot.chat(`I was not able to equip the sword boss.`);
                        console.log(`[${getCurrentTime()}] Error: I couldn't equip the sword.`.error);
                    } else {
                        bot.chat(`ok, sword equipped boss.`);
                        console.log(`[${getCurrentTime()}] Equipped sword.`.success);
                    }
                }
            );}

            let targetEntity = get_nearest_entity();
            if (!player) {
                bot.chat("I can't see you.");
                console.log(`[${getCurrentTime()}] Error: ${owner} is not in the server.`.error);
                return;
            }
    
            if (targetEntity && targetEntity.name != player.name){
                console.log(`[${getCurrentTime()}] Nearest entity is ${targetEntity.name}`.info);
                console.log(`[${getCurrentTime()}] Position: ${targetEntity.position}`.info);
                console.log(`[${getCurrentTime()}] Distance: ${bot.entity.position.distanceTo(targetEntity.position)}`.info);
                bot.pvp.attack(targetEntity);
                attack_status = true;
            } 
            else if (targetEntity && targetEntity.name == player.name){
                bot.chat(`no entities found boss.`);
                console.log(`[${getCurrentTime()}] Error: No entities nearby.`.error);
            }

            else if (!targetEntity){
                bot.chat(`no entities found boss.`);
                console.log(`[${getCurrentTime()}] Error: No entities nearby.`.error);
            }
        }

        if (!defendInterval) {
            defendInterval = setInterval(() => {
                defendfunc(player);
            }, 2000);
        }
    }

    else if (username === owner && message === '!stopdefend'){ // !stopdefend
        bot.chat(`ok, stopped defending myself boss.`);
        bot.pvp.stop();
        console.log(`[${getCurrentTime()}] Stopped defending.`.success);
        attack_status = false;
        if (defendInterval) {
            clearInterval(defendInterval);
            defendInterval = null;
        }
    }

    else if (username === owner && message.startsWith('!setdefendradius')){
        entityradius = message.substring(17);
        console.log(`[${getCurrentTime()}] Entity radius set to ${entityradius}`.success);
        bot.chat(`ok, the entity search radius is ${entityradius} blocks boss.`);
    }

    else if (username === owner && message === '!status' ){ // !status
        health = bot.health;
        food = bot.food;
        armor = bot.inventory.slots[5];
        exp = bot.experience.level;
        if (armor) {
            armor = armor.name;
        }
        else {
            armor = "none";
        }
        bot.chat(`ok, look at console boss.`);
        console.log(`[${getCurrentTime()}] Status:`.success);
        console.log(`\t\t\t- Health: ${health}`.info);
        console.log(`\t\t\t- Food: ${food}`.info);
        console.log(`\t\t\t- Armor: ${armor}`.info);
        console.log(`\t\t\t- Exp: ${exp}`.info);
    }

    else if (username === owner && message === '!equiparmor') { // !equiparmor
        bot.chat(`ok, putting on armor boss.`);
        const helmet = bot.inventory.items().find(item => item.name.includes('helmet'));
        const chestplate = bot.inventory.items().find(item => item.name.includes('chestplate'));
        const leggings = bot.inventory.items().find(item => item.name.includes('leggings'));
        const boots = bot.inventory.items().find(item => item.name.includes('boots'));
        if (helmet) {
            bot.equip(helmet, 'head', (err) => {
                if (err) {
                    bot.chat(`unable to equip armor boss.`);
                    console.log(`[${getCurrentTime()}] Error: I couldn't equip the helmet.`.error);
                } else {
                    bot.chat(`ok, I already have that armor boss.`);
                    console.log(`[${getCurrentTime()}] Equipped helmet.`.success);
                }
            }
        );}
        if (chestplate) {
            bot.equip(chestplate, 'torso', (err) => {
                if (err) {
                    bot.chat(`unable to equip armor boss.`);
                    console.log(`[${getCurrentTime()}] Error: I couldn't equip the chestplate.`.error);
                } else {
                    bot.chat(`ok, I already have that armor boss.`);
                    console.log(`[${getCurrentTime()}] Equipped chestplate.`.success);
                }
            }
        );}
        if (leggings) {
            bot.equip(leggings, 'legs', (err) => {
                if (err) {
                    bot.chat(`unable to equip armor boss.`);
                    console.log(`[${getCurrentTime()}] Error: I couldn't equip the leggings.`.error);
                } else {
                    bot.chat(`ok, I already have that armor boss.`);
                    console.log(`[${getCurrentTime()}] Equipped leggings.`.success);
                }
            }
        );}
        if (boots) {
            bot.equip(boots, 'feet', (err) => {
                if (err) {
                    bot.chat(`unable to equip armor boss.`);
                    console.log(`[${getCurrentTime()}] Error: I couldn't equip the boots.`.error);
                } else {
                    bot.chat(`ok, I already have that armor boss.`);
                    console.log(`[${getCurrentTime()}] Equipped boots.`.success);
                }
            });
        }
    }

    else if (username === owner && message === '!eat') { // !eat
        const foodItem = get_best_food_item();
        function eat() {
            if (bot.food === 20) {
                bot.chat(`Im full boss.`);
                if (eatInterval) {
                    clearInterval(eatInterval);
                    eatInterval = null;
                }
                console.log(`[${getCurrentTime()}] Error: I'm already full.`.error);
                return;
            }

            if (foodItem) {
                bot.equip(foodItem);
                bot.chat(`ok, eating boss.`);
                console.log(`[${getCurrentTime()}] Eating.`.success);
                bot.consume(foodItem, (err) => {
                    if (err) {
                        bot.chat(`unable to eat boss.`);
                        console.log(`[${getCurrentTime()}] Error: I couldn't eat.`.error);
                    } else {
                        bot.chat(`ok, finished eating.`);
                    }
                });
            }
            else {
                bot.chat(`I have no food boss.`);
                console.log(`[${getCurrentTime()}] Error: I don't have food.`.error);
            }
        }

        if (!bot.isEating) {
            if (!eatInterval) {
                eatInterval = setInterval(() => {
                    eat();
                }, 3000);
            }
        }
    }

    else if (username === owner && message === '!help') { // !help
        const helpMessage = `
        Available Commands:
        !follow - Make the bot follow you.
        !stop - Stop the bot from following you.
        !runcmd <command> - Execute a command.
        !dropitem <itemname> - Drop an item from the bot's inventory.
        !itemlist - List all items in the bot's inventory.
        !minefor <blockname> - Make the bot mine a specific block.
        !setminingradius <radius> - Set the mining radius.
        !stopmining - Stop the bot from mining.
        !defend - Make the bot defend itself.
        !stopdefend - Stop the bot from defending.
        !setdefendradius <radius> - Set the entity search radius for defense.
        !status - Display the bot's status (health, food, armor, experience).
        !equiparmor - Equip available armor items.
        !eat - Make the bot eat the best available food.
        !stopeat - Stop the bot from eating.
        !help - Display this help message.
        `;
    
        bot.chat('ok, look at the console boss.')
        console.log(helpMessage.info);
    }
});
